/**
 * Quota Service - Track and manage usage limits
 * With in-memory L1 cache for fast quota lookups
 */

import { supabaseAdmin } from '../supabase/client.js';
import logger from '../logging/logger.js';

export interface QuotaInfo {
  userId: string;
  tier: 'free' | 'pro';
  dailyLimit: number;
  dailyUsed: number;
  remaining: number;
  resetAt: Date;
}

// Quota limits from PRD
const DAILY_LIMITS = {
  free: 5,    // Free users: 5 paraphrases/day
  pro: -1,    // Pro users: unlimited (-1 = unlimited)
} as const;

// ─── In-memory tier + usage cache (L1) ─────────────────────────────
// Dramatically reduces Supabase round-trips during bursts of requests
// from the same user (e.g. multiple paraphrases in a session).

interface TierCacheEntry { tier: 'free' | 'pro'; expiresAt: number }
interface UsageCacheEntry { count: number; expiresAt: number }

const tierCache = new Map<string, TierCacheEntry>();
const usageCache = new Map<string, UsageCacheEntry>();

const TIER_CACHE_TTL  = 5 * 60 * 1000; // 5 minutes (tier rarely changes)
const USAGE_CACHE_TTL = 30 * 1000;      // 30 seconds (usage changes more often)
const CACHE_MAX_SIZE  = 5000;

function getFromCache<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry;
}

function setInCache<T>(cache: Map<string, T>, key: string, entry: T) {
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, entry);
}

/** Invalidate usage cache for a user (call after logging new usage) */
export function invalidateUsageCache(userId: string) {
  usageCache.delete(userId);
}

/**
 * Check if user has premium access via Supabase function
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('has_premium_access', { p_user_id: userId });

    if (error) {
      logger.error({
        event: 'quota_premium_check_error',
        userId,
        error: error.message,
      });
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error({
      event: 'quota_premium_check_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get user subscription tier (with L1 cache)
 */
export async function getUserTier(userId: string): Promise<'free' | 'pro'> {
  // L1 cache check
  const cached = getFromCache(tierCache, userId);
  if (cached) return cached.tier;

  let tier: 'free' | 'pro' = 'free';
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status, plan, expires_at')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      const isActive = data.status === 'active' || data.status === 'trial';
      const isNotExpired = !data.expires_at || new Date(data.expires_at) >= new Date();
      const isProPlan = data.plan === 'pro_monthly' || data.plan === 'pro_yearly';

      if (isActive && isNotExpired && isProPlan) {
        tier = 'pro';
      }
    }
  } catch (error) {
    logger.error({
      event: 'quota_tier_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  setInCache(tierCache, userId, { tier, expiresAt: Date.now() + TIER_CACHE_TTL });
  return tier;
}

/**
 * Get current day start (UTC)
 */
function getDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Get current usage count for today via Supabase function (with L1 cache)
 */
export async function getDailyUsage(userId: string): Promise<number> {
  // L1 cache check
  const cached = getFromCache(usageCache, userId);
  if (cached) return cached.count;

  let count = 0;
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_daily_usage_count', { p_user_id: userId });

    if (error) {
      logger.error({
        event: 'quota_usage_error',
        userId,
        error: error.message,
      });
    } else {
      count = data || 0;
    }
  } catch (error) {
    logger.error({
      event: 'quota_usage_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  setInCache(usageCache, userId, { count, expiresAt: Date.now() + USAGE_CACHE_TTL });
  return count;
}

/**
 * Get full quota information for user
 */
export async function getQuotaInfo(userId: string): Promise<QuotaInfo> {
  const [tier, dailyUsed] = await Promise.all([
    getUserTier(userId),
    getDailyUsage(userId),
  ]);

  const dailyLimit = DAILY_LIMITS[tier];
  const remaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - dailyUsed);

  // Calculate next reset time (next day start)
  const dayStart = getDayStart();
  const resetAt = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return {
    userId,
    tier,
    dailyLimit,
    dailyUsed,
    remaining,
    resetAt,
  };
}

/**
 * Check if user has remaining quota
 * Returns true if user has quota or is pro (unlimited)
 */
export async function hasQuota(userId: string): Promise<boolean> {
  const quotaInfo = await getQuotaInfo(userId);
  return quotaInfo.remaining !== 0; // -1 = unlimited, 0 = exhausted, >0 = has quota
}

/**
 * Log usage (call after successful paraphrase)
 * Automatically invalidates the L1 usage cache so the next quota check is fresh.
 */
export async function logUsage(
  userId: string,
  params: {
    requestId: string;
    action: 'paraphrase' | 'check' | 'spellcheck';
    mode?: string;
    inputLength: number;
    outputLength?: number;
    inputHash?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    model?: string;
    latencyMs?: number;
    cached?: boolean;
    success?: boolean;
    errorCode?: string;
  }
): Promise<void> {
  // Invalidate usage cache immediately so next hasQuota() call gets fresh data
  invalidateUsageCache(userId);

  try {
    const { error } = await supabaseAdmin.from('usage_log').insert({
      user_id: userId,
      action: params.action,
      mode: params.mode,
      input_length: params.inputLength,
      output_length: params.outputLength,
      input_hash: params.inputHash,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      total_tokens: params.totalTokens,
      model: params.model,
      latency_ms: params.latencyMs,
      cached: params.cached ?? false,
      success: params.success ?? true,
      error_code: params.errorCode,
    });

    if (error) {
      logger.error({
        event: 'quota_log_error',
        userId,
        error: error.message,
      });
    }
  } catch (error) {
    logger.error({
      event: 'quota_log_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default {
  getUserTier,
  getDailyUsage,
  getQuotaInfo,
  hasQuota,
  hasPremiumAccess,
  logUsage,
  invalidateUsageCache,
};

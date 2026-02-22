/**
 * Paraphrase Cache Service
 * Two-layer cache: L1 in-memory (instant) → L2 Supabase (persistent)
 * Reduces LLM calls and eliminates Supabase round-trips for repeated queries
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from '../supabase/client.js';
import logger from '../logging/logger.js';

export interface CacheEntry {
  inputHash: string;
  mode: string;
  outputText: string;
  model: string | null;
  tokensUsed: number | null;
  hitCount: number;
}

// Cache TTL: 24 hours (L2 Supabase), 10 minutes (L1 memory)
const CACHE_TTL_HOURS = 24;
const L1_TTL_MS = 10 * 60 * 1000;
const L1_MAX_SIZE = 500;

// ─── L1 In-memory cache ─────────────────────────────────────────────
interface L1Entry { entry: CacheEntry; expiresAt: number }
const l1Cache = new Map<string, L1Entry>();

function l1Get(key: string): CacheEntry | null {
  const item = l1Cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) { l1Cache.delete(key); return null; }
  return item.entry;
}

function l1Set(key: string, entry: CacheEntry) {
  if (l1Cache.size >= L1_MAX_SIZE) {
    const firstKey = l1Cache.keys().next().value;
    if (firstKey) l1Cache.delete(firstKey);
  }
  l1Cache.set(key, { entry, expiresAt: Date.now() + L1_TTL_MS });
}

/**
 * Generate hash for cache lookup
 */
export function generateCacheKey(text: string, mode: string): string {
  const normalized = text.trim().toLowerCase();
  return createHash('sha256')
    .update(`${mode}:${normalized}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Get cached paraphrase result (L1 memory → L2 Supabase)
 */
export async function getCachedResult(
  text: string,
  mode: string
): Promise<CacheEntry | null> {
  const inputHash = generateCacheKey(text, mode);

  // ── L1: instant in-memory lookup ──
  const l1Hit = l1Get(inputHash);
  if (l1Hit) {
    logger.debug({ event: 'cache_l1_hit', inputHash, mode });
    return l1Hit;
  }

  // ── L2: Supabase lookup ──
  try {
    const { data, error } = await supabaseAdmin
      .from('paraphrase_cache')
      .select('*')
      .eq('input_hash', inputHash)
      .eq('mode', mode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Increment hit count asynchronously (don't wait)
    incrementHitCount(data.id).catch(() => {});

    logger.info({
      event: 'cache_hit',
      inputHash,
      mode,
      hitCount: data.hit_count + 1,
    });

    const entry: CacheEntry = {
      inputHash: data.input_hash,
      mode: data.mode,
      outputText: data.output_text,
      model: data.model,
      tokensUsed: data.tokens_used,
      hitCount: data.hit_count,
    };

    // Promote to L1 for instant subsequent lookups
    l1Set(inputHash, entry);

    return entry;
  } catch (error) {
    logger.warn({
      event: 'cache_lookup_error',
      inputHash,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Store paraphrase result in cache (L1 + L2)
 */
export async function setCachedResult(
  text: string,
  mode: string,
  outputText: string,
  model: string | null,
  tokensUsed: number | null
): Promise<void> {
  const inputHash = generateCacheKey(text, mode);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  // ── L1: store immediately (no await) ──
  l1Set(inputHash, { inputHash, mode, outputText, model, tokensUsed, hitCount: 0 });

  // ── L2: persist to Supabase ──
  try {
    const { error } = await supabaseAdmin
      .from('paraphrase_cache')
      .upsert(
        {
          input_hash: inputHash,
          mode,
          output_text: outputText,
          model,
          tokens_used: tokensUsed,
          hit_count: 0,
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'input_hash,mode',
        }
      );

    if (error) {
      logger.warn({
        event: 'cache_write_error',
        inputHash,
        error: error.message,
      });
      return;
    }

    logger.debug({
      event: 'cache_set',
      inputHash,
      mode,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.warn({
      event: 'cache_write_error',
      inputHash,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Increment hit count for cache entry
 */
async function incrementHitCount(cacheId: string): Promise<void> {
  try {
    // Get current hit count and increment
    const { data } = await supabaseAdmin
      .from('paraphrase_cache')
      .select('hit_count')
      .eq('id', cacheId)
      .single();

    if (data) {
      await supabaseAdmin
        .from('paraphrase_cache')
        .update({ hit_count: data.hit_count + 1 })
        .eq('id', cacheId);
    }
  } catch (error) {
    // Ignore hit count errors - non-critical
  }
}

/**
 * Clean up expired cache entries
 * Should be run periodically (e.g., via cron)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('paraphrase_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      logger.error({
        event: 'cache_cleanup_error',
        error: error.message,
      });
      return 0;
    }

    const deletedCount = data?.length || 0;
    
    if (deletedCount > 0) {
      logger.info({
        event: 'cache_cleanup_complete',
        deletedCount,
      });
    }

    return deletedCount;
  } catch (error) {
    logger.error({
      event: 'cache_cleanup_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  avgHitCount: number;
  oldestEntry: Date | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('paraphrase_cache')
      .select('hit_count, created_at')
      .gt('expires_at', new Date().toISOString());

    if (error || !data) {
      return {
        totalEntries: 0,
        totalHits: 0,
        avgHitCount: 0,
        oldestEntry: null,
      };
    }

    const totalEntries = data.length;
    const totalHits = data.reduce((sum, row) => sum + row.hit_count, 0);
    const oldestEntry = data.length > 0
      ? new Date(Math.min(...data.map((row) => new Date(row.created_at).getTime())))
      : null;

    return {
      totalEntries,
      totalHits,
      avgHitCount: totalEntries > 0 ? totalHits / totalEntries : 0,
      oldestEntry,
    };
  } catch (error) {
    logger.error({
      event: 'cache_stats_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      totalEntries: 0,
      totalHits: 0,
      avgHitCount: 0,
      oldestEntry: null,
    };
  }
}

export default {
  generateCacheKey,
  getCachedResult,
  setCachedResult,
  cleanupExpiredCache,
  getCacheStats,
};

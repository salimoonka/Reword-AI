/**
 * Token Accounting Service
 * Tracks LLM token usage for billing and analytics
 */

import { supabaseAdmin } from '../supabase/client.js';
import logger from '../logging/logger.js';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UserTokenStats {
  userId: string;
  totalTokensUsed: number;
  paraphraseCount: number;
  checkCount: number;
  period: 'day' | 'month' | 'all';
  startDate: Date;
  endDate: Date;
}

/**
 * Get user's token usage for a specific period
 */
export async function getTokenUsage(
  userId: string,
  period: 'day' | 'month' | 'all' = 'month'
): Promise<UserTokenStats> {
  let startDate: Date;
  const endDate = new Date();

  switch (period) {
    case 'day':
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date();
      startDate.setDate(1);
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case 'all':
      startDate = new Date(0); // Unix epoch
      break;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('usage_log')
      .select('action, total_tokens')
      .eq('user_id', userId)
      .eq('success', true)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      logger.error({
        event: 'token_usage_query_error',
        userId,
        error: error.message,
      });
      return {
        userId,
        totalTokensUsed: 0,
        paraphraseCount: 0,
        checkCount: 0,
        period,
        startDate,
        endDate,
      };
    }

    const stats = (data || []).reduce(
      (acc, row) => {
        acc.totalTokensUsed += row.total_tokens || 0;
        if (row.action === 'paraphrase') {
          acc.paraphraseCount++;
        } else if (row.action === 'check') {
          acc.checkCount++;
        }
        return acc;
      },
      { totalTokensUsed: 0, paraphraseCount: 0, checkCount: 0 }
    );

    return {
      userId,
      ...stats,
      period,
      startDate,
      endDate,
    };
  } catch (error) {
    logger.error({
      event: 'token_usage_query_error',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      userId,
      totalTokensUsed: 0,
      paraphraseCount: 0,
      checkCount: 0,
      period,
      startDate,
      endDate,
    };
  }
}

/**
 * Get estimated cost for user's token usage
 * Based on OpenRouter pricing for DeepSeek
 */
export function estimateCost(tokens: number): { usd: number; rub: number } {
  // DeepSeek pricing (approximate): $0.14 per 1M input tokens, $0.28 per 1M output tokens
  // We'll use average: $0.21 per 1M tokens
  const costPerMillionTokens = 0.21;
  const usdCost = (tokens / 1_000_000) * costPerMillionTokens;
  
  // Convert to RUB (approximate rate)
  const usdToRub = 90;
  const rubCost = usdCost * usdToRub;

  return {
    usd: Math.round(usdCost * 10000) / 10000, // 4 decimal places
    rub: Math.round(rubCost * 100) / 100, // 2 decimal places
  };
}

/**
 * Get global platform token usage stats (admin only)
 */
export async function getGlobalTokenStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalTokens: number;
  totalRequests: number;
  uniqueUsers: number;
  estimatedCost: { usd: number; rub: number };
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('usage_log')
      .select('user_id, total_tokens')
      .eq('success', true)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      logger.error({
        event: 'global_token_stats_error',
        error: error.message,
      });
      return {
        totalTokens: 0,
        totalRequests: 0,
        uniqueUsers: 0,
        estimatedCost: { usd: 0, rub: 0 },
      };
    }

    const rows = data || [];
    const totalTokens = rows.reduce((sum, row) => sum + (row.total_tokens || 0), 0);
    const uniqueUsers = new Set(rows.map((row) => row.user_id)).size;

    return {
      totalTokens,
      totalRequests: rows.length,
      uniqueUsers,
      estimatedCost: estimateCost(totalTokens),
    };
  } catch (error) {
    logger.error({
      event: 'global_token_stats_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      totalTokens: 0,
      totalRequests: 0,
      uniqueUsers: 0,
      estimatedCost: { usd: 0, rub: 0 },
    };
  }
}

export default {
  getTokenUsage,
  estimateCost,
  getGlobalTokenStats,
};

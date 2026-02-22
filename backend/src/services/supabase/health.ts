/**
 * Supabase Health Check Module
 * Tests database connectivity and returns status
 */

import { supabaseAdmin } from './client.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    latencyMs: number;
    error?: string;
  };
  tables: {
    profiles: boolean;
    subscriptions: boolean;
    usage_log: boolean;
    paraphrase_cache: boolean;
  };
  timestamp: string;
}

/**
 * Perform a comprehensive health check on Supabase connection
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    database: {
      connected: false,
      latencyMs: 0,
    },
    tables: {
      profiles: false,
      subscriptions: false,
      usage_log: false,
      paraphrase_cache: false,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Test basic connectivity by querying profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);
    result.tables.profiles = !profilesError;

    // Test subscriptions table
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .limit(1);
    result.tables.subscriptions = !subscriptionsError;

    // Test usage_log table
    const { error: usageError } = await supabaseAdmin
      .from('usage_log')
      .select('id')
      .limit(1);
    result.tables.usage_log = !usageError;

    // Test paraphrase_cache table
    const { error: cacheError } = await supabaseAdmin
      .from('paraphrase_cache')
      .select('id')
      .limit(1);
    result.tables.paraphrase_cache = !cacheError;

    result.database.latencyMs = Date.now() - startTime;
    result.database.connected = true;

    // Determine overall status
    const allTablesOk = Object.values(result.tables).every((v) => v);
    if (!allTablesOk) {
      result.status = 'degraded';
    }
  } catch (error) {
    result.database.latencyMs = Date.now() - startTime;
    result.database.connected = false;
    result.database.error = error instanceof Error ? error.message : 'Unknown error';
    result.status = 'unhealthy';
  }

  return result;
}

/**
 * Simple ping check - just tests if database is reachable
 */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Use a simple RPC call or query to test connectivity
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(0);

    return {
      ok: !error,
      latencyMs: Date.now() - startTime,
      error: error?.message,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default { checkSupabaseHealth, pingDatabase };

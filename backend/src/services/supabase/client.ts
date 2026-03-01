/**
 * Supabase Client Setup
 * Service-role client for backend operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../../config.js';

// Check if Supabase is properly configured
const isSupabaseConfigured = 
  config.supabase.url && 
  config.supabase.serviceKey && 
  !config.supabase.serviceKey.includes('your-');

if (!isSupabaseConfigured && config.nodeEnv === 'production') {
  throw new Error(
    'FATAL: Supabase is not properly configured (SUPABASE_URL / SUPABASE_SERVICE_KEY). ' +
    'Cannot start in production without valid Supabase credentials.'
  );
}

// Service role client - has full access, bypass RLS
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey || config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create client with user JWT for RLS
export function createUserClient(jwt: string): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Export configuration status
export { isSupabaseConfigured };

export default supabaseAdmin;

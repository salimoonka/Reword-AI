/**
 * Configuration Module
 * Loads environment variables and provides typed config object
 */

import 'dotenv/config';

interface Config {
  nodeEnv: string;
  port: number;
  host: string;

  // Supabase
  supabase: {
    url: string;
    serviceKey: string;
    anonKey: string;
  };

  // OpenRouter
  openRouter: {
    apiKey: string;
    baseUrl: string;
  };

  // Redis
  redis: {
    url: string | undefined;
    enabled: boolean;
  };

  // Rate Limiting
  rateLimit: {
    max: number;
    windowMs: number;
  };

  // Quota
  freeParaphrasesLimit: number;

  // App Store / Google Play
  appleSharedSecret: string;
  googleServiceAccountKey: string;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// For development, allow missing service key with warning
function getEnvOrWarn(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value || value.includes('your-')) {
    console.warn(`⚠️  Warning: ${key} not properly set. Some features may not work.`);
    return defaultValue;
  }
  return value;
}

export const config: Config = {
  nodeEnv: getEnvOrDefault('NODE_ENV', 'development'),
  port: parseInt(getEnvOrDefault('PORT', '3000'), 10),
  host: getEnvOrDefault('HOST', '0.0.0.0'),

  supabase: {
    url: getEnvOrDefault('SUPABASE_URL', 'https://wlmfsohrvcxatgnwezfy.supabase.co'),
    serviceKey: getEnvOrWarn('SUPABASE_SERVICE_KEY', ''),
    anonKey: getEnvOrDefault('SUPABASE_ANON_KEY', ''),
  },

  openRouter: {
    apiKey: getEnvOrDefault('OPENROUTER_API_KEY', ''),
    baseUrl: getEnvOrDefault('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
  },

  redis: {
    url: process.env.REDIS_URL,
    enabled: !!process.env.REDIS_URL,
  },

  rateLimit: {
    max: parseInt(getEnvOrDefault('RATE_LIMIT_MAX', '100'), 10),
    windowMs: parseInt(getEnvOrDefault('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  freeParaphrasesLimit: parseInt(getEnvOrDefault('FREE_PARAPHRASES_LIMIT', '30'), 10),

  appleSharedSecret: getEnvOrDefault('APPLE_SHARED_SECRET', ''),
  googleServiceAccountKey: getEnvOrDefault('GOOGLE_SERVICE_ACCOUNT_KEY', ''),
};

export default config;

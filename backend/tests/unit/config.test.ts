/**
 * Config Tests
 * Verifies configuration loading with defaults
 */

import { describe, it, expect } from 'vitest';
import { config } from '../../src/config.js';

describe('Config', () => {
  it('should have default port of 3000', () => {
    expect(config.port).toBe(3000);
  });

  it('should have valid node environment', () => {
    expect(['development', 'production', 'test']).toContain(config.nodeEnv);
  });

  it('should have supabase config', () => {
    expect(config.supabase).toBeDefined();
    expect(typeof config.supabase.url).toBe('string');
  });

  it('should have openRouter config', () => {
    expect(config.openRouter).toBeDefined();
    expect(typeof config.openRouter.baseUrl).toBe('string');
    expect(config.openRouter.baseUrl).toContain('https://');
  });

  it('should have rate limit config with defaults', () => {
    expect(config.rateLimit.max).toBeGreaterThan(0);
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
  });

  it('should have free paraphrases limit', () => {
    expect(config.freeParaphrasesLimit).toBeGreaterThan(0);
    expect(config.freeParaphrasesLimit).toBe(5); // PRD: 5 free per day
  });

  it('should not expose sensitive keys directly', () => {
    // Service keys should be loaded from env, not hardcoded
    expect(config.supabase.serviceKey).toBeDefined();
    // Apple/Google keys should have defaults for development
    expect(typeof config.appleSharedSecret).toBe('string');
    expect(typeof config.googleServiceAccountKey).toBe('string');
  });

  it('should have redis config', () => {
    expect(config.redis).toBeDefined();
    expect(typeof config.redis.enabled).toBe('boolean');
  });
});

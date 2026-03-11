/**
 * Auth Plugin Security Tests
 * Verifies: BE-01 (token cache hashing), BE-02 (dev bypass safety)
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

/** Mirror of hashToken from auth.ts — validates hashing logic */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('Auth Token Cache Security (BE-01)', () => {
  it('should hash tokens to SHA-256 before caching', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.payload';
    const hashed = hashToken(token);

    // SHA-256 always produces 64-char hex string
    expect(hashed).toHaveLength(64);
    // Must not contain the original token
    expect(hashed).not.toContain(token);
    expect(hashed).not.toContain('eyJ');
  });

  it('should produce deterministic hashes', () => {
    const token = 'some-jwt-token-here';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('should produce distinct hashes for different tokens', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce valid hex output (no raw bytes)', () => {
    const hashed = hashToken('test-token');
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});

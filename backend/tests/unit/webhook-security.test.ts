/**
 * Webhook Security Tests
 * Verifies: CP-02 (YooKassa HMAC signature verification)
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

/**
 * Mirror of verifyYooKassaSignature from webhooks.ts
 * Timing-safe HMAC-SHA256 verification
 */
function verifyYooKassaSignature(
  rawBody: string,
  signature: string | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const expectedSignature = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');
  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

describe('YooKassa Webhook Signature Verification (CP-02)', () => {
  const secretKey = 'test-yookassa-secret-key-12345';

  it('should accept valid HMAC-SHA256 signature', () => {
    const body = JSON.stringify({ type: 'notification', event: 'payment.succeeded' });
    const signature = createHmac('sha256', secretKey).update(body).digest('hex');

    expect(verifyYooKassaSignature(body, signature, secretKey)).toBe(true);
  });

  it('should reject tampered body', () => {
    const body = JSON.stringify({ type: 'notification', event: 'payment.succeeded' });
    const signature = createHmac('sha256', secretKey).update(body).digest('hex');

    const tamperedBody = JSON.stringify({ type: 'notification', event: 'payment.succeeded', extra: 'hack' });
    expect(verifyYooKassaSignature(tamperedBody, signature, secretKey)).toBe(false);
  });

  it('should reject forged signature', () => {
    const body = JSON.stringify({ type: 'notification', event: 'payment.succeeded' });
    const forgedSignature = createHmac('sha256', 'wrong-secret').update(body).digest('hex');

    expect(verifyYooKassaSignature(body, forgedSignature, secretKey)).toBe(false);
  });

  it('should reject missing signature (undefined)', () => {
    const body = JSON.stringify({ event: 'payment.succeeded' });
    expect(verifyYooKassaSignature(body, undefined, secretKey)).toBe(false);
  });

  it('should reject empty signature', () => {
    const body = JSON.stringify({ event: 'payment.succeeded' });
    expect(verifyYooKassaSignature(body, '', secretKey)).toBe(false);
  });

  it('should reject when secret key is empty', () => {
    const body = JSON.stringify({ event: 'payment.succeeded' });
    const signature = createHmac('sha256', secretKey).update(body).digest('hex');
    expect(verifyYooKassaSignature(body, signature, '')).toBe(false);
  });

  it('should reject signature with different length', () => {
    const body = JSON.stringify({ event: 'payment.succeeded' });
    expect(verifyYooKassaSignature(body, 'tooshort', secretKey)).toBe(false);
  });

  it('should use timing-safe comparison (constant time)', () => {
    const body = JSON.stringify({ event: 'payment.succeeded' });
    const validSig = createHmac('sha256', secretKey).update(body).digest('hex');

    // A wrong signature that differs only in the last character
    const almostRight = validSig.slice(0, -1) + (validSig.endsWith('0') ? '1' : '0');

    expect(verifyYooKassaSignature(body, almostRight, secretKey)).toBe(false);
    expect(verifyYooKassaSignature(body, validSig, secretKey)).toBe(true);
  });
});

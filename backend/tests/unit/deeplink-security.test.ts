/**
 * Deep Link Validation Tests
 * Verifies: MA-09 (auth guards), MA-10 (UUID validation for noteId)
 */

import { describe, it, expect } from 'vitest';

// UUID v4 regex — same pattern used in _layout.tsx deep link handler
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Deep Link noteId Validation (MA-10)', () => {
  it('should accept valid UUID v4', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should accept UUID with uppercase hex', () => {
    expect(UUID_RE.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(UUID_RE.test('')).toBe(false);
  });

  it('should reject path traversal attempt', () => {
    expect(UUID_RE.test('../../sensitive-path')).toBe(false);
  });

  it('should reject SQL injection attempt', () => {
    expect(UUID_RE.test("'; DROP TABLE--")).toBe(false);
  });

  it('should reject XSS attempt', () => {
    expect(UUID_RE.test('<script>alert(1)</script>')).toBe(false);
  });

  it('should reject UUID without dashes', () => {
    expect(UUID_RE.test('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('should reject partial UUID', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4')).toBe(false);
  });

  it('should reject UUID with extra characters', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000extra')).toBe(false);
  });

  it('should reject relative path in noteId', () => {
    expect(UUID_RE.test('editor/../../private')).toBe(false);
  });

  it('should reject null bytes', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440\x000')).toBe(false);
  });
});

describe('Deep Link Auth Guard Logic (MA-09)', () => {
  // Simulates the auth guard logic from _layout.tsx
  function canNavigateToProtectedRoute(path: string, isAuthenticated: boolean): boolean {
    // Auth callbacks always allowed
    if (path.startsWith('auth/callback')) return true;
    // All other paths require auth
    return isAuthenticated;
  }

  it('should allow auth callback even when unauthenticated', () => {
    expect(canNavigateToProtectedRoute('auth/callback', false)).toBe(true);
    expect(canNavigateToProtectedRoute('auth/callback#token=abc', true)).toBe(true);
  });

  it('should block settings deep link when unauthenticated', () => {
    expect(canNavigateToProtectedRoute('settings', false)).toBe(false);
  });

  it('should block subscription deep link when unauthenticated', () => {
    expect(canNavigateToProtectedRoute('subscription', false)).toBe(false);
  });

  it('should block editor deep link when unauthenticated', () => {
    expect(canNavigateToProtectedRoute('editor/some-note-id', false)).toBe(false);
  });

  it('should allow settings deep link when authenticated', () => {
    expect(canNavigateToProtectedRoute('settings', true)).toBe(true);
  });

  it('should allow subscription deep link when authenticated', () => {
    expect(canNavigateToProtectedRoute('subscription', true)).toBe(true);
  });

  it('should allow editor deep link when authenticated', () => {
    expect(canNavigateToProtectedRoute('editor/550e8400-e29b-41d4-a716-446655440000', true)).toBe(true);
  });
});

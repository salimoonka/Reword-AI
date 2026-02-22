/**
 * Cache Key Generation Tests
 * Tests the generateCacheKey pure function
 */

import { describe, it, expect } from 'vitest';
import { generateCacheKey } from '../../src/services/cache/paraphrase-cache.js';

describe('Cache', () => {
  describe('generateCacheKey', () => {
    it('should return a 32-character hex string', () => {
      const key = generateCacheKey('Тестовый текст', 'formal');
      expect(key).toHaveLength(32);
      expect(key).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should return the same key for identical inputs', () => {
      const key1 = generateCacheKey('Текст', 'formal');
      const key2 = generateCacheKey('Текст', 'formal');
      expect(key1).toBe(key2);
    });

    it('should be case-insensitive for text', () => {
      const key1 = generateCacheKey('Hello World', 'formal');
      const key2 = generateCacheKey('hello world', 'formal');
      expect(key1).toBe(key2);
    });

    it('should trim whitespace', () => {
      const key1 = generateCacheKey('Текст', 'formal');
      const key2 = generateCacheKey('  Текст  ', 'formal');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different modes', () => {
      const key1 = generateCacheKey('Текст', 'formal');
      const key2 = generateCacheKey('Текст', 'friendly');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different texts', () => {
      const key1 = generateCacheKey('Один текст', 'formal');
      const key2 = generateCacheKey('Другой текст', 'formal');
      expect(key1).not.toBe(key2);
    });

    it('should handle empty text', () => {
      const key = generateCacheKey('', 'formal');
      expect(key).toHaveLength(32);
      expect(key).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should handle very long text', () => {
      const longText = 'Привет '.repeat(10000);
      const key = generateCacheKey(longText, 'shorten');
      expect(key).toHaveLength(32);
      expect(key).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should handle Unicode correctly', () => {
      const key1 = generateCacheKey('ёжик', 'formal');
      const key2 = generateCacheKey('ежик', 'formal');
      // ё and е are different characters
      expect(key1).not.toBe(key2);
    });

    it('should produce consistent hashes across calls', () => {
      const keys = Array.from({ length: 10 }, () =>
        generateCacheKey('Стабильность', 'expand')
      );
      expect(new Set(keys).size).toBe(1);
    });
  });
});

/**
 * Schema Validation Tests
 * Tests Zod schemas for API request/response validation
 */

import { describe, it, expect } from 'vitest';
import {
  paraphraseRequestSchema,
  paraphraseModeSchema,
} from '../../src/schemas/paraphrase.js';

describe('Paraphrase Schemas', () => {
  describe('paraphraseModeSchema', () => {
    const validModes = [
      'paraphrase',
      'shorten',
      'expand',
      'formal',
      'friendly',
      'confident',
      'professional',
      'colloquial',
      'empathetic',
    ];

    it.each(validModes)('should accept valid mode: %s', (mode) => {
      const result = paraphraseModeSchema.safeParse(mode);
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = paraphraseModeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = paraphraseModeSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('paraphraseRequestSchema', () => {
    it('should accept valid request', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Привет, как дела?',
        mode: 'formal',
      });
      expect(result.success).toBe(true);
      expect(result.data?.preserve_english).toBe(true); // default
    });

    it('should accept request with all optional fields', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Test text',
        mode: 'shorten',
        preserve_english: false,
        max_length: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data?.preserve_english).toBe(false);
      expect(result.data?.max_length).toBe(100);
    });

    it('should reject empty text', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: '',
        mode: 'formal',
      });
      expect(result.success).toBe(false);
    });

    it('should reject text exceeding 10000 characters', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'a'.repeat(10001),
        mode: 'formal',
      });
      expect(result.success).toBe(false);
    });

    it('should accept text at exactly 10000 characters', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'a'.repeat(10000),
        mode: 'formal',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing text field', () => {
      const result = paraphraseRequestSchema.safeParse({
        mode: 'formal',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing mode field', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Test text',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid mode', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Test text',
        mode: 'invalid_mode',
      });
      expect(result.success).toBe(false);
    });

    it('should handle unicode (Russian) text correctly', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Перефразируйте этот текст, пожалуйста. Он содержит кириллические символы.',
        mode: 'empathetic',
      });
      expect(result.success).toBe(true);
    });

    it('should handle mixed language text', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'This is English text mixed with русские слова and some numbers 12345',
        mode: 'colloquial',
      });
      expect(result.success).toBe(true);
    });
  });
});

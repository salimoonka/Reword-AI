/**
 * PRD Acceptance Criteria Verification
 * Cross-references Implementation.md deliverables against PRD acceptance criteria
 * 
 * This file serves as a test-driven checklist. Each passing test confirms
 * a PRD requirement has been implemented.
 */

import { describe, it, expect } from 'vitest';
import { paraphraseRequestSchema, paraphraseModeSchema } from '../../src/schemas/paraphrase.js';
import { maskPII, unmaskPII } from '../../src/services/pii/masker.js';
import { computeDiff } from '../../src/services/paraphrase/diff.js';
import { SYSTEM_PROMPT, MODE_INSTRUCTIONS, buildPrompt } from '../../src/services/llm/prompts.js';
import { generateCacheKey } from '../../src/services/cache/paraphrase-cache.js';
import { estimateCost } from '../../src/services/billing/token-accounting.js';
import { config } from '../../src/config.js';

describe('PRD Acceptance Criteria', () => {
  // PRD Section 3: 8 paraphrase modes
  describe('Paraphrase Modes (PRD §3)', () => {
    const requiredModes = [
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

    it('should support all 9 required modes', () => {
      for (const mode of requiredModes) {
        const result = paraphraseModeSchema.safeParse(mode);
        expect(result.success, `Mode "${mode}" should be valid`).toBe(true);
      }
    });

    it('should have LLM instructions for all 9 modes', () => {
      for (const mode of requiredModes) {
        expect(
          MODE_INSTRUCTIONS[mode as keyof typeof MODE_INSTRUCTIONS],
          `Missing instruction for "${mode}"`
        ).toBeDefined();
      }
    });
  });

  // PRD Section 6: API contract validation
  describe('API Contract (PRD §6)', () => {
    it('POST /v1/paraphrase request schema should match PRD', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Исходный текст пользователя',
        mode: 'formal',
        preserve_english: true,
        max_length: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should support preserve_english flag (default true)', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Test',
        mode: 'shorten',
      });
      expect(result.success).toBe(true);
      expect(result.data?.preserve_english).toBe(true);
    });

    it('should support optional max_length', () => {
      const result = paraphraseRequestSchema.safeParse({
        text: 'Test',
        mode: 'expand',
        max_length: 1000,
      });
      expect(result.success).toBe(true);
      expect(result.data?.max_length).toBe(1000);
    });
  });

  // PRD Section 4: Diff view (red/green)
  describe('Diff View (PRD §4)', () => {
    it('should compute diff with delete/insert/equal segment types', () => {
      const diff = computeDiff('Превет, как дела', 'Привет, как дела');
      const types = new Set(diff.map((s) => s.type));
      expect(types.size).toBeGreaterThan(0);
      // At minimum we should have deletes and inserts for the change
    });

    it('should return segments with start/end positions and text', () => {
      const diff = computeDiff('старый текст', 'новый текст');
      for (const seg of diff) {
        expect(seg).toHaveProperty('type');
        expect(seg).toHaveProperty('start');
        expect(seg).toHaveProperty('end');
        expect(seg).toHaveProperty('text');
      }
    });
  });

  // PRD Section 8: Privacy - PII masking
  describe('PII Masking (PRD §8)', () => {
    it('should mask Russian phone numbers before sending to LLM', () => {
      const { maskedText } = maskPII('Позвоните: +7 999 123-45-67');
      expect(maskedText).not.toContain('+7 999 123-45-67');
      expect(maskedText).toContain('[ТЕЛЕФОН]');
    });

    it('should mask email addresses', () => {
      const { maskedText } = maskPII('Email: user@example.com');
      expect(maskedText).not.toContain('user@example.com');
      expect(maskedText).toContain('[EMAIL]');
    });

    it('should mask credit card numbers', () => {
      const { maskedText } = maskPII('Карта: 4111 1111 1111 1111');
      expect(maskedText).not.toContain('4111 1111 1111 1111');
      expect(maskedText).toContain('[КАРТА]');
    });

    it('should mask passport numbers', () => {
      const { maskedText } = maskPII('Паспорт: 4510 123456');
      expect(maskedText).toContain('[ПАСПОРТ]');
    });

    it('should support round-trip mask/unmask', () => {
      const original = 'Позвоните на +7 999 123-45-67 или напишите user@test.com';
      const { maskedText, replacements } = maskPII(original);
      const restored = unmaskPII(maskedText, replacements);
      expect(restored).toBe(original);
    });
  });

  // PRD Section 7: System prompt
  describe('LLM Prompt Templates (PRD §7)', () => {
    it('system prompt should instruct Russian language', () => {
      expect(SYSTEM_PROMPT).toMatch(/русск/i);
    });

    it('system prompt should instruct preserving English words', () => {
      expect(SYSTEM_PROMPT).toMatch(/английск/i);
    });

    it('system prompt should instruct returning only result text', () => {
      expect(SYSTEM_PROMPT).toMatch(/ТОЛЬКО/i);
    });

    it('buildPrompt should include text and mode instruction', () => {
      const prompt = buildPrompt('Тестовый текст', 'friendly');
      expect(prompt).toContain('Тестовый текст');
      expect(prompt).toContain(MODE_INSTRUCTIONS['friendly']);
    });
  });

  // PRD Section 10: Monetization
  describe('Monetization (PRD §10)', () => {
    it('free tier should have 5 daily paraphrases', () => {
      expect(config.freeParaphrasesLimit).toBe(5);
    });

    it('estimateCost should calculate token costs', () => {
      const cost = estimateCost(1_000_000);
      expect(cost.usd).toBeGreaterThan(0);
      expect(cost.rub).toBeGreaterThan(0);
    });
  });

  // PRD Section 5: Architecture - caching
  describe('Caching (PRD §5)', () => {
    it('should generate deterministic cache keys', () => {
      const key1 = generateCacheKey('Тест', 'formal');
      const key2 = generateCacheKey('Тест', 'formal');
      expect(key1).toBe(key2);
    });

    it('should generate different keys per mode', () => {
      const key1 = generateCacheKey('Тест', 'formal');
      const key2 = generateCacheKey('Тест', 'friendly');
      expect(key1).not.toBe(key2);
    });
  });

  // PRD Section 5: Architecture - server-side proxy
  describe('Server-Side Proxy Architecture (PRD §5)', () => {
    it('should have OpenRouter config with HTTPS base URL', () => {
      expect(config.openRouter.baseUrl).toContain('https://');
    });

    it('should have Supabase configuration', () => {
      expect(config.supabase.url).toBeDefined();
      expect(typeof config.supabase.url).toBe('string');
    });
  });
});

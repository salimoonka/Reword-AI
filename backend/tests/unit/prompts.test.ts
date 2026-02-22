/**
 * LLM Prompts Tests
 * Tests prompt templates and build function
 */

import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  MODE_INSTRUCTIONS,
  buildPrompt,
  type ParaphraseMode,
} from '../../src/services/llm/prompts.js';

const ALL_MODES: ParaphraseMode[] = [
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

describe('LLM Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should be defined and non-empty', () => {
      expect(SYSTEM_PROMPT).toBeDefined();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should mention Russian language', () => {
      expect(SYSTEM_PROMPT).toMatch(/русск/i);
    });

    it('should instruct to preserve English words', () => {
      expect(SYSTEM_PROMPT).toMatch(/английск/i);
    });

    it('should instruct to respond with result only', () => {
      expect(SYSTEM_PROMPT).toMatch(/ТОЛЬКО/i);
    });
  });

  describe('MODE_INSTRUCTIONS', () => {
    it('should have instructions for all 9 modes', () => {
      expect(Object.keys(MODE_INSTRUCTIONS).length).toBe(9);
    });

    it.each(ALL_MODES)('should have non-empty instruction for mode: %s', (mode) => {
      expect(MODE_INSTRUCTIONS[mode]).toBeDefined();
      expect(MODE_INSTRUCTIONS[mode].length).toBeGreaterThan(0);
    });

    it('should have Russian instructions', () => {
      for (const mode of ALL_MODES) {
        // Each instruction should contain Cyrillic characters
        expect(MODE_INSTRUCTIONS[mode]).toMatch(/[\u0400-\u04FF]/);
      }
    });
  });

  describe('buildPrompt', () => {
    it('should include mode instruction', () => {
      const prompt = buildPrompt('Тестовый текст', 'formal');
      expect(prompt).toContain(MODE_INSTRUCTIONS['formal']);
    });

    it('should include the input text', () => {
      const text = 'Это мой тестовый текст для проверки';
      const prompt = buildPrompt(text, 'shorten');
      expect(prompt).toContain(text);
    });

    it('should end with Результат:', () => {
      const prompt = buildPrompt('Текст', 'expand');
      expect(prompt.trimEnd()).toMatch(/Результат:$/);
    });

    it.each(ALL_MODES)('should build valid prompt for mode: %s', (mode) => {
      const prompt = buildPrompt('Тест', mode);
      expect(prompt).toContain('Тест');
      expect(prompt).toContain(MODE_INSTRUCTIONS[mode]);
      expect(prompt).toContain('Результат:');
    });

    it('should separate text from instruction', () => {
      const prompt = buildPrompt('Мой текст', 'friendly');
      expect(prompt).toContain('Текст: Мой текст');
    });
  });
});

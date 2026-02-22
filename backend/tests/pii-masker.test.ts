/**
 * PII Masker Tests
 */

import { describe, it, expect } from 'vitest';
import { maskPII, unmaskPII } from '../src/services/pii/masker.js';

describe('PII Masker', () => {
  describe('phone numbers', () => {
    it('should mask Russian phone numbers with +7', () => {
      const input = 'Позвоните мне: +7 999 123-45-67';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ТЕЛЕФОН]');
      expect(maskedText).not.toContain('+7 999 123-45-67');
      expect(replacements.length).toBe(1);
      expect(replacements[0].type).toBe('PHONE');
    });

    it('should mask phone numbers starting with 8', () => {
      const input = 'Телефон: 89991234567';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ТЕЛЕФОН]');
      expect(maskedText).not.toContain('89991234567');
      expect(replacements.length).toBeGreaterThanOrEqual(1);
    });

    it('should mask multiple phone numbers', () => {
      const input = 'Телефоны: +7 999 123-45-67 и +7(495)123-45-67';
      const { maskedText, replacements } = maskPII(input);

      const phoneReplacements = replacements.filter((r) => r.type === 'PHONE');
      expect(phoneReplacements.length).toBe(2);
    });
  });

  describe('email addresses', () => {
    it('should mask email addresses', () => {
      const input = 'Напишите на user@example.com';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[EMAIL]');
      expect(maskedText).not.toContain('user@example.com');
      expect(replacements.length).toBe(1);
      expect(replacements[0].type).toBe('EMAIL');
    });
  });

  describe('card numbers', () => {
    it('should mask credit card numbers', () => {
      const input = 'Карта: 4111 1111 1111 1111';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[КАРТА]');
      expect(maskedText).not.toContain('4111 1111 1111 1111');
    });
  });

  describe('passport numbers', () => {
    it('should mask Russian passport numbers', () => {
      const input = 'Паспорт: 4510 123456';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ПАСПОРТ]');
    });
  });

  describe('INN', () => {
    it('should mask 10-digit INN', () => {
      const input = 'ИНН организации: 7712345678';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ИНН]');
    });

    it('should mask 12-digit INN', () => {
      const input = 'ИНН физлица: 771234567890';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ИНН]');
    });
  });

  describe('SNILS', () => {
    it('should mask SNILS numbers', () => {
      const input = 'СНИЛС: 123-456-789 01';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[СНИЛС]');
    });
  });

  describe('unmaskPII', () => {
    it('should restore original values', () => {
      const original = 'Позвоните на +7 999 123-45-67, email: test@mail.ru';
      const { maskedText, replacements } = maskPII(original);
      const restored = unmaskPII(maskedText, replacements);

      expect(restored).toBe(original);
    });

    it('should handle text with no PII', () => {
      const original = 'Привет, как дела?';
      const { maskedText, replacements } = maskPII(original);
      const restored = unmaskPII(maskedText, replacements);

      expect(restored).toBe(original);
      expect(replacements.length).toBe(0);
    });
  });

  describe('no PII', () => {
    it('should leave text unchanged when no PII is present', () => {
      const input = 'Обычный текст без персональных данных';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toBe(input);
      expect(replacements.length).toBe(0);
    });
  });

  describe('mixed PII', () => {
    it('should mask multiple types of PII in a single text', () => {
      const input =
        'Звоните: +7 999 123-45-67 или пишите на test@mail.ru. Карта: 4111 1111 1111 1111';
      const { maskedText, replacements } = maskPII(input);

      expect(maskedText).toContain('[ТЕЛЕФОН]');
      expect(maskedText).toContain('[EMAIL]');
      expect(maskedText).toContain('[КАРТА]');
      expect(replacements.length).toBeGreaterThanOrEqual(3);
    });
  });
});

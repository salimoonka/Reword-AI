/**
 * PII Masking Service
 * Masks personally identifiable information before sending to LLM
 * 
 * Patterns for Russian PII:
 * - Phone numbers (Russian format)
 * - Email addresses
 * - Credit card numbers
 * - Passport numbers (Russian)
 * - INN (Taxpayer ID)
 * - SNILS (Insurance number)
 */

export interface MaskingResult {
  maskedText: string;
  replacements: Array<{
    original: string;
    replacement: string;
    type: string;
    startIndex: number;
    endIndex: number;
  }>;
}

// Russian phone patterns: +7, 8, various formats
const PHONE_PATTERN =
  /(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Credit card pattern (16 digits with optional spaces/dashes)
const CARD_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

// Russian passport: series (4 digits) and number (6 digits)
const PASSPORT_PATTERN = /\b\d{2}[\s]?\d{2}[\s]?\d{6}\b/g;

// INN (Taxpayer ID): 10 or 12 digits
const INN_PATTERN = /\b\d{10,12}\b/g;

// SNILS: 11 digits with optional formatting
const SNILS_PATTERN = /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}\b/g;

const patterns = [
  { pattern: PHONE_PATTERN, type: 'PHONE', replacement: '[ТЕЛЕФОН]' },
  { pattern: EMAIL_PATTERN, type: 'EMAIL', replacement: '[EMAIL]' },
  { pattern: CARD_PATTERN, type: 'CARD', replacement: '[КАРТА]' },
  { pattern: SNILS_PATTERN, type: 'SNILS', replacement: '[СНИЛС]' },
  { pattern: INN_PATTERN, type: 'INN', replacement: '[ИНН]' },
  { pattern: PASSPORT_PATTERN, type: 'PASSPORT', replacement: '[ПАСПОРТ]' },
];

/**
 * Mask PII in text before sending to LLM
 */
export function maskPII(text: string): MaskingResult {
  const replacements: MaskingResult['replacements'] = [];
  let maskedText = text;

  for (const { pattern, type, replacement } of patterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const original = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + original.length;

      // Check if this position was already replaced
      const alreadyReplaced = replacements.some(
        (r) =>
          (startIndex >= r.startIndex && startIndex < r.endIndex) ||
          (endIndex > r.startIndex && endIndex <= r.endIndex)
      );

      if (!alreadyReplaced) {
        replacements.push({
          original,
          replacement,
          type,
          startIndex,
          endIndex,
        });
      }
    }
  }

  // Sort replacements by position (descending) to replace from end
  replacements.sort((a, b) => b.startIndex - a.startIndex);

  // Apply replacements from end to start (no offset needed when going backwards)
  for (const r of replacements) {
    maskedText =
      maskedText.substring(0, r.startIndex) +
      r.replacement +
      maskedText.substring(r.endIndex);
  }

  // Re-sort for output
  replacements.sort((a, b) => a.startIndex - b.startIndex);

  return {
    maskedText,
    replacements,
  };
}

/**
 * Unmask PII in text (restore original values)
 * Used to restore PII after LLM response
 */
export function unmaskPII(text: string, replacements: MaskingResult['replacements']): string {
  let result = text;

  // Sort by replacement position in masked text (descending)
  const sortedReplacements = [...replacements].sort((a, b) => b.startIndex - a.startIndex);

  for (const r of sortedReplacements) {
    // Find the replacement placeholder and restore original
    const index = result.indexOf(r.replacement);
    if (index !== -1) {
      result = result.substring(0, index) + r.original + result.substring(index + r.replacement.length);
    }
  }

  return result;
}

export default { maskPII, unmaskPII };

/**
 * Diff Computation Tests
 * Tests the word-based LCS diff algorithm
 */

import { describe, it, expect } from 'vitest';
import { computeDiff, type DiffSegment } from '../../src/services/paraphrase/diff.js';

describe('computeDiff', () => {
  it('should return empty array for identical strings', () => {
    const diff = computeDiff('hello world', 'hello world');
    const nonEqual = diff.filter((s) => s.type !== 'equal');
    expect(nonEqual.length).toBe(0);
  });

  it('should detect a simple word replacement', () => {
    const diff = computeDiff('привет мир', 'здравствуйте мир');
    const deleted = diff.filter((s) => s.type === 'delete');
    const inserted = diff.filter((s) => s.type === 'insert');
    const equal = diff.filter((s) => s.type === 'equal');

    expect(deleted.length).toBeGreaterThan(0);
    expect(inserted.length).toBeGreaterThan(0);
    expect(equal.length).toBeGreaterThan(0);
    expect(deleted.some((s) => s.text.includes('привет'))).toBe(true);
    expect(inserted.some((s) => s.text.includes('здравствуйте'))).toBe(true);
    expect(equal.some((s) => s.text.includes('мир'))).toBe(true);
  });

  it('should detect inserted text', () => {
    const diff = computeDiff('слово', 'новое слово');
    const inserted = diff.filter((s) => s.type === 'insert');
    expect(inserted.length).toBeGreaterThan(0);
  });

  it('should detect deleted text', () => {
    const diff = computeDiff('старое слово', 'слово');
    const deleted = diff.filter((s) => s.type === 'delete');
    expect(deleted.length).toBeGreaterThan(0);
  });

  it('should handle empty original string', () => {
    const diff = computeDiff('', 'новый текст');
    expect(diff.length).toBeGreaterThan(0);
    expect(diff.every((s) => s.type === 'insert')).toBe(true);
  });

  it('should handle empty modified string', () => {
    const diff = computeDiff('старый текст', '');
    expect(diff.length).toBeGreaterThan(0);
    expect(diff.every((s) => s.type === 'delete')).toBe(true);
  });

  it('should handle both empty strings', () => {
    const diff = computeDiff('', '');
    expect(diff.length).toBe(0);
  });

  it('should have valid segment positions', () => {
    const diff = computeDiff('один два три', 'один четыре три');
    for (const segment of diff) {
      expect(segment.start).toBeLessThanOrEqual(segment.end);
      expect(segment.text.length).toBe(segment.end - segment.start);
    }
  });

  it('should merge consecutive equal segments', () => {
    const diff = computeDiff('один два три', 'один два три');
    // All segments should be equal and merged
    for (const segment of diff) {
      expect(segment.type).toBe('equal');
    }
  });

  it('should contain all three segment types for complex diff', () => {
    const diff = computeDiff(
      'Этот старый текст нужно изменить',
      'Этот новый текст был изменён'
    );
    const types = new Set(diff.map((s) => s.type));
    expect(types.has('equal')).toBe(true);
    expect(types.has('delete')).toBe(true);
    expect(types.has('insert')).toBe(true);
  });

  it('should return DiffSegment objects with required fields', () => {
    const diff = computeDiff('aaa', 'bbb');
    for (const segment of diff) {
      expect(segment).toHaveProperty('type');
      expect(segment).toHaveProperty('start');
      expect(segment).toHaveProperty('end');
      expect(segment).toHaveProperty('text');
      expect(['delete', 'insert', 'equal']).toContain(segment.type);
      expect(typeof segment.start).toBe('number');
      expect(typeof segment.end).toBe('number');
      expect(typeof segment.text).toBe('string');
    }
  });
});

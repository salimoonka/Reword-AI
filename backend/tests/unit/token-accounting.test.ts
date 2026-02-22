/**
 * Token Accounting Tests
 * Tests the estimateCost pure function
 */

import { describe, it, expect } from 'vitest';
import { estimateCost } from '../../src/services/billing/token-accounting.js';

describe('Token Accounting', () => {
  describe('estimateCost', () => {
    it('should return zero cost for zero tokens', () => {
      const cost = estimateCost(0);
      expect(cost.usd).toBe(0);
      expect(cost.rub).toBe(0);
    });

    it('should calculate USD cost based on $0.21/1M tokens', () => {
      const cost = estimateCost(1_000_000);
      expect(cost.usd).toBeCloseTo(0.21, 2);
    });

    it('should calculate RUB cost with 90 RUB/USD rate', () => {
      const cost = estimateCost(1_000_000);
      expect(cost.rub).toBeCloseTo(0.21 * 90, 0);
    });

    it('should return numeric values', () => {
      const cost = estimateCost(50000);
      expect(typeof cost.usd).toBe('number');
      expect(typeof cost.rub).toBe('number');
    });

    it('should be proportional to token count', () => {
      const cost1 = estimateCost(100_000);
      const cost2 = estimateCost(200_000);
      expect(cost2.usd).toBeCloseTo(cost1.usd * 2, 4);
      expect(cost2.rub).toBeCloseTo(cost1.rub * 2, 2);
    });

    it('should handle very small token counts', () => {
      const cost = estimateCost(1);
      expect(cost.usd).toBeGreaterThanOrEqual(0);
      expect(cost.rub).toBeGreaterThanOrEqual(0);
    });

    it('should handle large token counts', () => {
      const cost = estimateCost(100_000_000);
      expect(cost.usd).toBeGreaterThan(0);
      expect(cost.rub).toBeGreaterThan(cost.usd); // RUB > USD
    });

    it('USD should have max 4 decimal places', () => {
      const cost = estimateCost(12345);
      const decimalPart = cost.usd.toString().split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(4);
    });

    it('RUB should have max 2 decimal places', () => {
      const cost = estimateCost(12345);
      const decimalPart = cost.rub.toString().split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    });
  });
});

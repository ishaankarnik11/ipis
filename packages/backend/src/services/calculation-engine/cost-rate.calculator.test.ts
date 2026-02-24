import { describe, it, expect } from 'vitest';
import { calculateCostPerHour } from './cost-rate.calculator.js';

describe('calculateCostPerHour', () => {
  describe('standard calculations', () => {
    it('should return correct cost per hour for standard case (AC2 reference fixture)', () => {
      // Reference: annualCtcPaise = 84000000 (₹8,40,000), overheadPaise = 18000000 (₹1,80,000), 160 hours
      // (84000000 + 18000000) / 12 / 160 = 53125
      const result = calculateCostPerHour({
        annualCtcPaise: 84_000_000,
        overheadPaise: 18_000_000,
        standardMonthlyHours: 160,
      });
      expect(result).toBe(53_125);
    });

    it('should return correct cost per hour for 176-hour month variant', () => {
      // (84000000 + 18000000) / 12 / 176 = 48295.4545... → 48295
      const result = calculateCostPerHour({
        annualCtcPaise: 84_000_000,
        overheadPaise: 18_000_000,
        standardMonthlyHours: 176,
      });
      expect(result).toBe(48_295);
    });

    it('should return correct cost per hour for different overhead amount', () => {
      // (60000000 + 12000000) / 12 / 160 = 37500
      const result = calculateCostPerHour({
        annualCtcPaise: 60_000_000,
        overheadPaise: 12_000_000,
        standardMonthlyHours: 160,
      });
      expect(result).toBe(37_500);
    });
  });

  describe('rounding behavior', () => {
    it('should round down for fractional paise below .5', () => {
      // (50000000 + 10000000) / 12 / 176 = 28409.0909... → 28409
      const result = calculateCostPerHour({
        annualCtcPaise: 50_000_000,
        overheadPaise: 10_000_000,
        standardMonthlyHours: 176,
      });
      expect(result).toBe(28_409);
    });

    it('should round up at exact .5 boundary (Math.round behavior)', () => {
      // (84000960 + 18000000) / 12 / 160 = 102000960 / 1920 = 53125.5 → 53126
      const result = calculateCostPerHour({
        annualCtcPaise: 84_000_960,
        overheadPaise: 18_000_000,
        standardMonthlyHours: 160,
      });
      expect(result).toBe(53_126);
    });
  });

  describe('large number handling', () => {
    it('should handle high-value CTC correctly (₹50L+)', () => {
      // (500000000 + 100000000) / 12 / 160 = 600000000 / 1920 = 312500
      const result = calculateCostPerHour({
        annualCtcPaise: 500_000_000,
        overheadPaise: 100_000_000,
        standardMonthlyHours: 160,
      });
      expect(result).toBe(312_500);
    });
  });

  describe('error handling', () => {
    it('should throw RangeError when standardMonthlyHours is zero', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: 84_000_000,
          overheadPaise: 18_000_000,
          standardMonthlyHours: 0,
        }),
      ).toThrow(new RangeError('standardMonthlyHours must be greater than zero'));
    });

    it('should throw RangeError when standardMonthlyHours is negative', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: 84_000_000,
          overheadPaise: 18_000_000,
          standardMonthlyHours: -10,
        }),
      ).toThrow(new RangeError('standardMonthlyHours must be greater than zero'));
    });

    it('should throw RangeError when annualCtcPaise is negative', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: -84_000_000,
          overheadPaise: 18_000_000,
          standardMonthlyHours: 160,
        }),
      ).toThrow(new RangeError('annualCtcPaise must be a non-negative finite number'));
    });

    it('should throw RangeError when overheadPaise is negative', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: 84_000_000,
          overheadPaise: -18_000_000,
          standardMonthlyHours: 160,
        }),
      ).toThrow(new RangeError('overheadPaise must be a non-negative finite number'));
    });

    it('should throw RangeError when annualCtcPaise is NaN', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: NaN,
          overheadPaise: 18_000_000,
          standardMonthlyHours: 160,
        }),
      ).toThrow(new RangeError('annualCtcPaise must be a non-negative finite number'));
    });

    it('should throw RangeError when overheadPaise is Infinity', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: 84_000_000,
          overheadPaise: Infinity,
          standardMonthlyHours: 160,
        }),
      ).toThrow(new RangeError('overheadPaise must be a non-negative finite number'));
    });

    it('should throw RangeError when standardMonthlyHours is NaN', () => {
      expect(() =>
        calculateCostPerHour({
          annualCtcPaise: 84_000_000,
          overheadPaise: 18_000_000,
          standardMonthlyHours: NaN,
        }),
      ).toThrow(new RangeError('standardMonthlyHours must be greater than zero'));
    });
  });

  describe('purity constraints (AC4)', () => {
    it('should return a plain number (integer paise)', () => {
      const result = calculateCostPerHour({
        annualCtcPaise: 84_000_000,
        overheadPaise: 18_000_000,
        standardMonthlyHours: 160,
      });
      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateFixedCost } from './fixed-cost.calculator.js';

describe('calculateFixedCost', () => {
  describe('on-track project — burn < completion (AC1, AC2, AC3)', () => {
    it('should return correct values for an on-track project', () => {
      // Contract: ₹5,00,000 = 50_000_000 paise
      // 1 employee: 80 hours @ ₹531.25/hr (53125 paise)
      // cost    = 80 × 53125 = 4_250_000 paise
      // revenue = 50_000_000 paise (contractValue)
      // profit  = 50_000_000 - 4_250_000 = 45_750_000 paise
      // margin  = 45_750_000 / 50_000_000 = 0.915
      // burn    = 4_250_000 / 50_000_000 = 0.085
      // completion = 0.20 (20%)
      // isAtRisk = 0.085 > 0.20 → false (burn < completion → on track)
      const result = calculateFixedCost({
        contractValuePaise: 50_000_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 53_125 }],
        completionPercent: 0.2,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(4_250_000);
      expect(result.profitPaise).toBe(45_750_000);
      expect(result.marginPercent).toBeCloseTo(0.915, 10);
      expect(result.burnPercent).toBeCloseTo(0.085, 10);
      expect(result.isAtRisk).toBe(false);
    });
  });

  describe('at-risk project — burn > completion (AC3)', () => {
    it('should flag isAtRisk when burnPercent exceeds completionPercent', () => {
      // Contract: ₹2,00,000 = 20_000_000 paise
      // 2 employees:
      //   Employee A: 120 hours @ ₹531.25/hr = 6_375_000
      //   Employee B: 80 hours  @ ₹375.00/hr = 3_000_000
      // cost    = 6_375_000 + 3_000_000 = 9_375_000 paise
      // revenue = 20_000_000 paise
      // profit  = 20_000_000 - 9_375_000 = 10_625_000 paise
      // margin  = 10_625_000 / 20_000_000 = 0.53125
      // burn    = 9_375_000 / 20_000_000 = 0.46875
      // completion = 0.30 (30%)
      // isAtRisk = 0.46875 > 0.30 → true
      const result = calculateFixedCost({
        contractValuePaise: 20_000_000,
        employeeCosts: [
          { hours: 120, costPerHourPaise: 53_125 },
          { hours: 80, costPerHourPaise: 37_500 },
        ],
        completionPercent: 0.3,
      });

      expect(result.revenuePaise).toBe(20_000_000);
      expect(result.costPaise).toBe(9_375_000);
      expect(result.profitPaise).toBe(10_625_000);
      expect(result.marginPercent).toBeCloseTo(0.53125, 10);
      expect(result.burnPercent).toBeCloseTo(0.46875, 10);
      expect(result.isAtRisk).toBe(true);
    });
  });

  describe('completed project — completion = 1.0 (AC3)', () => {
    it('should handle fully completed project correctly', () => {
      // Contract: ₹10,00,000 = 100_000_000 paise
      // 1 employee: 160 hours @ ₹531.25/hr = 8_500_000 paise
      // revenue = 100_000_000 paise
      // profit  = 100_000_000 - 8_500_000 = 91_500_000 paise
      // margin  = 91_500_000 / 100_000_000 = 0.915
      // burn    = 8_500_000 / 100_000_000 = 0.085
      // completion = 1.0 (100%)
      // isAtRisk = 0.085 > 1.0 → false
      const result = calculateFixedCost({
        contractValuePaise: 100_000_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
        completionPercent: 1.0,
      });

      expect(result.revenuePaise).toBe(100_000_000);
      expect(result.costPaise).toBe(8_500_000);
      expect(result.profitPaise).toBe(91_500_000);
      expect(result.marginPercent).toBeCloseTo(0.915, 10);
      expect(result.burnPercent).toBeCloseTo(0.085, 10);
      expect(result.isAtRisk).toBe(false);
    });
  });

  describe('null completion percent — unknown, isAtRisk defaults to false (AC4)', () => {
    it('should treat null completionPercent as unknown and isAtRisk as false', () => {
      // Contract: ₹5,00,000 = 50_000_000 paise
      // 1 employee: 80 hours @ ₹531.25/hr = 4_250_000 paise
      // burn = 4_250_000 / 50_000_000 = 0.085
      // completion = null → unknown
      // isAtRisk = false (unknown completion → not flagged)
      const result = calculateFixedCost({
        contractValuePaise: 50_000_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 53_125 }],
        completionPercent: null,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(4_250_000);
      expect(result.profitPaise).toBe(45_750_000);
      expect(result.marginPercent).toBeCloseTo(0.915, 10);
      expect(result.burnPercent).toBeCloseTo(0.085, 10);
      expect(result.isAtRisk).toBe(false);
    });
  });

  describe('zero completion percent — 0% done with costs incurred (AC3)', () => {
    it('should flag isAtRisk when burn > 0 and completion is explicitly 0', () => {
      // Contract: ₹5,00,000 = 50_000_000 paise
      // 1 employee: 80 hours @ ₹531.25/hr = 4_250_000 paise
      // burn = 4_250_000 / 50_000_000 = 0.085
      // completion = 0 (literally 0% — project just started)
      // isAtRisk = 0.085 > 0 → true (burning budget with no progress)
      const result = calculateFixedCost({
        contractValuePaise: 50_000_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 53_125 }],
        completionPercent: 0,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(4_250_000);
      expect(result.profitPaise).toBe(45_750_000);
      expect(result.burnPercent).toBeCloseTo(0.085, 10);
      expect(result.isAtRisk).toBe(true);
    });
  });

  describe('output shape and purity (AC1, AC5)', () => {
    it('should return all currency values as integers', () => {
      const result = calculateFixedCost({
        contractValuePaise: 50_000_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
        completionPercent: 0.5,
      });

      expect(Number.isInteger(result.revenuePaise)).toBe(true);
      expect(Number.isInteger(result.costPaise)).toBe(true);
      expect(Number.isInteger(result.profitPaise)).toBe(true);
      expect(typeof result.marginPercent).toBe('number');
      expect(typeof result.burnPercent).toBe('number');
      expect(typeof result.isAtRisk).toBe('boolean');
    });
  });

  describe('empty employeeCosts array', () => {
    it('should return zero cost and full profit when no employees assigned', () => {
      const result = calculateFixedCost({
        contractValuePaise: 50_000_000,
        employeeCosts: [],
        completionPercent: 0.5,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(0);
      expect(result.profitPaise).toBe(50_000_000);
      expect(result.marginPercent).toBe(1);
      expect(result.burnPercent).toBe(0);
      expect(result.isAtRisk).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateTm } from './tm.calculator.js';

describe('calculateTm', () => {
  describe('standard profitable T&M (AC2 — reference fixture)', () => {
    it('should return correct revenue, cost, profit, and margin for standard case', () => {
      // 1 employee: 160 billed hours @ ₹1,500/hr billing rate, cost ₹531.25/hr
      // revenue = 160 × 150000 = 24_000_000 paise
      // cost    = 160 × 53125  =  8_500_000 paise
      // profit  = 24_000_000 - 8_500_000 = 15_500_000 paise
      // margin  = 15_500_000 / 24_000_000 ≈ 0.6458333...
      const result = calculateTm({
        billedHours: 160,
        billingRatePaise: 150_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
      });

      expect(result.revenuePaise).toBe(24_000_000);
      expect(result.costPaise).toBe(8_500_000);
      expect(result.profitPaise).toBe(15_500_000);
      expect(result.marginPercent).toBeCloseTo(15_500_000 / 24_000_000, 10);
    });
  });

  describe('loss-making — cost > revenue (AC3)', () => {
    it('should return negative profit and negative margin when cost exceeds revenue', () => {
      // 1 employee: 80 billed hours @ ₹500/hr billing rate, cost ₹1,000/hr
      // revenue = 80 × 50000  = 4_000_000 paise
      // cost    = 80 × 100000 = 8_000_000 paise
      // profit  = 4_000_000 - 8_000_000 = -4_000_000 paise
      // margin  = -4_000_000 / 4_000_000 = -1.0
      const result = calculateTm({
        billedHours: 80,
        billingRatePaise: 50_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 100_000 }],
      });

      expect(result.revenuePaise).toBe(4_000_000);
      expect(result.costPaise).toBe(8_000_000);
      expect(result.profitPaise).toBe(-4_000_000);
      expect(result.marginPercent).toBe(-1);
    });
  });

  describe('zero hours — revenue = 0 (AC4)', () => {
    it('should return zero revenue and zero margin when billedHours = 0', () => {
      const result = calculateTm({
        billedHours: 0,
        billingRatePaise: 150_000,
        employeeCosts: [{ hours: 0, costPerHourPaise: 53_125 }],
      });

      expect(result.revenuePaise).toBe(0);
      expect(result.costPaise).toBe(0);
      expect(result.profitPaise).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    it('should return zero revenue when billingRatePaise = 0', () => {
      const result = calculateTm({
        billedHours: 160,
        billingRatePaise: 0,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
      });

      expect(result.revenuePaise).toBe(0);
      expect(result.costPaise).toBe(8_500_000);
      expect(result.profitPaise).toBe(-8_500_000);
      expect(result.marginPercent).toBe(0);
    });
  });

  describe('multiple employees with different cost rates (AC6)', () => {
    it('should sum costs across multiple employees correctly', () => {
      // Employee A: 120 hours @ ₹531.25/hr cost = 6_375_000
      // Employee B: 80 hours  @ ₹375.00/hr cost = 3_000_000
      // Total cost = 9_375_000
      // Total billed hours: 200 @ ₹1,500/hr = 30_000_000 revenue
      // profit = 30_000_000 - 9_375_000 = 20_625_000
      // margin = 20_625_000 / 30_000_000 = 0.6875
      const result = calculateTm({
        billedHours: 200,
        billingRatePaise: 150_000,
        employeeCosts: [
          { hours: 120, costPerHourPaise: 53_125 },
          { hours: 80, costPerHourPaise: 37_500 },
        ],
      });

      expect(result.revenuePaise).toBe(30_000_000);
      expect(result.costPaise).toBe(9_375_000);
      expect(result.profitPaise).toBe(20_625_000);
      expect(result.marginPercent).toBeCloseTo(0.6875, 10);
    });
  });

  describe('empty employeeCosts array', () => {
    it('should return zero cost and full profit when no employees assigned', () => {
      const result = calculateTm({
        billedHours: 160,
        billingRatePaise: 150_000,
        employeeCosts: [],
      });

      expect(result.revenuePaise).toBe(24_000_000);
      expect(result.costPaise).toBe(0);
      expect(result.profitPaise).toBe(24_000_000);
      expect(result.marginPercent).toBe(1);
    });
  });

  describe('output shape (AC1)', () => {
    it('should return all currency values as integers', () => {
      const result = calculateTm({
        billedHours: 160,
        billingRatePaise: 150_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
      });

      expect(Number.isInteger(result.revenuePaise)).toBe(true);
      expect(Number.isInteger(result.costPaise)).toBe(true);
      expect(Number.isInteger(result.profitPaise)).toBe(true);
      expect(typeof result.marginPercent).toBe('number');
    });

    it('should round to integer paise with fractional billed hours', () => {
      // 160.5 hours × 150_000 paise = 24_075_000 (exact)
      // employee: 160.5 hours × 53_125 paise = 8_526_562.5 → rounds to 8_526_563
      const result = calculateTm({
        billedHours: 160.5,
        billingRatePaise: 150_000,
        employeeCosts: [{ hours: 160.5, costPerHourPaise: 53_125 }],
      });

      expect(result.revenuePaise).toBe(24_075_000);
      expect(result.costPaise).toBe(8_526_563);
      expect(Number.isInteger(result.revenuePaise)).toBe(true);
      expect(Number.isInteger(result.costPaise)).toBe(true);
      expect(Number.isInteger(result.profitPaise)).toBe(true);
    });

    it('should return marginPercent as a decimal in 0-1 range for profitable case', () => {
      const result = calculateTm({
        billedHours: 160,
        billingRatePaise: 150_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
      });

      expect(result.marginPercent).toBeGreaterThanOrEqual(0);
      expect(result.marginPercent).toBeLessThanOrEqual(1);
    });
  });
});

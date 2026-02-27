import { describe, it, expect } from 'vitest';
import { calculateAmc } from './amc.calculator.js';

describe('calculateAmc', () => {
  describe('profitable AMC — single employee (AC2, AC3)', () => {
    it('should return correct revenue, cost, profit, and margin for profitable case', () => {
      // Contract: ₹1,00,000 = 10_000_000 paise
      // 1 employee: 20 hours @ ₹2,000/hr (200_000 paise)
      // revenue = 10_000_000 paise (contractValue)
      // cost    = 20 × 200_000 = 4_000_000 paise
      // profit  = 10_000_000 - 4_000_000 = 6_000_000 paise
      // margin  = 6_000_000 / 10_000_000 = 0.6
      const result = calculateAmc({
        contractValuePaise: 10_000_000,
        employeeCosts: [{ hours: 20, costPerHourPaise: 200_000 }],
      });

      expect(result.revenuePaise).toBe(10_000_000);
      expect(result.costPaise).toBe(4_000_000);
      expect(result.profitPaise).toBe(6_000_000);
      expect(result.marginPercent).toBeCloseTo(0.6, 10);
    });
  });

  describe('profitable AMC — multiple employees (AC2, AC3)', () => {
    it('should sum costs across 3 employees with different hours/rates', () => {
      // Contract: ₹2,00,000 = 20_000_000 paise
      // Employee A: 10 hours @ ₹500/hr (50_000 paise) = 500_000
      // Employee B: 20 hours @ ₹300/hr (30_000 paise) = 600_000
      // Employee C: 15 hours @ ₹400/hr (40_000 paise) = 600_000
      // total cost = 500_000 + 600_000 + 600_000 = 1_700_000 paise
      // revenue = 20_000_000 paise
      // profit  = 20_000_000 - 1_700_000 = 18_300_000 paise
      // margin  = 18_300_000 / 20_000_000 = 0.915
      const result = calculateAmc({
        contractValuePaise: 20_000_000,
        employeeCosts: [
          { hours: 10, costPerHourPaise: 50_000 },
          { hours: 20, costPerHourPaise: 30_000 },
          { hours: 15, costPerHourPaise: 40_000 },
        ],
      });

      expect(result.revenuePaise).toBe(20_000_000);
      expect(result.costPaise).toBe(1_700_000);
      expect(result.profitPaise).toBe(18_300_000);
      expect(result.marginPercent).toBeCloseTo(0.915, 10);
    });
  });

  describe('loss-making AMC — cost > contract (AC2)', () => {
    it('should return negative profit and negative margin when cost exceeds revenue', () => {
      // Contract: ₹50,000 = 5_000_000 paise
      // 1 employee: 40 hours @ ₹2,000/hr (200_000 paise)
      // revenue = 5_000_000 paise
      // cost    = 40 × 200_000 = 8_000_000 paise
      // profit  = 5_000_000 - 8_000_000 = -3_000_000 paise
      // margin  = -3_000_000 / 5_000_000 = -0.6
      const result = calculateAmc({
        contractValuePaise: 5_000_000,
        employeeCosts: [{ hours: 40, costPerHourPaise: 200_000 }],
      });

      expect(result.revenuePaise).toBe(5_000_000);
      expect(result.costPaise).toBe(8_000_000);
      expect(result.profitPaise).toBe(-3_000_000);
      expect(result.marginPercent).toBeCloseTo(-0.6, 10);
    });
  });

  describe('empty employeeCosts array — zero cost (AC2)', () => {
    it('should return zero cost and full profit when no employees assigned', () => {
      const result = calculateAmc({
        contractValuePaise: 10_000_000,
        employeeCosts: [],
      });

      expect(result.revenuePaise).toBe(10_000_000);
      expect(result.costPaise).toBe(0);
      expect(result.profitPaise).toBe(10_000_000);
      expect(result.marginPercent).toBe(1);
    });
  });

  describe('zero contract value — division by zero guard (AC2)', () => {
    it('should return zero margin when contractValuePaise is 0', () => {
      const result = calculateAmc({
        contractValuePaise: 0,
        employeeCosts: [{ hours: 10, costPerHourPaise: 200_000 }],
      });

      expect(result.revenuePaise).toBe(0);
      expect(result.costPaise).toBe(2_000_000);
      expect(result.profitPaise).toBe(-2_000_000);
      expect(result.marginPercent).toBe(0);
    });
  });

  describe('output shape and purity (AC7)', () => {
    it('should return all currency values as integers', () => {
      const result = calculateAmc({
        contractValuePaise: 10_000_000,
        employeeCosts: [{ hours: 20, costPerHourPaise: 200_000 }],
      });

      expect(Number.isInteger(result.revenuePaise)).toBe(true);
      expect(Number.isInteger(result.costPaise)).toBe(true);
      expect(Number.isInteger(result.profitPaise)).toBe(true);
      expect(typeof result.marginPercent).toBe('number');
    });
  });
});

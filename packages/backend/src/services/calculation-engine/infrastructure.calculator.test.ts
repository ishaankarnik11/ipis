import { describe, it, expect } from 'vitest';
import { calculateInfrastructure } from './infrastructure.calculator.js';

describe('calculateInfrastructure', () => {
  describe('SIMPLE mode — profitable (AC4, AC6)', () => {
    it('should return correct values when invoice > vendor + manpower', () => {
      // Invoice: ₹5,00,000 = 50_000_000 paise
      // Vendor:  ₹2,00,000 = 20_000_000 paise
      // Manpower: ₹1,00,000 = 10_000_000 paise
      // cost    = 20_000_000 + 10_000_000 = 30_000_000 paise
      // revenue = 50_000_000 paise
      // profit  = 50_000_000 - 30_000_000 = 20_000_000 paise
      // margin  = 20_000_000 / 50_000_000 = 0.4
      const result = calculateInfrastructure({
        mode: 'SIMPLE',
        infraInvoicePaise: 50_000_000,
        vendorCostPaise: 20_000_000,
        manpowerCostPaise: 10_000_000,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(30_000_000);
      expect(result.profitPaise).toBe(20_000_000);
      expect(result.marginPercent).toBeCloseTo(0.4, 10);
    });
  });

  describe('SIMPLE mode — loss-making (AC4, AC6)', () => {
    it('should return negative profit when vendor + manpower > invoice', () => {
      // Invoice: ₹1,00,000 = 10_000_000 paise
      // Vendor:  ₹8,00,000 = 80_000_000 paise
      // Manpower: ₹5,00,000 = 50_000_000 paise
      // cost    = 80_000_000 + 50_000_000 = 130_000_000 paise
      // revenue = 10_000_000 paise
      // profit  = 10_000_000 - 130_000_000 = -120_000_000 paise
      // margin  = -120_000_000 / 10_000_000 = -12.0
      const result = calculateInfrastructure({
        mode: 'SIMPLE',
        infraInvoicePaise: 10_000_000,
        vendorCostPaise: 80_000_000,
        manpowerCostPaise: 50_000_000,
      });

      expect(result.revenuePaise).toBe(10_000_000);
      expect(result.costPaise).toBe(130_000_000);
      expect(result.profitPaise).toBe(-120_000_000);
      expect(result.marginPercent).toBeCloseTo(-12.0, 10);
    });
  });

  describe('SIMPLE mode — zero vendor cost (AC4)', () => {
    it('should handle zero vendor cost correctly', () => {
      // Invoice: ₹5,00,000 = 50_000_000 paise
      // Vendor:  0 paise
      // Manpower: ₹1,00,000 = 10_000_000 paise
      // cost    = 0 + 10_000_000 = 10_000_000 paise
      // profit  = 50_000_000 - 10_000_000 = 40_000_000 paise
      // margin  = 40_000_000 / 50_000_000 = 0.8
      const result = calculateInfrastructure({
        mode: 'SIMPLE',
        infraInvoicePaise: 50_000_000,
        vendorCostPaise: 0,
        manpowerCostPaise: 10_000_000,
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(10_000_000);
      expect(result.profitPaise).toBe(40_000_000);
      expect(result.marginPercent).toBeCloseTo(0.8, 10);
    });
  });

  describe('DETAILED mode — profitable multi-employee (AC5, AC6)', () => {
    it('should sum vendor + employee costs using reduce pattern', () => {
      // Invoice: ₹10,00,000 = 100_000_000 paise
      // Vendor:  ₹2,00,000 = 20_000_000 paise
      // Employee A: 80 hours @ ₹531.25/hr (53_125 paise) = 4_250_000
      // Employee B: 40 hours @ ₹375.00/hr (37_500 paise) = 1_500_000
      // cost    = 20_000_000 + 4_250_000 + 1_500_000 = 25_750_000 paise
      // revenue = 100_000_000 paise
      // profit  = 100_000_000 - 25_750_000 = 74_250_000 paise
      // margin  = 74_250_000 / 100_000_000 = 0.7425
      const result = calculateInfrastructure({
        mode: 'DETAILED',
        infraInvoicePaise: 100_000_000,
        vendorCostPaise: 20_000_000,
        employeeCosts: [
          { hours: 80, costPerHourPaise: 53_125 },
          { hours: 40, costPerHourPaise: 37_500 },
        ],
      });

      expect(result.revenuePaise).toBe(100_000_000);
      expect(result.costPaise).toBe(25_750_000);
      expect(result.profitPaise).toBe(74_250_000);
      expect(result.marginPercent).toBeCloseTo(0.7425, 10);
    });
  });

  describe('DETAILED mode — loss-making (AC5, AC6)', () => {
    it('should return negative profit when vendor + employee costs > invoice', () => {
      // Invoice: ₹1,00,000 = 10_000_000 paise
      // Vendor:  ₹50,000 = 5_000_000 paise
      // Employee A: 160 hours @ ₹531.25/hr = 8_500_000
      // cost    = 5_000_000 + 8_500_000 = 13_500_000 paise
      // revenue = 10_000_000 paise
      // profit  = 10_000_000 - 13_500_000 = -3_500_000 paise
      // margin  = -3_500_000 / 10_000_000 = -0.35
      const result = calculateInfrastructure({
        mode: 'DETAILED',
        infraInvoicePaise: 10_000_000,
        vendorCostPaise: 5_000_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 53_125 }],
      });

      expect(result.revenuePaise).toBe(10_000_000);
      expect(result.costPaise).toBe(13_500_000);
      expect(result.profitPaise).toBe(-3_500_000);
      expect(result.marginPercent).toBeCloseTo(-0.35, 10);
    });
  });

  describe('DETAILED mode — empty employeeCosts array (AC5)', () => {
    it('should return only vendor cost when no employees assigned', () => {
      // Invoice: ₹5,00,000 = 50_000_000 paise
      // Vendor:  ₹2,00,000 = 20_000_000 paise
      // Employees: none
      // cost    = 20_000_000 + 0 = 20_000_000 paise
      // profit  = 50_000_000 - 20_000_000 = 30_000_000 paise
      // margin  = 30_000_000 / 50_000_000 = 0.6
      const result = calculateInfrastructure({
        mode: 'DETAILED',
        infraInvoicePaise: 50_000_000,
        vendorCostPaise: 20_000_000,
        employeeCosts: [],
      });

      expect(result.revenuePaise).toBe(50_000_000);
      expect(result.costPaise).toBe(20_000_000);
      expect(result.profitPaise).toBe(30_000_000);
      expect(result.marginPercent).toBeCloseTo(0.6, 10);
    });
  });

  describe('zero revenue — division by zero guard (AC4, AC5)', () => {
    it('should return zero margin for SIMPLE mode with zero invoice', () => {
      const result = calculateInfrastructure({
        mode: 'SIMPLE',
        infraInvoicePaise: 0,
        vendorCostPaise: 5_000_000,
        manpowerCostPaise: 3_000_000,
      });

      expect(result.revenuePaise).toBe(0);
      expect(result.costPaise).toBe(8_000_000);
      expect(result.profitPaise).toBe(-8_000_000);
      expect(result.marginPercent).toBe(0);
    });

    it('should return zero margin for DETAILED mode with zero invoice', () => {
      const result = calculateInfrastructure({
        mode: 'DETAILED',
        infraInvoicePaise: 0,
        vendorCostPaise: 5_000_000,
        employeeCosts: [{ hours: 10, costPerHourPaise: 50_000 }],
      });

      expect(result.revenuePaise).toBe(0);
      expect(result.costPaise).toBe(5_500_000);
      expect(result.profitPaise).toBe(-5_500_000);
      expect(result.marginPercent).toBe(0);
    });
  });

  describe('output shape and purity (AC7)', () => {
    it('should return all currency values as integers', () => {
      const result = calculateInfrastructure({
        mode: 'DETAILED',
        infraInvoicePaise: 100_000_000,
        vendorCostPaise: 20_000_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 53_125 }],
      });

      expect(Number.isInteger(result.revenuePaise)).toBe(true);
      expect(Number.isInteger(result.costPaise)).toBe(true);
      expect(Number.isInteger(result.profitPaise)).toBe(true);
      expect(typeof result.marginPercent).toBe('number');
    });
  });
});

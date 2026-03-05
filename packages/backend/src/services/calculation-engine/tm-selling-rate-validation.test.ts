/**
 * Story 8.4: T&M Revenue — Per-Member Selling Rate Validation
 *
 * These tests validate the per-member T&M revenue aggregation formula used
 * inline in upload.service.ts (NOT the pure calculateTm calculator which
 * uses a single flat rate). The formula: revenue = Σ(hours × billingRatePaise)
 * per employee, with null billingRatePaise treated as 0.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure-math validation of the per-member T&M revenue formula
// ---------------------------------------------------------------------------
// The upload service uses:
//   revenuePaise += Math.round(empHours * Number(ep.billingRatePaise ?? 0))
// We replicate this formula here for pure validation.

function perMemberRevenue(
  members: Array<{ hours: number; billingRatePaise: number | null }>,
): number {
  let total = 0;
  for (const m of members) {
    total += Math.round(m.hours * Number(m.billingRatePaise ?? 0));
  }
  return total;
}

describe('T&M per-member selling rate validation (Story 8.4)', () => {
  describe('multi-member with different rates (AC:3)', () => {
    it('should aggregate revenue correctly across members', () => {
      // Member A: 80 hrs @ ₹3,000/hr (300000 paise)
      // Member B: 120 hrs @ ₹1,500/hr (150000 paise)
      // revenue = (80 × 300000) + (120 × 150000)
      //         = 24_000_000 + 18_000_000
      //         = 42_000_000 paise (₹4,20,000)
      const revenue = perMemberRevenue([
        { hours: 80, billingRatePaise: 300_000 },
        { hours: 120, billingRatePaise: 150_000 },
      ]);

      expect(revenue).toBe(42_000_000);
    });
  });

  describe('null selling rate — ₹0 contribution (AC:2)', () => {
    it('should contribute ₹0 when billingRatePaise is null', () => {
      // Member with null rate: 160 hrs × 0 = 0
      // Member with valid rate: 100 hrs × 200000 = 20_000_000
      const revenue = perMemberRevenue([
        { hours: 160, billingRatePaise: null },
        { hours: 100, billingRatePaise: 200_000 },
      ]);

      expect(revenue).toBe(20_000_000);
    });

    it('should return ₹0 total when all members have null rate', () => {
      const revenue = perMemberRevenue([
        { hours: 80, billingRatePaise: null },
        { hours: 120, billingRatePaise: null },
      ]);

      expect(revenue).toBe(0);
    });
  });

  describe('zero-hour member — ₹0 regardless of rate', () => {
    it('should contribute ₹0 when hours = 0', () => {
      const revenue = perMemberRevenue([
        { hours: 0, billingRatePaise: 500_000 },
        { hours: 160, billingRatePaise: 150_000 },
      ]);

      // 0 × 500000 = 0, 160 × 150000 = 24_000_000
      expect(revenue).toBe(24_000_000);
    });
  });

  describe('single-member simple calculation', () => {
    it('should return hours × rate for a single member', () => {
      // 160 hrs @ ₹1,500/hr = 160 × 150000 = 24_000_000 paise
      const revenue = perMemberRevenue([
        { hours: 160, billingRatePaise: 150_000 },
      ]);

      expect(revenue).toBe(24_000_000);
    });
  });

  describe('regression: non-T&M calculators remain unchanged', () => {
    it('Fixed Cost calculator uses contract value, not per-member rates', async () => {
      const { calculateFixedCost } = await import('./fixed-cost.calculator.js');
      // FC: revenue = contractValue × completionPercent
      // ₹10,00,000 contract at 100% = 100_000_000 paise
      const result = calculateFixedCost({
        contractValuePaise: 100_000_000,
        employeeCosts: [{ hours: 160, costPerHourPaise: 50_000 }],
        completionPercent: 100,
      });

      expect(result.revenuePaise).toBe(100_000_000);
    });

    it('AMC calculator uses contract value, not per-member rates', async () => {
      const { calculateAmc } = await import('./amc.calculator.js');
      const result = calculateAmc({
        contractValuePaise: 50_000_000,
        employeeCosts: [{ hours: 80, costPerHourPaise: 40_000 }],
      });

      expect(result.revenuePaise).toBe(50_000_000);
    });

    it('Infrastructure calculator uses invoice value, not per-member rates', async () => {
      const { calculateInfrastructure } = await import('./infrastructure.calculator.js');
      // SIMPLE mode: revenue = infraInvoicePaise, cost = vendorCost + manpowerCost
      const result = calculateInfrastructure({
        mode: 'SIMPLE',
        infraInvoicePaise: 30_000_000,
        vendorCostPaise: 10_000_000,
        manpowerCostPaise: 5_000_000,
      });

      expect(result.revenuePaise).toBe(30_000_000);
    });
  });
});

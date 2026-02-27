import type { TmInput, TmResult } from './types.js';

/**
 * Pure T&M profitability calculator. No input validation — callers must ensure
 * inputs are finite non-NaN numbers. Validation is enforced at the API layer.
 */
export function calculateTm({ billedHours, billingRatePaise, employeeCosts }: TmInput): TmResult {
  const revenuePaise = Math.round(billedHours * billingRatePaise);

  const costPaise = employeeCosts.reduce(
    (sum, emp) => sum + Math.round(emp.hours * emp.costPerHourPaise),
    0,
  );

  const profitPaise = revenuePaise - costPaise;

  // Handle division by zero: if revenue = 0, margin = 0
  const marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;

  return { revenuePaise, costPaise, profitPaise, marginPercent };
}

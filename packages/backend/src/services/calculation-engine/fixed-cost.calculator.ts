import type { FixedCostInput, FixedCostResult } from './types.js';

/**
 * Pure fixed-cost profitability calculator with burn tracking and at-risk detection.
 * No input validation — callers must ensure inputs are finite non-NaN numbers.
 * Validation is enforced at the API layer.
 */
export function calculateFixedCost({
  contractValuePaise,
  employeeCosts,
  completionPercent,
}: FixedCostInput): FixedCostResult {
  const revenuePaise = contractValuePaise;

  const costPaise = employeeCosts.reduce(
    (sum, emp) => sum + Math.round(emp.hours * emp.costPerHourPaise),
    0,
  );

  const profitPaise = revenuePaise - costPaise;

  // Handle division by zero: if revenue = 0, margin and burn = 0
  const marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;

  const burnPercent = revenuePaise === 0 ? 0 : costPaise / revenuePaise;

  // Unknown completion (null) → cannot determine risk, default to false (AC4)
  // Known completion → isAtRisk = burn > completion (AC3)
  const isAtRisk = completionPercent == null ? false : burnPercent > completionPercent;

  return { revenuePaise, costPaise, profitPaise, marginPercent, burnPercent, isAtRisk };
}

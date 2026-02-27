import type { FixedCostInput, FixedCostResult } from './types.js';

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

  const marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;

  const burnPercent = revenuePaise === 0 ? 0 : costPaise / revenuePaise;

  // Treat null/undefined completion as 0; isAtRisk defaults to false when completion is unknown
  const safeCompletion = completionPercent ?? 0;
  const isAtRisk =
    safeCompletion === 0 ? false : burnPercent > safeCompletion;

  return { revenuePaise, costPaise, profitPaise, marginPercent, burnPercent, isAtRisk };
}

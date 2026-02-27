import type { AmcInput, AmcResult } from './types.js';

export function calculateAmc({
  contractValuePaise,
  employeeCosts,
}: AmcInput): AmcResult {
  const revenuePaise = contractValuePaise;

  const costPaise = employeeCosts.reduce(
    (sum, emp) => sum + Math.round(emp.hours * emp.costPerHourPaise),
    0,
  );

  const profitPaise = revenuePaise - costPaise;

  const marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;

  return { revenuePaise, costPaise, profitPaise, marginPercent };
}

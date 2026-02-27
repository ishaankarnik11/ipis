import type { InfrastructureInput, InfrastructureResult } from './types.js';

/**
 * Pure infrastructure profitability calculator with SIMPLE/DETAILED cost modes.
 * No input validation — callers must ensure inputs are finite non-NaN numbers.
 * Validation is enforced at the API layer.
 */
export function calculateInfrastructure(input: InfrastructureInput): InfrastructureResult {
  const revenuePaise = input.infraInvoicePaise;

  let costPaise: number;

  switch (input.mode) {
    case 'SIMPLE':
      costPaise = input.vendorCostPaise + input.manpowerCostPaise;
      break;
    case 'DETAILED':
      costPaise =
        input.vendorCostPaise +
        input.employeeCosts.reduce(
          (sum, emp) => sum + Math.round(emp.hours * emp.costPerHourPaise),
          0,
        );
      break;
    default: {
      const _exhaustive: never = input;
      throw new Error(`Unknown infrastructure mode: ${(_exhaustive as { mode: string }).mode}`);
    }
  }

  const profitPaise = revenuePaise - costPaise;

  const marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;

  return { revenuePaise, costPaise, profitPaise, marginPercent };
}

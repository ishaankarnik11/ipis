import type { CostRateInput } from './types.js';

export function calculateCostPerHour({
  annualCtcPaise,
  overheadPaise,
  standardMonthlyHours,
}: CostRateInput): number {
  if (!Number.isFinite(annualCtcPaise) || annualCtcPaise < 0) {
    throw new RangeError('annualCtcPaise must be a non-negative finite number');
  }
  if (!Number.isFinite(overheadPaise) || overheadPaise < 0) {
    throw new RangeError('overheadPaise must be a non-negative finite number');
  }
  if (!Number.isFinite(standardMonthlyHours) || standardMonthlyHours <= 0) {
    throw new RangeError('standardMonthlyHours must be greater than zero');
  }

  return Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours);
}

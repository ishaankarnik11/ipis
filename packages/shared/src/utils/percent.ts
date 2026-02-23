/**
 * Converts a decimal value (0-1 range) to a percentage string with one decimal place.
 * @param decimal - Decimal value (e.g., 0.871)
 * @returns Formatted percentage string (e.g., "87.1%")
 */
export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Converts integer paise to formatted Indian rupee string.
 * @param paise - Amount in integer paise (e.g., 8400000 = ₹84,000)
 * @returns Formatted rupee string with Indian grouping (e.g., "₹84,000")
 */
export function formatCurrency(paise: number): string {
  return currencyFormatter.format(paise / 100);
}

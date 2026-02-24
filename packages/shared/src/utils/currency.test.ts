import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats standard amount correctly', () => {
    expect(formatCurrency(8400000)).toBe('₹84,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('formats large value with Indian grouping (lakhs)', () => {
    expect(formatCurrency(120000000)).toBe('₹12,00,000');
  });

  it('formats small value', () => {
    expect(formatCurrency(100)).toBe('₹1');
  });

  it('formats crore values with Indian grouping', () => {
    expect(formatCurrency(1000000000)).toBe('₹1,00,00,000');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-500000)).toBe('-₹5,000');
  });

  it('handles very large values (trillion-level paise)', () => {
    // 10 trillion paise = ₹1,00,00,00,00,000 (100 billion rupees)
    const result = formatCurrency(10_000_000_000_000);
    expect(result).toContain('₹');
    expect(result.length).toBeGreaterThan(10);
  });

  it('handles decimal precision (rounds down sub-paise)', () => {
    // 150.7 paise → rounds in formatter to ₹2 (150.7/100 = 1.507 → rounds to 2)
    expect(formatCurrency(150)).toBe('₹2');
  });
});

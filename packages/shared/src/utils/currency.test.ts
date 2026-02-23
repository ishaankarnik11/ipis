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
});

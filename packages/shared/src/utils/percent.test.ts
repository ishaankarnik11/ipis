import { describe, it, expect } from 'vitest';
import { formatPercent } from './percent';

describe('formatPercent', () => {
  it('formats standard decimal correctly', () => {
    expect(formatPercent(0.871)).toBe('87.1%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('formats negative percentage', () => {
    expect(formatPercent(-0.05)).toBe('-5.0%');
  });

  it('formats small percentage', () => {
    expect(formatPercent(0.003)).toBe('0.3%');
  });

  it('formats percentage above 100%', () => {
    expect(formatPercent(1.5)).toBe('150.0%');
  });

  it('handles very large decimal values', () => {
    expect(formatPercent(100)).toBe('10000.0%');
  });

  it('handles very small negative values', () => {
    expect(formatPercent(-0.001)).toBe('-0.1%');
  });
});

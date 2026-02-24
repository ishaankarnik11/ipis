import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configKeys, getConfig, updateConfig } from './config.api';
import * as api from './api';

vi.mock('./api', () => ({
  get: vi.fn(),
  put: vi.fn(),
}));

const mockGet = vi.mocked(api.get);
const mockPut = vi.mocked(api.put);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('configKeys', () => {
  it('defines query key constants', () => {
    expect(configKeys.current).toEqual(['config']);
  });
});

describe('getConfig', () => {
  it('calls GET /config and returns data', async () => {
    const response = {
      data: { standardMonthlyHours: 160, healthyMarginThreshold: 0.2, atRiskMarginThreshold: 0.05 },
    };
    mockGet.mockResolvedValue(response);

    const result = await getConfig();

    expect(mockGet).toHaveBeenCalledWith('/config');
    expect(result).toEqual(response);
  });
});

describe('updateConfig', () => {
  it('calls PUT /config with body and returns success', async () => {
    const input = { standardMonthlyHours: 176 };
    const response = { success: true };
    mockPut.mockResolvedValue(response);

    const result = await updateConfig(input);

    expect(mockPut).toHaveBeenCalledWith('/config', input);
    expect(result).toEqual(response);
  });
});

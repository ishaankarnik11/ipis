import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    systemConfig: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';
import * as configService from './config.service.js';

const mockFindFirst = prisma.systemConfig.findFirst as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.systemConfig.upsert as ReturnType<typeof vi.fn>;

describe('config.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config with camelCase fields', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'cfg-1',
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
        updatedAt: new Date(),
      });

      const result = await configService.getConfig();

      expect(result).toEqual({
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
      });
    });

    it('should return defaults when no config exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await configService.getConfig();

      expect(result).toEqual({
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
      });
    });
  });

  describe('updateConfig', () => {
    it('should upsert config with provided fields', async () => {
      mockUpsert.mockResolvedValue({
        id: 'cfg-1',
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
        updatedAt: new Date(),
      });

      await configService.updateConfig({ standardMonthlyHours: 176 });

      expect(mockUpsert).toHaveBeenCalledOnce();
      const upsertArg = mockUpsert.mock.calls[0][0];
      expect(upsertArg.update).toEqual({ standardMonthlyHours: 176 });
    });

    it('should update multiple config fields at once', async () => {
      mockUpsert.mockResolvedValue({
        id: 'cfg-1',
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
        updatedAt: new Date(),
      });

      await configService.updateConfig({
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
      });

      const upsertArg = mockUpsert.mock.calls[0][0];
      expect(upsertArg.update).toEqual({
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
      });
    });
  });
});

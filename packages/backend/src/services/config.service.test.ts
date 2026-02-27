import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, disconnectTestDb } from '../test-utils/db.js';
import * as configService from './config.service.js';

describe('config.service', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('getConfig', () => {
    it('should return defaults when no config exists', async () => {
      const result = await configService.getConfig();

      expect(result).toEqual({
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
      });
    });

    it('should return config with camelCase fields', async () => {
      // Seed a config row
      await prisma.systemConfig.create({
        data: {
          id: 'default',
          standardMonthlyHours: 176,
          healthyMarginThreshold: 0.25,
          atRiskMarginThreshold: 0.1,
        },
      });

      const result = await configService.getConfig();

      expect(result).toEqual({
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
      });
    });
  });

  describe('updateConfig', () => {
    it('should upsert config with provided fields', async () => {
      await configService.updateConfig({ standardMonthlyHours: 176 });

      const config = await prisma.systemConfig.findUnique({ where: { id: 'default' } });
      expect(config).not.toBeNull();
      expect(config!.standardMonthlyHours).toBe(176);
    });

    it('should update multiple config fields at once', async () => {
      await configService.updateConfig({
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
      });

      const result = await configService.getConfig();
      expect(result).toEqual({
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.25,
        atRiskMarginThreshold: 0.1,
      });
    });
  });
});

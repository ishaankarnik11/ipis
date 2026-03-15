import { AUDIT_ACTIONS } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { logAuditEvent } from './audit.service.js';
import { triggerRecalculationForLatestPeriod } from './upload.service.js';

const DEFAULTS = {
  standardMonthlyHours: 160,
  healthyMarginThreshold: 0.2,
  atRiskMarginThreshold: 0.05,
  annualOverheadPerEmployee: 18000000,
};

export async function getConfig() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 'default' } });

  if (!config) {
    return { ...DEFAULTS };
  }

  return {
    standardMonthlyHours: config.standardMonthlyHours,
    healthyMarginThreshold: Number(config.healthyMarginThreshold),
    atRiskMarginThreshold: Number(config.atRiskMarginThreshold),
    annualOverheadPerEmployee: Number(config.annualOverheadPerEmployee),
  };
}

export async function updateConfig(
  data: {
    standardMonthlyHours?: number;
    healthyMarginThreshold?: number;
    atRiskMarginThreshold?: number;
    annualOverheadPerEmployee?: number;
  },
  actorId?: string,
  ipAddress?: string,
) {
  // Convert annualOverheadPerEmployee to BigInt for Prisma
  const prismaData: Record<string, unknown> = { ...data };
  if (data.annualOverheadPerEmployee !== undefined) {
    prismaData.annualOverheadPerEmployee = BigInt(data.annualOverheadPerEmployee);
  }
  const prismaDefaults: Record<string, unknown> = { ...DEFAULTS };
  prismaDefaults.annualOverheadPerEmployee = BigInt(DEFAULTS.annualOverheadPerEmployee);

  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: prismaData,
    create: {
      id: 'default',
      ...prismaDefaults,
      ...prismaData,
    },
  });

  void logAuditEvent({
    actorId: actorId ?? null,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    entityType: 'SystemConfig',
    entityId: 'default',
    ipAddress: ipAddress ?? null,
    metadata: { updatedFields: data },
  });

  // Trigger full recalculation when config affects calculations
  const configAffectsCalc = data.standardMonthlyHours !== undefined || data.annualOverheadPerEmployee !== undefined;
  if (configAffectsCalc) {
    try {
      const result = await triggerRecalculationForLatestPeriod();
      logger.info({ result }, 'Config change triggered recalculation');
      return { recalculation: result };
    } catch (err) {
      logger.error({ err }, 'Failed to trigger recalculation after config update');
      return { recalculation: { status: 'FAILED', error: 'Recalculation failed' } };
    }
  }
  return {};
}

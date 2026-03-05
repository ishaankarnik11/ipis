import { AUDIT_ACTIONS } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { logAuditEvent } from './audit.service.js';

const DEFAULTS = {
  standardMonthlyHours: 160,
  healthyMarginThreshold: 0.2,
  atRiskMarginThreshold: 0.05,
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
  };
}

export async function updateConfig(
  data: {
    standardMonthlyHours?: number;
    healthyMarginThreshold?: number;
    atRiskMarginThreshold?: number;
  },
  actorId?: string,
  ipAddress?: string,
) {
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: data,
    create: {
      id: 'default',
      ...DEFAULTS,
      ...data,
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
}

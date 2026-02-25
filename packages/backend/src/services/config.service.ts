import { prisma } from '../lib/prisma.js';

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

export async function updateConfig(data: {
  standardMonthlyHours?: number;
  healthyMarginThreshold?: number;
  atRiskMarginThreshold?: number;
}) {
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: data,
    create: {
      id: 'default',
      ...DEFAULTS,
      ...data,
    },
  });
}

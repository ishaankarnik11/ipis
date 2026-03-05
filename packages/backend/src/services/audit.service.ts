import { Prisma } from '@prisma/client';
import type { AuditAction } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditLogFilters {
  actions?: string[];
  startDate?: string;
  endDate?: string;
  actorEmail?: string;
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
}

export async function getAuditLog(
  filters: AuditLogFilters,
  pagination: AuditLogPagination,
) {
  const where: Prisma.AuditEventWhereInput = {};

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions };
  }

  if (filters.startDate || filters.endDate) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.startDate) createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setUTCHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  if (filters.actorEmail) {
    where.actor = {
      email: { contains: filters.actorEmail, mode: 'insensitive' },
    };
  }

  const [data, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
        actor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  const rows = data.map(({ actor, ...rest }) => ({
    ...rest,
    actorName: actor?.name ?? null,
    actorEmail: actor?.email ?? null,
  }));

  return { data: rows, meta: { total, page: pagination.page, pageSize: pagination.pageSize } };
}

export interface LogAuditEventInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    logger.error({ err: error, auditAction: input.action }, 'Audit event write failed');
  }
}

import { prisma } from '../lib/prisma.js';

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
  const where: Record<string, unknown> = {};

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions };
  }

  if (filters.startDate || filters.endDate) {
    const createdAt: Record<string, Date> = {};
    if (filters.startDate) createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) createdAt.lte = new Date(filters.endDate);
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

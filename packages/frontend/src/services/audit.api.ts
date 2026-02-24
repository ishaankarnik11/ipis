import { get } from './api';
import type { ListResponse } from './types';

export const auditKeys = {
  all: ['audit-log'] as const,
  list: (filters: AuditLogParams) =>
    ['audit-log', filters] as const,
};

export interface AuditEvent {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  actions?: string[];
  startDate?: string;
  endDate?: string;
  actorEmail?: string;
}

export function getAuditLog(params: AuditLogParams): Promise<ListResponse<AuditEvent>> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null) searchParams.set('pageSize', String(params.pageSize));
  if (params.actions && params.actions.length > 0) {
    searchParams.set('actions', params.actions.join(','));
  }
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.actorEmail) searchParams.set('actorEmail', params.actorEmail);

  const qs = searchParams.toString();
  return get<ListResponse<AuditEvent>>(`/audit-log${qs ? `?${qs}` : ''}`);
}

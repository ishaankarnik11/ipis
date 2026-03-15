import { prisma } from '../lib/prisma.js';
import { GoneError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import * as dashboardService from './dashboard.service.js';
import type { ReportType } from '@ipis/shared';
import { AUDIT_ACTIONS } from '@ipis/shared';
import { logAuditEvent } from './audit.service.js';

interface RequestUser {
  id: string;
  role: string;
  email: string;
}

interface ShareLinkResult {
  token: string;
  shareUrl: string;
  expiresAt: string;
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Fetches the current dashboard data for the given report type to use as snapshot.
 * Filters to the specific entity (entityId) when not the NIL UUID.
 */
async function fetchSnapshotData(
  reportType: ReportType,
  entityId: string,
  user: RequestUser,
): Promise<unknown> {
  switch (reportType) {
    case 'project': {
      const allProjects = await dashboardService.getProjectDashboard(user, {});
      // If entityId is a specific project (not NIL), filter to just that project
      if (entityId && entityId !== NIL_UUID) {
        const filtered = allProjects.filter((p: { projectId: string }) => p.projectId === entityId);
        return filtered;
      }
      return allProjects;
    }
    case 'executive':
      return dashboardService.getExecutiveDashboard();
    case 'company':
      return dashboardService.getCompanyDashboard();
    case 'department':
      return dashboardService.getDepartmentDashboard(user);
    case 'employee':
      return dashboardService.getEmployeeDashboard(user, {});
    case 'employee-detail':
      return dashboardService.getEmployeeDetail(user, entityId);
    default:
      throw new NotFoundError(`Unknown report type: ${reportType}`);
  }
}

/**
 * Creates a shareable link for a report snapshot.
 */
export async function createShareLink(
  reportType: ReportType,
  entityId: string,
  period: string,
  user: RequestUser,
  ipAddress?: string,
): Promise<ShareLinkResult> {
  const [yearStr, monthStr] = period.split('-');
  const periodYear = parseInt(yearStr, 10);
  const periodMonth = parseInt(monthStr, 10);

  if (isNaN(periodYear) || isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    throw new ValidationError('Period must be in YYYY-MM format with month 1-12');
  }

  logger.info({ reportType, entityId, period, userId: user.id }, 'Creating share link');

  // Fetch current report data as snapshot
  const snapshotData = await fetchSnapshotData(reportType, entityId, user);

  if (snapshotData == null) {
    throw new NotFoundError('No report data available for this period');
  }

  // Set expiry to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const token = await prisma.sharedReportToken.create({
    data: {
      createdById: user.id,
      reportType,
      entityId,
      periodMonth,
      periodYear,
      snapshotData: snapshotData as object,
      expiresAt,
    },
  });

  logAuditEvent({
    actorId: user.id,
    action: AUDIT_ACTIONS.SHARE_LINK_CREATED,
    entityType: 'SharedReportToken',
    entityId: token.id,
    ipAddress: ipAddress ?? null,
    metadata: { reportType, entityId, period },
  }).catch((err) => logger.warn({ err }, 'Failed to log share link audit event'));

  logger.info({ tokenId: token.id, expiresAt: token.expiresAt }, 'Share link created');

  return {
    token: token.id,
    shareUrl: `/reports/shared/${token.id}`,
    expiresAt: token.expiresAt.toISOString(),
  };
}

/**
 * Retrieves a shared report by token. Public — no auth required.
 */
export async function getSharedReport(tokenId: string): Promise<{
  snapshotData: unknown;
  reportType: string;
  createdAt: string;
  expiresAt: string;
}> {
  const token = await prisma.sharedReportToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw new NotFoundError('Share link not found');
  }

  if (token.revokedAt) {
    throw new GoneError('This share link has been revoked', 'LINK_REVOKED');
  }

  if (token.expiresAt < new Date()) {
    throw new GoneError('This share link has expired', 'LINK_EXPIRED');
  }

  return {
    snapshotData: token.snapshotData,
    reportType: token.reportType,
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt.toISOString(),
  };
}

/**
 * Revokes a share link (Admin only — enforced at route level).
 */
export async function revokeShareLink(tokenId: string, actorId?: string, ipAddress?: string): Promise<void> {
  const token = await prisma.sharedReportToken.findUnique({
    where: { id: tokenId },
    select: { id: true },
  });

  if (!token) {
    throw new NotFoundError('Share link not found');
  }

  await prisma.sharedReportToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });

  logAuditEvent({
    actorId: actorId ?? null,
    action: AUDIT_ACTIONS.SHARE_LINK_REVOKED,
    entityType: 'SharedReportToken',
    entityId: tokenId,
    ipAddress: ipAddress ?? null,
    metadata: { tokenId },
  }).catch((err) => logger.warn({ err }, 'Failed to log share link revoke audit event'));

  logger.info({ tokenId }, 'Share link revoked');
}

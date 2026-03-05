import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { ForbiddenError } from '../lib/errors.js';
import { signInternalToken } from '../lib/jwt.js';
import { generatePdf } from '../lib/pdf.js';
import { logger } from '../lib/logger.js';
import type { ReportType } from '@ipis/shared';

interface RequestUser {
  id: string;
  role: string;
  email: string;
}

interface PdfExportResult {
  buffer: Buffer;
  filename: string;
}

function buildReportUrl(reportType: ReportType, entityId: string, period: string): string {
  const base = config.frontendUrl;

  let url: string;
  switch (reportType) {
    case 'project':
      url = `${base}/dashboards/projects?project=${entityId}`;
      break;
    case 'executive':
      url = `${base}/dashboards/executive`;
      break;
    case 'company':
      url = `${base}/dashboards/company`;
      break;
    case 'department':
      url = `${base}/dashboards/department`;
      break;
    case 'employee':
      url = `${base}/dashboards/employees`;
      break;
    case 'employee-detail':
      url = `${base}/dashboards/employees/${entityId}`;
      break;
    default: {
      const _exhaustive: never = reportType;
      throw new Error(`Unsupported report type: ${_exhaustive}`);
    }
  }

  // Append period as query param so Puppeteer renders the correct time period
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}period=${period}`;
}

export async function exportPdf(
  reportType: ReportType,
  entityId: string,
  period: string,
  user: RequestUser,
): Promise<PdfExportResult> {
  // RBAC: DM can only export reports for their own projects (AC5)
  if (user.role === 'DELIVERY_MANAGER') {
    if (reportType !== 'project') {
      throw new ForbiddenError('Delivery Managers can only export their own project reports');
    }
    const project = await prisma.project.findUnique({
      where: { id: entityId },
      select: { deliveryManagerId: true },
    });
    if (!project || project.deliveryManagerId !== user.id) {
      throw new ForbiddenError('You can only export reports for projects you manage');
    }
  }

  logger.info({ reportType, entityId, period, userId: user.id }, 'Starting PDF export');

  // Generate internal service token for Puppeteer navigation
  const token = await signInternalToken();

  // Build the target URL and render PDF
  const url = buildReportUrl(reportType, entityId, period);
  const buffer = await generatePdf(url, token);

  // Build filename: IPIS-[type]-[id]-[period].pdf
  const filename = `IPIS-${reportType}-${entityId}-${period}.pdf`;

  return { buffer, filename };
}

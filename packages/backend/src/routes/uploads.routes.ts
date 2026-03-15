import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { generateErrorReport, generateUploadTemplate, UPLOAD_TEMPLATES, type TemplateType } from '../lib/excel.js';
import { uploadEvents, type UploadSSEEvent } from '../lib/sse.js';
import * as uploadService from '../services/upload.service.js';

const router: RouterType = Router();

// GET /api/v1/uploads/templates/:type — Download upload template (Finance, HR, Admin, DM)
router.get(
  '/templates/:type',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const type = req.params.type as string;
    if (!UPLOAD_TEMPLATES[type as TemplateType]) {
      throw new NotFoundError(`Unknown template type: ${type}. Valid types: ${Object.keys(UPLOAD_TEMPLATES).join(', ')}`);
    }
    const templateType = type as TemplateType;
    const def = UPLOAD_TEMPLATES[templateType];
    const buffer = generateUploadTemplate(templateType);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${def.filename}"`);
    res.send(buffer);
  }),
);

// GET /api/v1/uploads/history — Paginated upload event history (Finance, HR, Admin, DM)
router.get(
  '/history',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    // Role-based type filter: each role sees only their permitted upload types
    // ADMIN sees all (undefined = no filter), other roles see specific types
    const roleTypeFilter: Record<string, Array<'TIMESHEET' | 'BILLING' | 'SALARY'> | undefined> = {
      ADMIN: undefined,
      FINANCE: ['TIMESHEET', 'BILLING'],
      HR: ['SALARY'],
      DELIVERY_MANAGER: ['TIMESHEET'],
      DEPT_HEAD: undefined,
    };
    const allowedTypes = roleTypeFilter[req.user!.role];
    const mine = req.query.mine === 'true';
    const where = {
      ...(allowedTypes ? { type: { in: allowedTypes } } : {}),
      ...(mine ? { uploadedBy: req.user!.id } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.uploadEvent.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          periodMonth: true,
          periodYear: true,
          rowCount: true,
          replacedRowsCount: true,
          createdAt: true,
          uploader: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.uploadEvent.count({ where }),
    ]);

    const rows = data.map(({ uploader, ...rest }) => ({
      ...rest,
      uploaderName: uploader.name,
    }));

    res.json({ data: rows, meta: { total, page, pageSize } });
  }),
);

// GET /api/v1/uploads/latest-by-type — Latest successful upload per type (all authenticated)
router.get(
  '/latest-by-type',
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const types = ['TIMESHEET', 'BILLING', 'SALARY'] as const;
    const results = await Promise.all(
      types.map((type) =>
        prisma.uploadEvent.findFirst({
          where: { type, status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          select: { type: true, periodMonth: true, periodYear: true, createdAt: true },
        }),
      ),
    );
    res.json({ data: results.filter(Boolean) });
  }),
);

// POST /api/v1/uploads/timesheets — Upload timesheet Excel file (Finance, Admin, DM)
router.post(
  '/timesheets',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER']),
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    const result = await uploadService.processTimesheetUpload(
      req.file.buffer,
      req.user!,
      req.ip,
    );
    res.json({ data: result });
  }),
);

// POST /api/v1/uploads/billing — Upload billing/revenue Excel file (Finance, Admin)
router.post(
  '/billing',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    const result = await uploadService.processBillingUpload(
      req.file.buffer,
      req.user!,
      req.ip,
    );
    res.json({ data: result });
  }),
);

// POST /api/v1/uploads/salary — Upload salary/employee master Excel file (HR, Admin)
router.post(
  '/salary',
  authMiddleware,
  rbacMiddleware(['HR', 'ADMIN']),
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    const modeParam = typeof req.query.mode === 'string' ? req.query.mode : 'full';
    const mode = modeParam === 'correction' ? 'correction' : 'full';
    const result = await uploadService.processSalaryUpload(
      req.file.buffer,
      req.user!,
      mode,
      req.ip,
    );
    res.json({ data: result });
  }),
);

// GET /api/v1/uploads/:uploadEventId/error-report — Download XLSX error report (Finance, HR, Admin, DM)
router.get(
  '/:uploadEventId/error-report',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const eventId = req.params.uploadEventId as string;
    const uploadEvent = await prisma.uploadEvent.findUnique({
      where: { id: eventId },
    });

    if (!uploadEvent) {
      throw new NotFoundError('Upload event not found');
    }

    if (uploadEvent.uploadedBy !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('You can only download error reports for your own uploads');
    }

    if (!uploadEvent.errorSummary) {
      throw new ValidationError('No error report available for this upload');
    }

    // errorSummary structure varies by upload type — normalize for error report
    const rawErrors = uploadEvent.errorSummary as unknown[];
    const failedRows = (Array.isArray(rawErrors) ? rawErrors : []).map((entry) => {
      const obj = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;
      return {
        row: typeof obj.row === 'number' ? obj.row : 0,
        employeeCode: typeof obj.employeeCode === 'string' ? obj.employeeCode : '',
        error: typeof obj.error === 'string' ? obj.error
          : typeof obj.message === 'string' ? obj.message
          : 'Unknown error',
      };
    });
    const buffer = generateErrorReport(failedRows);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="error-report-${eventId}.xlsx"`,
    );
    res.send(buffer);
  }),
);

// GET /api/v1/uploads/:id/records — Upload record detail view (Finance, HR, Admin, DM)
router.get(
  '/:id/records',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const statusFilter = (req.query.status as string) ?? 'all';
    if (!['all', 'success', 'failed'].includes(statusFilter)) {
      throw new ValidationError('status must be one of: all, success, failed');
    }
    const { records, uploadType } = await uploadService.getUploadRecords(
      req.params.id as string,
      statusFilter as 'all' | 'success' | 'failed',
    );
    res.json({ data: records, meta: { total: records.length, uploadType } });
  }),
);

// GET /api/v1/uploads/:id/records/download — Download upload records as XLSX (Finance, HR, Admin, DM)
router.get(
  '/:id/records/download',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const statusFilter = (req.query.status as string) ?? 'all';
    if (!['all', 'success', 'failed'].includes(statusFilter)) {
      throw new ValidationError('status must be one of: all, success, failed');
    }
    const { records, uploadType } = await uploadService.getUploadRecords(
      req.params.id as string,
      statusFilter as 'all' | 'success' | 'failed',
    );
    const buffer = uploadService.generateUploadRecordsExport(records, uploadType);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="upload-records-${req.params.id}.xlsx"`,
    );
    res.send(buffer);
  }),
);

// GET /api/v1/uploads/progress/:uploadEventId — SSE endpoint for upload progress (Finance, Admin, DM)
router.get(
  '/progress/:uploadEventId',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const eventId = req.params.uploadEventId as string;

    // Validate that the upload event exists before subscribing
    const uploadEvent = await prisma.uploadEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!uploadEvent) {
      throw new NotFoundError('Upload event not found');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const handler = (event: UploadSSEEvent) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Client disconnected — cleanup handled by 'close' event
      }
    };

    uploadEvents.on(eventId, handler);

    req.on('close', () => {
      uploadEvents.off(eventId, handler);
    });
  }),
);

export default router;

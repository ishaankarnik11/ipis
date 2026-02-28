import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { generateErrorReport } from '../lib/excel.js';
import { uploadEvents, type UploadSSEEvent } from '../lib/sse.js';
import * as uploadService from '../services/upload.service.js';

const router: RouterType = Router();

// GET /api/v1/uploads/history — Paginated upload event history (Finance, HR, Admin)
router.get(
  '/history',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'HR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [data, total] = await Promise.all([
      prisma.uploadEvent.findMany({
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
      prisma.uploadEvent.count(),
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

// POST /api/v1/uploads/timesheets — Upload timesheet Excel file (Finance, Admin)
router.post(
  '/timesheets',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    const result = await uploadService.processTimesheetUpload(
      req.file.buffer,
      req.user!,
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
    );
    res.json({ data: result });
  }),
);

// GET /api/v1/uploads/:uploadEventId/error-report — Download XLSX error report (HR, Admin)
router.get(
  '/:uploadEventId/error-report',
  authMiddleware,
  rbacMiddleware(['HR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const eventId = req.params.uploadEventId as string;
    const uploadEvent = await prisma.uploadEvent.findUnique({
      where: { id: eventId },
    });

    if (!uploadEvent) {
      throw new NotFoundError('Upload event not found');
    }

    if (!uploadEvent.errorSummary) {
      throw new ValidationError('No error report available for this upload');
    }

    const failedRows = uploadEvent.errorSummary as Array<{
      row: number;
      employeeCode: string;
      error: string;
    }>;
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

// GET /api/v1/uploads/progress/:uploadEventId — SSE endpoint for upload progress (Finance, Admin)
router.get(
  '/progress/:uploadEventId',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const handler = (event: UploadSSEEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const eventId = req.params.uploadEventId as string;
    uploadEvents.on(eventId, handler);

    req.on('close', () => {
      uploadEvents.off(eventId, handler);
    });
  },
);

export default router;

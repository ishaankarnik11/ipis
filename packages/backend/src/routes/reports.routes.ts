import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.middleware.js';
import { pdfExportRequestSchema, shareRequestSchema, AUDIT_ACTIONS } from '@ipis/shared';
import * as reportService from '../services/report.service.js';
import * as shareService from '../services/share.service.js';
import { logAuditEvent } from '../services/audit.service.js';

const router: RouterType = Router();

// Rate limiter for public share endpoint — 60 requests per minute per IP
const shareLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/reports/export/pdf
router.post(
  '/export/pdf',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER']),
  validate(pdfExportRequestSchema),
  asyncHandler(async (req, res) => {
    const { reportType, entityId, period } = req.body;

    const { buffer, filename } = await reportService.exportPdf(
      reportType,
      entityId,
      period,
      req.user!,
    );

    void logAuditEvent({
      actorId: req.user!.id,
      action: AUDIT_ACTIONS.PDF_EXPORTED,
      entityType: 'Report',
      entityId,
      ipAddress: req.ip ?? null,
      metadata: { reportType, period },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }),
);

// POST /api/v1/reports/share — Create a shareable link (Finance, Admin, Dept Head)
router.post(
  '/share',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD']),
  validate(shareRequestSchema),
  asyncHandler(async (req, res) => {
    const { reportType, entityId, period } = req.body;

    const result = await shareService.createShareLink(
      reportType,
      entityId,
      period,
      req.user!,
      req.ip,
    );

    res.status(201).json({ data: result });
  }),
);

// GET /api/v1/reports/shared/:token — Public endpoint (no auth)
router.get(
  '/shared/:token',
  shareLimiter,
  asyncHandler(async (req, res) => {
    const result = await shareService.getSharedReport(req.params.token as string);
    res.json({ data: result });
  }),
);

// DELETE /api/v1/reports/share/:tokenId — Revoke a share link (Admin only)
router.delete(
  '/share/:tokenId',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (req, res) => {
    await shareService.revokeShareLink(req.params.tokenId as string, req.user!.id, req.ip);
    res.status(204).send();
  }),
);

export default router;

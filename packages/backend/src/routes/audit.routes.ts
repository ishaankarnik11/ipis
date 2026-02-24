import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as auditService from '../services/audit.service.js';

const router: RouterType = Router();

// GET /api/v1/audit-log — List audit events (Admin only)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));

    const actions = req.query.actions
      ? (req.query.actions as string).split(',').filter(Boolean)
      : undefined;

    const result = await auditService.getAuditLog(
      {
        actions,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        actorEmail: req.query.actorEmail as string | undefined,
      },
      { page, pageSize },
    );

    res.json(result);
  }),
);

export default router;

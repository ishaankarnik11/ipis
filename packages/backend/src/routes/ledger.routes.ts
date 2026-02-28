import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import * as ledgerService from '../services/ledger.service.js';

const router: RouterType = Router();

// GET /api/v1/reports/projects/:id/ledger?period=YYYY-MM
router.get(
  '/projects/:id/ledger',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id as string;
    const period = req.query['period'] as string | undefined;

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new ValidationError('period query parameter is required in YYYY-MM format');
    }

    const [yearStr, monthStr] = period.split('-');
    const periodYear = parseInt(yearStr!, 10);
    const periodMonth = parseInt(monthStr!, 10);

    if (periodMonth < 1 || periodMonth > 12) {
      throw new ValidationError('period month must be between 01 and 12');
    }

    const data = await ledgerService.getProjectLedger(projectId, periodMonth, periodYear, req.user!);
    res.json({ data });
  }),
);

export default router;

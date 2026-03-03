import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as dashboardService from '../services/dashboard.service.js';

const router: RouterType = Router();

// GET /api/v1/reports/dashboards/projects
router.get(
  '/dashboards/projects',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
  asyncHandler(async (req, res) => {
    const filters = {
      department: req.query['department'] as string | undefined,
      vertical: req.query['vertical'] as string | undefined,
      engagementModel: req.query['engagement_model'] as string | undefined,
      status: req.query['status'] as string | undefined,
      sortBy: req.query['sort_by'] as string | undefined,
      sortOrder: req.query['sort_order'] as 'asc' | 'desc' | undefined,
    };

    const data = await dashboardService.getProjectDashboard(req.user!, filters);
    res.json({ data, meta: { total: data.length } });
  }),
);

// GET /api/v1/reports/dashboards/executive
router.get(
  '/dashboards/executive',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getExecutiveDashboard();
    if (!data) {
      res.json({ data: null, meta: { total: 0 } });
      return;
    }
    res.json({ data, meta: { total: 1 } });
  }),
);

// GET /api/v1/reports/dashboards/practice
router.get(
  '/dashboards/practice',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getPracticeDashboard();
    res.json({ data, meta: { total: data.length } });
  }),
);

// GET /api/v1/reports/dashboards/department
router.get(
  '/dashboards/department',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getDepartmentDashboard(req.user!);
    res.json({ data, meta: { total: data.length } });
  }),
);

// GET /api/v1/reports/dashboards/company
router.get(
  '/dashboards/company',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getCompanyDashboard();
    if (!data) {
      res.json({ data: null, meta: { total: 0 } });
      return;
    }
    res.json({ data, meta: { total: 1 } });
  }),
);

export default router;

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
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD', 'DELIVERY_MANAGER', 'HR']),
  asyncHandler(async (req, res) => {
    const monthsParam = req.query['months'] as string | undefined;

    if (monthsParam) {
      // Multi-month comparison mode: months=2026-01,2026-02,2026-03
      const months = monthsParam.split(',').map((m) => {
        const parts = m.trim().split('-');
        if (parts.length !== 2) return null;
        const year = parseInt(parts[0]!, 10);
        const month = parseInt(parts[1]!, 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
        return { year, month };
      }).filter((m): m is { year: number; month: number } => m !== null);

      if (months.length === 0) {
        res.status(400).json({ error: { code: 'INVALID_MONTHS', message: 'No valid months provided. Format: YYYY-MM (e.g., 2026-01,2026-02)' } });
        return;
      }

      // Limit to 12 months max
      const limited = months.slice(0, 12);
      const data = await dashboardService.getDepartmentComparison(req.user!, limited);
      res.json({ data, meta: { total: data.length, mode: 'comparison' } });
    } else {
      // Default single-month mode (backward compatible)
      const data = await dashboardService.getDepartmentDashboard(req.user!);
      res.json({ data, meta: { total: data.length } });
    }
  }),
);

// GET /api/v1/reports/dashboards/department/:id/drilldown
router.get(
  '/dashboards/department/:id/drilldown',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD', 'DELIVERY_MANAGER', 'HR']),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getDepartmentDrilldown(req.user!, req.params.id as string);
    if (!data) {
      res.status(404).json({ error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found or access denied' } });
      return;
    }
    res.json({ data });
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

// GET /api/v1/reports/dashboards/employees
router.get(
  '/dashboards/employees',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD', 'HR']),
  asyncHandler(async (req, res) => {
    const filters = {
      department: req.query['department'] as string | undefined,
      designation: req.query['designation'] as string | undefined,
    };
    const data = await dashboardService.getEmployeeDashboard(req.user!, filters);
    res.json({ data, meta: { total: data.length } });
  }),
);

// GET /api/v1/reports/dashboards/employees/:id
router.get(
  '/dashboards/employees/:id',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD', 'HR']),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getEmployeeDetail(req.user!, req.params.id as string);
    if (!data) {
      res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found or access denied' } });
      return;
    }
    res.json({ data });
  }),
);

// GET /api/v1/reports/dashboards/clients
router.get(
  '/dashboards/clients',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getClientDashboard();
    res.json({ data, meta: { total: data.length } });
  }),
);

// GET /api/v1/reports/dashboards/clients/:name/projects
router.get(
  '/dashboards/clients/:name/projects',
  authMiddleware,
  rbacMiddleware(['FINANCE', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getClientProjects(decodeURIComponent(req.params.name as string));
    res.json({ data, meta: { total: data.length } });
  }),
);

export default router;

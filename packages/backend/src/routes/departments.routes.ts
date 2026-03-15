import { Router, type Router as RouterType } from 'express';
import { createDepartmentSchema, updateDepartmentSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as departmentService from '../services/department.service.js';

const router: RouterType = Router();

// POST /api/v1/departments — Create department (Admin only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json({ data: department });
  }),
);

// GET /api/v1/departments — List departments (all authenticated users)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === 'true' ? true : undefined;
    const departments = await departmentService.getAllDepartments(activeOnly);
    res.json({ data: departments, meta: { total: departments.length } });
  }),
);

// PATCH /api/v1/departments/:id — Update department (Admin only)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.updateDepartment(req.params.id as string, req.body);
    res.json({ data: department });
  }),
);

// DELETE /api/v1/departments/:id — Soft-delete department (Admin only)
router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (req, res) => {
    const department = await departmentService.deactivateDepartment(req.params.id as string);
    res.json({ data: department });
  }),
);

export default router;

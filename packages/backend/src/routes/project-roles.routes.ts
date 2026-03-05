import { Router, type Router as RouterType } from 'express';
import { createProjectRoleSchema, updateProjectRoleSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as projectRoleService from '../services/project-role.service.js';

const router: RouterType = Router();

// POST /api/v1/project-roles — Create role (Admin only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(createProjectRoleSchema),
  asyncHandler(async (req, res) => {
    const role = await projectRoleService.createRole(req.body);
    res.status(201).json({ data: role });
  }),
);

// GET /api/v1/project-roles — List roles (all authenticated users)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === 'true' ? true : undefined;
    const roles = await projectRoleService.getAllRoles(activeOnly);
    res.json({ data: roles, meta: { total: roles.length } });
  }),
);

// PATCH /api/v1/project-roles/:id — Update role (Admin only)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(updateProjectRoleSchema),
  asyncHandler(async (req, res) => {
    const role = await projectRoleService.updateRole(req.params.id as string, req.body);
    res.json({ data: role });
  }),
);

export default router;

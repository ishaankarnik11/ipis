import { Router, type Router as RouterType } from 'express';
import { createProjectSchema, rejectProjectSchema, updateProjectSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as projectService from '../services/project.service.js';

const router: RouterType = Router();

// POST /api/v1/projects — Create project (Delivery Manager only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER']),
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.createProject(req.body, req.user!);
    res.status(201).json({ data: project });
  }),
);

// GET /api/v1/projects — List projects (role-scoped)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
  asyncHandler(async (req, res) => {
    const projects = await projectService.getAll(req.user!);
    res.json({ data: projects, meta: { total: projects.length } });
  }),
);

// GET /api/v1/projects/:id — Get project by ID
router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
  asyncHandler(async (req, res) => {
    const project = await projectService.getById(req.params.id, req.user!);
    res.json({ data: project });
  }),
);

// PATCH /api/v1/projects/:id — Update project (Delivery Manager, ownership check)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER']),
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(req.params.id, req.body, req.user!);
    res.json({ data: project });
  }),
);

// POST /api/v1/projects/:id/approve — Approve project (Admin only)
router.post(
  '/:id/approve',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (req, res) => {
    await projectService.approveProject(req.params.id);
    res.json({ success: true });
  }),
);

// POST /api/v1/projects/:id/reject — Reject project (Admin only)
router.post(
  '/:id/reject',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(rejectProjectSchema),
  asyncHandler(async (req, res) => {
    await projectService.rejectProject(req.params.id, req.body.rejectionComment);
    res.json({ success: true });
  }),
);

// POST /api/v1/projects/:id/resubmit — Resubmit project (Delivery Manager, ownership check)
router.post(
  '/:id/resubmit',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    await projectService.resubmitProject(req.params.id, req.user!);
    res.json({ success: true });
  }),
);

export default router;

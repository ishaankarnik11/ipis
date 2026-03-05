import { Router, type Router as RouterType } from 'express';
import { createProjectSchema, rejectProjectSchema, updateProjectSchema, addTeamMemberSchema } from '@ipis/shared';
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
    const project = await projectService.createProject(req.body, req.user!, req.ip);
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
    const project = await projectService.getById(req.params.id as string, req.user!);
    res.json({ data: project });
  }),
);

// PATCH /api/v1/projects/:id — Update project (DM edits REJECTED; DM/Finance updates completion%)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER', 'FINANCE']),
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.updateProject(req.params.id as string, req.body, req.user!);
    res.json({ data: project });
  }),
);

// POST /api/v1/projects/:id/approve — Approve project (Admin only)
router.post(
  '/:id/approve',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (req, res) => {
    await projectService.approveProject(req.params.id as string, req.user!.id, req.ip);
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
    await projectService.rejectProject(req.params.id as string, req.body.rejectionComment, req.user!.id, req.ip);
    res.json({ success: true });
  }),
);

// POST /api/v1/projects/:id/resubmit — Resubmit project (Delivery Manager, ownership check)
router.post(
  '/:id/resubmit',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    await projectService.resubmitProject(req.params.id as string, req.user!, req.ip);
    res.json({ success: true });
  }),
);

// ── Team Roster Routes ──────────────────────────────────────────────

// POST /api/v1/projects/:id/team-members — Add team member (DM + Admin)
router.post(
  '/:id/team-members',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER', 'ADMIN']),
  validate(addTeamMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await projectService.addTeamMember(req.params.id as string, req.body, req.user!);
    res.status(201).json({ data: member });
  }),
);

// GET /api/v1/projects/:id/team-members — List team members (DM + Admin + Finance + DeptHead)
router.get(
  '/:id/team-members',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER', 'ADMIN', 'FINANCE', 'DEPT_HEAD']),
  asyncHandler(async (req, res) => {
    const members = await projectService.getTeamMembers(req.params.id as string, req.user!);
    res.json({ data: members });
  }),
);

// DELETE /api/v1/projects/:id/team-members/:employeeId — Remove team member (DM + Admin)
router.delete(
  '/:id/team-members/:employeeId',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    await projectService.removeTeamMember(
      req.params.id as string,
      req.params.employeeId as string,
      req.user!,
    );
    res.json({ success: true });
  }),
);

export default router;

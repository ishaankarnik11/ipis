import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as userService from '../services/user.service.js';

const router: RouterType = Router();

// GET /api/v1/departments — List all departments
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'HR', 'FINANCE']),
  asyncHandler(async (_req, res) => {
    const departments = await userService.getAllDepartments();
    res.json({ data: departments });
  }),
);

export default router;

import { Router, type Router as RouterType } from 'express';
import { createUserSchema, updateUserSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as userService from '../services/user.service.js';

const router: RouterType = Router();

// POST /api/v1/users — Create user (Admin only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json({ data: user });
  }),
);

// GET /api/v1/users — List all users (Admin only)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const users = await userService.getAll();
    res.json({ data: users, meta: { total: users.length } });
  }),
);

// PATCH /api/v1/users/:id — Update user (Admin only)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id as string, req.body);
    res.json({ data: user });
  }),
);

export default router;

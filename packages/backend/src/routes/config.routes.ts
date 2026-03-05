import { Router, type Router as RouterType } from 'express';
import { systemConfigSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as configService from '../services/config.service.js';

const router: RouterType = Router();

// GET /api/v1/config — Get system config (Admin only)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const config = await configService.getConfig();
    res.json({ data: config });
  }),
);

// PUT /api/v1/config — Update system config (Admin only)
router.put(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(systemConfigSchema),
  asyncHandler(async (req, res) => {
    await configService.updateConfig(req.body, req.user!.id, req.ip);
    res.json({ success: true });
  }),
);

export default router;

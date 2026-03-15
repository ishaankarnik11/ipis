import { Router, type Router as RouterType } from 'express';
import { createDesignationSchema, updateDesignationSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as designationService from '../services/designation.service.js';

const router: RouterType = Router();

// POST /api/v1/designations — Create designation (Admin only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(createDesignationSchema),
  asyncHandler(async (req, res) => {
    const designation = await designationService.createDesignation(req.body);
    res.status(201).json({ data: designation });
  }),
);

// GET /api/v1/designations — List designations (all authenticated users)
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === 'true' ? true : undefined;
    const designations = await designationService.getAllDesignations(activeOnly);
    res.json({ data: designations, meta: { total: designations.length } });
  }),
);

// PATCH /api/v1/designations/:id — Update designation (Admin only)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  validate(updateDesignationSchema),
  asyncHandler(async (req, res) => {
    const designation = await designationService.updateDesignation(req.params.id as string, req.body);
    res.json({ data: designation });
  }),
);

export default router;

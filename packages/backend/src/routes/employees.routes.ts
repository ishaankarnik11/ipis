import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import { ValidationError } from '../lib/errors.js';
import * as employeeService from '../services/employee.service.js';
import { generateSampleTemplate } from '../lib/excel.js';

const router: RouterType = Router();

// POST /api/v1/employees/bulk-upload — Bulk upload employees (HR only)
router.post(
  '/bulk-upload',
  authMiddleware,
  rbacMiddleware(['HR']),
  uploadSingle,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    const result = await employeeService.bulkUpload(req.file.buffer);
    res.json({ data: result });
  }),
);

// GET /api/v1/employees/sample-template — Download sample Excel template (HR only)
router.get(
  '/sample-template',
  authMiddleware,
  rbacMiddleware(['HR']),
  asyncHandler(async (_req, res) => {
    const buffer = generateSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-salary-template.xlsx');
    res.send(buffer);
  }),
);

export default router;

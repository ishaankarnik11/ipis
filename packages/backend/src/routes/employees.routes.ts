import { Router, type Router as RouterType } from 'express';
import { createEmployeeSchema, updateEmployeeSchema } from '@ipis/shared';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
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

// POST /api/v1/employees — Create individual employee (HR only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['HR']),
  validate(createEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json({ data: employee });
  }),
);

// GET /api/v1/employees/search — Search active employees by name (DM, Admin)
router.get(
  '/search',
  authMiddleware,
  rbacMiddleware(['DELIVERY_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
    if (q.length < 2) {
      res.json({ data: [], meta: { total: 0 } });
      return;
    }
    const employees = await employeeService.searchEmployees(q);
    res.json({ data: employees, meta: { total: employees.length } });
  }),
);

// GET /api/v1/employees — List all employees (HR, Admin, Finance, DM)
router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['HR', 'ADMIN', 'FINANCE', 'DELIVERY_MANAGER']),
  asyncHandler(async (req, res) => {
    const employees = await employeeService.getAll(req.user!);
    res.json({ data: employees, meta: { total: employees.length } });
  }),
);

// GET /api/v1/employees/:id — Get single employee (HR, Admin, Finance)
router.get(
  '/:id',
  authMiddleware,
  rbacMiddleware(['HR', 'ADMIN', 'FINANCE']),
  asyncHandler(async (req, res) => {
    const employee = await employeeService.getById(req.params.id as string, req.user!);
    res.json({ data: employee });
  }),
);

// PATCH /api/v1/employees/:id — Update employee (HR only)
router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['HR']),
  validate(updateEmployeeSchema),
  asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(req.params.id as string, req.body);
    res.json({ data: employee });
  }),
);

// PATCH /api/v1/employees/:id/resign — Resign employee (HR only)
router.patch(
  '/:id/resign',
  authMiddleware,
  rbacMiddleware(['HR']),
  asyncHandler(async (req, res) => {
    await employeeService.resignEmployee(req.params.id as string);
    res.json({ success: true });
  }),
);

export default router;

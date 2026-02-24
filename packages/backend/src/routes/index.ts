import { Router, type Router as RouterType } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import configRoutes from './config.routes.js';
import departmentsRoutes from './departments.routes.js';
import employeesRoutes from './employees.routes.js';
import projectsRoutes from './projects.routes.js';
import auditRoutes from './audit.routes.js';

const router: RouterType = Router();

// Health check endpoint
router.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
router.use('/api/v1/auth', authRoutes);

// User management routes (Admin only)
router.use('/api/v1/users', usersRoutes);

// System config routes (Admin only)
router.use('/api/v1/config', configRoutes);

// Department routes (Admin only)
router.use('/api/v1/departments', departmentsRoutes);

// Employee routes (HR only)
router.use('/api/v1/employees', employeesRoutes);

// Project routes (role-scoped)
router.use('/api/v1/projects', projectsRoutes);

// Audit log routes (Admin only)
router.use('/api/v1/audit-log', auditRoutes);

export default router;

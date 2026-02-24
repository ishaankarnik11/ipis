import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
    employeeProject: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock email
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock email service (for auth routes)
vi.mock('../services/email.service.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock config
vi.mock('../lib/config.js', () => ({
  config: {
    port: 3000,
    databaseUrl: 'mock://db',
    get jwtSecret() {
      return 'test-secret-key-that-is-long-enough-for-hs256';
    },
    logLevel: 'silent',
    nodeEnv: 'test',
    frontendUrl: 'http://localhost:5173',
  },
}));

import { prisma } from '../lib/prisma.js';

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockProjectCreate = prisma.project.create as ReturnType<typeof vi.fn>;
const mockProjectFindMany = prisma.project.findMany as ReturnType<typeof vi.fn>;
const mockProjectFindUnique = prisma.project.findUnique as ReturnType<typeof vi.fn>;
const mockProjectUpdate = prisma.project.update as ReturnType<typeof vi.fn>;
const mockEmployeeFindUnique = prisma.employee.findUnique as ReturnType<typeof vi.fn>;
const mockEmployeeProjectCreate = prisma.employeeProject.create as ReturnType<typeof vi.fn>;
const mockEmployeeProjectFindUnique = prisma.employeeProject.findUnique as ReturnType<typeof vi.fn>;
const mockEmployeeProjectFindMany = prisma.employeeProject.findMany as ReturnType<typeof vi.fn>;
const mockEmployeeProjectDelete = prisma.employeeProject.delete as ReturnType<typeof vi.fn>;

describe('Project Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  const makeDM = () => ({
    id: 'dm-1',
    email: 'dm@test.com',
    passwordHash: hashedPassword,
    name: 'Test DM',
    role: 'DELIVERY_MANAGER',
    isActive: true,
    departmentId: 'dept-1',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeAdmin = () => ({
    id: 'admin-1',
    email: 'admin@test.com',
    passwordHash: hashedPassword,
    name: 'Test Admin',
    role: 'ADMIN',
    isActive: true,
    departmentId: 'dept-1',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeFinance = () => ({
    id: 'fin-1',
    email: 'finance@test.com',
    passwordHash: hashedPassword,
    name: 'Test Finance',
    role: 'FINANCE',
    isActive: true,
    departmentId: 'dept-1',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeHR = () => ({
    id: 'hr-1',
    email: 'hr@test.com',
    passwordHash: hashedPassword,
    name: 'Test HR',
    role: 'HR',
    isActive: true,
    departmentId: 'dept-1',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sampleProject = {
    id: 'proj-1',
    name: 'Test Project',
    client: 'ACME Corp',
    vertical: 'Technology',
    engagementModel: 'FIXED_COST',
    status: 'PENDING_APPROVAL',
    contractValuePaise: BigInt(50000000),
    deliveryManagerId: 'dm-1',
    rejectionComment: null,
    completionPercent: null,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCreateBody = {
    name: 'Test Project',
    client: 'ACME Corp',
    vertical: 'Technology',
    engagementModel: 'FIXED_COST',
    contractValuePaise: 50000000,
    startDate: '2026-03-01',
    endDate: '2026-12-31',
  };

  async function loginAs(user: ReturnType<typeof makeDM>): Promise<string[]> {
    mockUserFindUnique.mockResolvedValue(user);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    return loginRes.headers['set-cookie'] as unknown as string[];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindMany.mockResolvedValue([{ email: 'admin@test.com' }]);
  });

  describe('POST /api/v1/projects', () => {
    it('should create project as DM — 201, status PENDING_APPROVAL (AC: 1)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectCreate.mockResolvedValue(sampleProject);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookies)
        .send(validCreateBody);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING_APPROVAL');
      expect(res.body.data.name).toBe('Test Project');
    });

    it('should return 403 for non-DM creating project (AC: 11)', async () => {
      const cookies = await loginAs(makeHR());
      mockUserFindUnique.mockResolvedValue(makeHR());

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookies)
        .send(validCreateBody);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid body', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookies)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/projects/:id/approve', () => {
    it('should approve project as Admin — status ACTIVE (AC: 4)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-1/approve')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/projects/:id/reject', () => {
    it('should reject project with comment — status REJECTED (AC: 5)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-1/reject')
        .set('Cookie', cookies)
        .send({ rejectionComment: 'Incomplete details' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for empty rejectionComment (AC: 5)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());

      const res = await request(app)
        .post('/api/v1/projects/proj-1/reject')
        .set('Cookie', cookies)
        .send({ rejectionComment: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/projects/:id/resubmit', () => {
    it('should resubmit project — status PENDING_APPROVAL, comment cleared (AC: 6)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-1',
      });
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-1/resubmit')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1', status: 'REJECTED' },
          data: { status: 'PENDING_APPROVAL', rejectionComment: null },
        }),
      );
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return project for owning DM (AC: 7)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(sampleProject);

      const res = await request(app)
        .get('/api/v1/projects/proj-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('proj-1');
      expect(res.body.data.name).toBe('Test Project');
    });

    it('should return 403 for DM who does not own the project', async () => {
      const otherDM = {
        ...makeDM(),
        id: 'dm-other',
        email: 'other@test.com',
      };
      const cookies = await loginAs(otherDM);
      mockUserFindUnique.mockResolvedValue(otherDM);
      mockProjectFindUnique.mockResolvedValue(sampleProject);

      const res = await request(app)
        .get('/api/v1/projects/proj-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent project', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectFindUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/projects/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return DM own projects only (AC: 7)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryManagerId: 'dm-1' },
        }),
      );
    });

    it('should return all projects for Finance (AC: 8)', async () => {
      const cookies = await loginAs(makeFinance());
      mockUserFindUnique.mockResolvedValue(makeFinance());
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should return all projects for Admin (AC: 8)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  // ── Team Roster Integration Tests ─────────────────────────────────

  const fcProjectForTeam = {
    id: 'proj-fc',
    deliveryManagerId: 'dm-1',
    engagementModel: 'FIXED_COST',
    status: 'ACTIVE',
  };

  const tmProjectForTeam = {
    id: 'proj-tm',
    deliveryManagerId: 'dm-1',
    engagementModel: 'TIME_AND_MATERIALS',
    status: 'ACTIVE',
  };

  const makeDeptHead = () => ({
    id: 'dh-1',
    email: 'dh@test.com',
    passwordHash: hashedPassword,
    name: 'Test DH',
    role: 'DEPT_HEAD',
    isActive: true,
    departmentId: 'dept-1',
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('POST /api/v1/projects/:id/team-members', () => {
    it('should add team member as DM — 201 (AC: 1)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      mockEmployeeProjectCreate.mockResolvedValue({
        projectId: 'proj-fc',
        employeeId: 'emp-1',
        role: 'Developer',
        billingRatePaise: null,
        assignedAt: new Date('2026-02-25'),
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toBe('emp-1');
      expect(res.body.data.role).toBe('Developer');
    });

    it('should return 400 for T&M project without billingRatePaise (AC: 2)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(tmProjectForTeam);

      const res = await request(app)
        .post('/api/v1/projects/proj-tm/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for other DM project (AC: 6)', async () => {
      const otherDM = {
        ...makeDM(),
        id: 'dm-other',
        email: 'other@test.com',
      };
      const cookies = await loginAs(otherDM);
      mockUserFindUnique.mockResolvedValue(otherDM);
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 409 for duplicate assignment (AC: 8)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      const prismaError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      mockEmployeeProjectCreate.mockRejectedValue(prismaError);

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 403 for HR user (AC: 7)', async () => {
      const cookies = await loginAs(makeHR());
      mockUserFindUnique.mockResolvedValue(makeHR());

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for Finance user (AC: 7)', async () => {
      const cookies = await loginAs(makeFinance());
      mockUserFindUnique.mockResolvedValue(makeFinance());

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for DEPT_HEAD user (AC: 7)', async () => {
      const cookies = await loginAs(makeDeptHead());
      mockUserFindUnique.mockResolvedValue(makeDeptHead());

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should add team member as Admin — 201 (Admin bypass)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      mockEmployeeProjectCreate.mockResolvedValue({
        projectId: 'proj-fc',
        employeeId: 'emp-1',
        role: 'Developer',
        billingRatePaise: null,
        assignedAt: new Date('2026-02-25'),
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toBe('emp-1');
    });

    it('should return 400 for resigned employee', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1', isResigned: true });

      const res = await request(app)
        .post('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies)
        .send({ employeeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role: 'Developer' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/projects/:id/team-members', () => {
    it('should return team members with employee details (AC: 3)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeProjectFindMany.mockResolvedValue([
        {
          employeeId: 'emp-1',
          role: 'Developer',
          billingRatePaise: BigInt(500000),
          assignedAt: new Date('2026-02-25'),
          employee: { name: 'Alice Smith', designation: 'Senior Developer' },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice Smith');
      expect(res.body.data[0].designation).toBe('Senior Developer');
      expect(res.body.data[0].billingRatePaise).toBe(500000);
    });

    it('should return team members for Admin (Admin bypass)', async () => {
      const cookies = await loginAs(makeAdmin());
      mockUserFindUnique.mockResolvedValue(makeAdmin());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeProjectFindMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return team members for Finance user (Finance access)', async () => {
      const cookies = await loginAs(makeFinance());
      mockUserFindUnique.mockResolvedValue(makeFinance());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeProjectFindMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/projects/proj-fc/team-members')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/v1/projects/:id/team-members/:employeeId', () => {
    it('should remove team member — 200 (AC: 4)', async () => {
      const cookies = await loginAs(makeDM());
      mockUserFindUnique.mockResolvedValue(makeDM());
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);
      mockEmployeeProjectDelete.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/v1/projects/proj-fc/team-members/emp-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for other DM project (AC: 6)', async () => {
      const otherDM = {
        ...makeDM(),
        id: 'dm-other',
        email: 'other@test.com',
      };
      const cookies = await loginAs(otherDM);
      mockUserFindUnique.mockResolvedValue(otherDM);
      mockProjectFindUnique.mockResolvedValue(fcProjectForTeam);

      const res = await request(app)
        .delete('/api/v1/projects/proj-fc/team-members/emp-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

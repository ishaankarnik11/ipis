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
});

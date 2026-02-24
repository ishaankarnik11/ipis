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
      create: vi.fn(),
      update: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
    systemConfig: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
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
  },
}));

import { prisma } from '../lib/prisma.js';

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockUserCreate = prisma.user.create as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockDeptFindMany = (prisma.department as { findMany: ReturnType<typeof vi.fn> }).findMany;

describe('User & Department Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  const makeUser = (overrides: Partial<ReturnType<typeof makeAdmin>> = {}) => ({
    id: 'admin-1',
    email: 'admin@test.com',
    passwordHash: hashedPassword,
    name: 'Test Admin',
    role: 'ADMIN' as string,
    isActive: true,
    departmentId: null as string | null,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const makeAdmin = () => makeUser();

  async function loginAs(role: string): Promise<string[]> {
    const user = makeUser({
      id: `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@test.com`,
      name: `Test ${role}`,
      role,
    });
    mockUserFindUnique.mockResolvedValueOnce(user);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    return res.headers['set-cookie'] as string[];
  }

  // Note: authMiddleware does NOT call prisma.user.findUnique.
  // It only verifies the JWT from the cookie and sets req.user from the token payload.
  // Only loginAs (auth.service.login) calls findUnique.

  describe('POST /api/v1/users', () => {
    it('should create user and return 201 with user data (AC 1)', async () => {
      const adminCookies = await loginAs('ADMIN');

      // createUser's duplicate check
      mockUserFindUnique.mockResolvedValueOnce(null);
      mockUserCreate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'new-user-1',
        name: args.data.name,
        email: args.data.email,
        role: args.data.role,
        isActive: true,
        departmentId: args.data.departmentId || null,
        department: null,
      }));

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', adminCookies)
        .send({ name: 'New User', email: 'new@test.com', role: 'FINANCE' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        id: 'new-user-1',
        name: 'New User',
        email: 'new@test.com',
        role: 'FINANCE',
        isActive: true,
      });
      expect(res.body.data.temporaryPassword).toBeDefined();
      expect(typeof res.body.data.temporaryPassword).toBe('string');
      // Password hash should NOT be in response
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return all users with meta.total (AC 2)', async () => {
      const adminCookies = await loginAs('ADMIN');

      const users = [
        { id: 'u1', name: 'A', email: 'a@t.com', role: 'ADMIN', departmentId: null, department: null, isActive: true },
        { id: 'u2', name: 'B', email: 'b@t.com', role: 'HR', departmentId: 'dept-1', department: { name: 'Engineering' }, isActive: false },
      ];
      mockUserFindMany.mockResolvedValue(users);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({ total: 2 });
      expect(res.body.data[0]).toEqual({
        id: 'u1',
        name: 'A',
        email: 'a@t.com',
        role: 'ADMIN',
        departmentId: null,
        departmentName: null,
        isActive: true,
      });
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update only provided fields and return updated user (AC 3)', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockUserUpdate.mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        email: 'a@t.com',
        role: 'ADMIN',
        departmentId: null,
        department: null,
        isActive: true,
      });

      const res = await request(app)
        .patch('/api/v1/users/u1')
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.departmentName).toBeNull();
    });

    it('should deactivate user via isActive: false (AC 4)', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockUserUpdate.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@t.com',
        role: 'ADMIN',
        departmentId: null,
        department: null,
        isActive: false,
      });

      const res = await request(app)
        .patch('/api/v1/users/u1')
        .set('Cookie', adminCookies)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('RBAC — Non-admin gets 403 (AC 7)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on POST /api/v1/users`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/users')
          .set('Cookie', cookies)
          .send({ name: 'X', email: 'x@t.com', role: 'HR' });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      it(`should return 403 for ${role} on GET /api/v1/users`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/users')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });

      it(`should return 403 for ${role} on PATCH /api/v1/users/:id`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .patch('/api/v1/users/u1')
          .set('Cookie', cookies)
          .send({ name: 'X' });

        expect(res.status).toBe(403);
      });
    }
  });

  describe('Duplicate email returns 409', () => {
    it('should return 409 CONFLICT when email already exists', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockUserFindUnique.mockResolvedValueOnce({ id: 'existing', email: 'dup@test.com' });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', adminCookies)
        .send({ name: 'Dup', email: 'dup@test.com', role: 'HR' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Validation errors return 400', () => {
    it('should return 400 for missing required fields', async () => {
      const adminCookies = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', adminCookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const adminCookies = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', adminCookies)
        .send({ name: 'Test', email: 'not-email', role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid role', async () => {
      const adminCookies = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', adminCookies)
        .send({ name: 'Test', email: 'test@test.com', role: 'SUPERUSER' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/departments', () => {
    it('should return all departments for admin', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockDeptFindMany.mockResolvedValue([
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Finance' },
      ]);

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toEqual({ id: 'dept-1', name: 'Engineering' });
    });

    it('should return 403 for non-admin', async () => {
      const cookies = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });
  });
});

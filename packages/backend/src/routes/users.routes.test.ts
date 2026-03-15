import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';

describe('User & Department Routes', () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanDb();
    await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function loginAs(role: string, overrides = {}) {
    const user = await createTestUser(role as any, overrides);
    const token = await signToken({ sub: user.id, role: user.role, email: user.email });
    const cookies = [`ipis_token=${token}`];
    return { cookies, user };
  }

  describe('POST /api/v1/users', () => {
    it('should create user and return 201 with user data (AC 1)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', cookies)
        .send({ name: 'New User', email: 'new@test.com', role: 'FINANCE' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'New User',
        email: 'new@test.com',
        role: 'FINANCE',
        status: 'INVITED',
      });
      expect(res.body.data.id).toBeDefined();
      // No temporaryPassword in OTP auth — user is invited via link
      // Password hash should NOT be in response
      expect(res.body.data.passwordHash).toBeUndefined();

      // Verify user exists in DB
      const dbUser = await prisma.user.findUnique({ where: { email: 'new@test.com' } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.name).toBe('New User');
      expect(dbUser!.status).toBe('INVITED');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return all users with meta.total (AC 2)', async () => {
      const { cookies } = await loginAs('ADMIN');
      // Create an additional user so we have at least 2
      await createTestUser('HR', { email: 'hr-list@test.com' });

      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toEqual({ total: res.body.data.length });
      // Verify flattened shape
      const first = res.body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('email');
      expect(first).toHaveProperty('role');
      expect(first).toHaveProperty('departmentName');
      expect(first).toHaveProperty('status');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update only provided fields and return updated user (AC 3)', async () => {
      const { cookies } = await loginAs('ADMIN');
      const target = await createTestUser('FINANCE', { email: 'patch-target@test.com', name: 'Original Name' });

      const res = await request(app)
        .patch(`/api/v1/users/${target.id}`)
        .set('Cookie', cookies)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.email).toBe('patch-target@test.com');
      expect(res.body.data.departmentName).toBeNull();
    });

    it('should deactivate user via status: DEACTIVATED (AC 4)', async () => {
      const { cookies } = await loginAs('ADMIN');
      const target = await createTestUser('FINANCE', { email: 'deactivate@test.com' });

      const res = await request(app)
        .patch(`/api/v1/users/${target.id}`)
        .set('Cookie', cookies)
        .send({ status: 'DEACTIVATED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DEACTIVATED');

      // Verify in DB
      const dbUser = await prisma.user.findUnique({ where: { id: target.id } });
      expect(dbUser!.status).toBe('DEACTIVATED');
    });
  });

  describe('RBAC — Non-admin gets 403 (AC 7)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on POST /api/v1/users`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/users')
          .set('Cookie', cookies)
          .send({ name: 'X', email: 'x@t.com', role: 'HR' });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      it(`should return 403 for ${role} on GET /api/v1/users`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/users')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });

      it(`should return 403 for ${role} on PATCH /api/v1/users/:id`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .patch('/api/v1/users/some-id')
          .set('Cookie', cookies)
          .send({ name: 'X' });

        expect(res.status).toBe(403);
      });
    }
  });

  describe('Duplicate email returns 409', () => {
    it('should return 409 CONFLICT when email already exists', async () => {
      const { cookies } = await loginAs('ADMIN');
      await createTestUser('HR', { email: 'dup@test.com' });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', cookies)
        .send({ name: 'Dup', email: 'dup@test.com', role: 'HR' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Validation errors return 400', () => {
    it('should return 400 for missing required fields', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', cookies)
        .send({ name: 'Test', email: 'not-email', role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid role', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', cookies)
        .send({ name: 'Test', email: 'test@test.com', role: 'SUPERUSER' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/departments', () => {
    it('should return all departments for admin', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should return 200 for FINANCE (allowed by RBAC)', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });

    it('should return 200 for all authenticated users (departments are publicly readable)', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });
  });
});

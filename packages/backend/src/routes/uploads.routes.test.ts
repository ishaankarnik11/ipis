import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';

describe('Upload Routes — RBAC', () => {
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
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password });
    return { cookies: res.headers['set-cookie'] as unknown as string[], user };
  }

  describe('POST /api/v1/uploads/timesheets — RBAC (AC7)', () => {
    const unauthorizedRoles = ['HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of unauthorizedRoles) {
      it(`should return 403 for ${role}`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/uploads/timesheets')
          .set('Cookie', cookies)
          .attach('file', Buffer.from('dummy'), 'test.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });
    }

    it('should allow FINANCE role (not 403)', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .post('/api/v1/uploads/timesheets')
        .set('Cookie', cookies);

      // Should NOT be 403 — may be 400 (no file) but not forbidden
      expect(res.status).not.toBe(403);
    });

    it('should allow ADMIN role (not 403)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/uploads/timesheets')
        .set('Cookie', cookies);

      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/v1/uploads/timesheets — unauthenticated', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/timesheets')
        .attach('file', Buffer.from('dummy'), 'test.xlsx');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/uploads/billing — RBAC (AC8)', () => {
    const unauthorizedRoles = ['HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of unauthorizedRoles) {
      it(`should return 403 for ${role}`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/uploads/billing')
          .set('Cookie', cookies)
          .attach('file', Buffer.from('dummy'), 'test.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });
    }

    it('should allow FINANCE role (not 403)', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .post('/api/v1/uploads/billing')
        .set('Cookie', cookies);

      expect(res.status).not.toBe(403);
    });

    it('should allow ADMIN role (not 403)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/uploads/billing')
        .set('Cookie', cookies);

      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/v1/uploads/salary — RBAC (AC8)', () => {
    const unauthorizedRoles = ['FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of unauthorizedRoles) {
      it(`should return 403 for ${role}`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/uploads/salary')
          .set('Cookie', cookies)
          .attach('file', Buffer.from('dummy'), 'test.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });
    }

    it('should allow HR role (not 403)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .post('/api/v1/uploads/salary')
        .set('Cookie', cookies);

      expect(res.status).not.toBe(403);
    });

    it('should allow ADMIN role (not 403)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post('/api/v1/uploads/salary')
        .set('Cookie', cookies);

      expect(res.status).not.toBe(403);
    });
  });
});

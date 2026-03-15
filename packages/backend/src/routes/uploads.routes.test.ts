import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

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
    const token = await signToken({ sub: user.id, role: user.role, email: user.email });
    const cookies = [`ipis_token=${token}`];
    return { cookies, user };
  }

  describe('POST /api/v1/uploads/timesheets — RBAC (AC7)', () => {
    const unauthorizedRoles = ['HR', 'DEPT_HEAD'];

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

    // Story 10.3 AC3: DM can upload timesheets
    it('should allow DELIVERY_MANAGER role (not 403)', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

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

  // ── Story 10.7: Upload History Role-Based Filtering ──

  describe('GET /api/v1/uploads/history — role-based type filtering (Story 10.7)', () => {
    async function seedUploadEvents(userId: string) {
      await prisma.uploadEvent.createMany({
        data: [
          { type: 'TIMESHEET', status: 'SUCCESS', uploadedBy: userId, periodMonth: 2, periodYear: 2026, rowCount: 10 },
          { type: 'BILLING', status: 'SUCCESS', uploadedBy: userId, periodMonth: 2, periodYear: 2026, rowCount: 5 },
          { type: 'SALARY', status: 'SUCCESS', uploadedBy: userId, periodMonth: 2, periodYear: 2026, rowCount: 20 },
        ],
      });
    }

    it('Finance sees only TIMESHEET and BILLING uploads (AC: 1)', async () => {
      const { cookies, user } = await loginAs('FINANCE');
      await seedUploadEvents(user.id);

      const res = await request(app)
        .get('/api/v1/uploads/history')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types).toContain('TIMESHEET');
      expect(types).toContain('BILLING');
      expect(types).not.toContain('SALARY');
    });

    it('HR sees only SALARY uploads (AC: 2)', async () => {
      const { cookies, user } = await loginAs('HR');
      await seedUploadEvents(user.id);

      const res = await request(app)
        .get('/api/v1/uploads/history')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types).toContain('SALARY');
      expect(types).not.toContain('TIMESHEET');
      expect(types).not.toContain('BILLING');
    });

    it('Admin sees all upload types (AC: 3)', async () => {
      const { cookies, user } = await loginAs('ADMIN');
      await seedUploadEvents(user.id);

      const res = await request(app)
        .get('/api/v1/uploads/history')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types).toContain('TIMESHEET');
      expect(types).toContain('BILLING');
      expect(types).toContain('SALARY');
    });

    it('DM sees only TIMESHEET uploads (AC: 4)', async () => {
      const { cookies, user } = await loginAs('DELIVERY_MANAGER');
      await seedUploadEvents(user.id);

      const res = await request(app)
        .get('/api/v1/uploads/history')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      const types = res.body.data.map((r: { type: string }) => r.type);
      expect(types).toContain('TIMESHEET');
      expect(types).not.toContain('BILLING');
      expect(types).not.toContain('SALARY');
    });
  });
});

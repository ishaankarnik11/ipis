import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';

describe('Config Routes', () => {
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

  describe('GET /api/v1/config', () => {
    it('should return config data for admin (AC 5)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/config')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      // When no config exists yet, service returns defaults
      expect(res.body.data).toEqual({
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
      });
    });
  });

  describe('PUT /api/v1/config', () => {
    it('should update config and return success (AC 6)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .put('/api/v1/config')
        .set('Cookie', cookies)
        .send({ standardMonthlyHours: 176 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Verify the update persisted
      const getRes = await request(app)
        .get('/api/v1/config')
        .set('Cookie', cookies);

      expect(getRes.body.data.standardMonthlyHours).toBe(176);
    });

    it('should reject non-integer standardMonthlyHours (AC 6)', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .put('/api/v1/config')
        .set('Cookie', cookies)
        .send({ standardMonthlyHours: 160.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('RBAC — Non-admin gets 403 on config endpoints (AC 7)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on GET /api/v1/config`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/config')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });

      it(`should return 403 for ${role} on PUT /api/v1/config`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .put('/api/v1/config')
          .set('Cookie', cookies)
          .send({ standardMonthlyHours: 176 });

        expect(res.status).toBe(403);
      });
    }
  });
});

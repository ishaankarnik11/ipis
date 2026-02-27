import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';

describe('Department Routes', () => {
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
    return { cookies: res.headers['set-cookie'] as string[], user };
  }

  describe('GET /api/v1/departments', () => {
    it('should return 200 with array of departments for authenticated ADMIN user', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/departments');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 for HR users', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 for FINANCE users', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for unauthorized roles', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

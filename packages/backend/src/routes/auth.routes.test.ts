import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';

describe('Auth Routes', () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanDb();
    await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid cookie', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });
      const token = await signToken({ sub: user.id, role: user.role, email: user.email });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`ipis_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: user.id,
        name: 'Test Admin',
        role: 'ADMIN',
        email: 'admin@test.com',
        departmentId: null,
        status: 'ACTIVE',
      });
    });

    it('should return 401 without cookie', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookie and return success', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Cookie should be cleared (maxAge: 0)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('ipis_token');
    });
  });
});

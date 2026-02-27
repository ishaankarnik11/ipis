import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';

describe('Auth Routes', () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanDb();
    await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return user data and set httpOnly cookie on valid credentials', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: user.id,
        name: 'Test Admin',
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      // JWT should NOT be in response body
      expect(res.body.data.token).toBeUndefined();
      expect(res.body.token).toBeUndefined();

      // Cookie should be set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('ipis_token');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('should return 401 for wrong password with generic message', async () => {
      await createTestUser('ADMIN', { email: 'admin@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email with same message as wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'any-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for deactivated user', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });

      expect(res.status).toBe(401);
    });

    it('should return 400 VALIDATION_ERROR for invalid body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty body', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid cookie', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      const cookies = loginRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data).toEqual({
        id: user.id,
        name: 'Test Admin',
        role: 'ADMIN',
        email: 'admin@test.com',
        departmentId: null,
        mustChangePassword: false,
      });
    });

    it('should return 401 without cookie', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for expired token', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      const cookies = loginRes.headers['set-cookie'];

      // Advance system clock past the 2-hour JWT expiry
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(Date.now() + 3 * 60 * 60 * 1000);

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);

      vi.useRealTimers();

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('UNAUTHORIZED');
      expect(meRes.body.error.message).toBe('Session expired');
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

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should always return success regardless of email existence (AC 1)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // No token should be created for non-existent email
      const tokens = await prisma.passwordResetToken.findMany();
      expect(tokens).toHaveLength(0);
    });

    it('should return success for existing user and create token', async () => {
      await createTestUser('ADMIN', { email: 'admin@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@test.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      const tokens = await prisma.passwordResetToken.findMany();
      expect(tokens).toHaveLength(1);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/validate-reset-token', () => {
    it('should return valid: true for valid token (AC 2)', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com' });
      const crypto = await import('node:crypto');
      const plaintext = crypto.randomUUID();
      const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app)
        .get(`/api/v1/auth/validate-reset-token?token=${plaintext}`);

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
    });

    it('should return valid: false for invalid/expired/used token (AC 2)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/validate-reset-token?token=bad-token');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
    });

    it('should return valid: false when no token query param provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/validate-reset-token');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should return success on valid token and password (AC 3)', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com' });
      const crypto = await import('node:crypto');
      const plaintext = crypto.randomUUID();
      const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: plaintext, newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Verify password was actually changed
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const matches = await bcrypt.compare('newpass123', dbUser!.passwordHash);
      expect(matches).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'bad-token', newPassword: 'newpass123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for password shorter than 8 chars', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-uuid', newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should update password for authenticated user (AC 6)', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com' });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Verify password was actually changed
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const matches = await bcrypt.compare('newpass123', dbUser!.passwordHash);
      expect(matches).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ newPassword: 'newpass123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for password shorter than 8 chars', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com' });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should set mustChangePassword to false when changing password (AC 6)', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', mustChangePassword: true });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'newpass123' });

      expect(res.status).toBe(200);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.mustChangePassword).toBe(false);
    });
  });

  describe('Auth lifecycle regression', () => {
    it('should complete login → /me → logout → /me returns 401 cycle', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });

      // Step 1: Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers['set-cookie'];

      // Step 2: GET /me returns user
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe('admin@test.com');

      // Step 3: Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ success: true });

      // Verify logout response clears the cookie
      const logoutCookies = logoutRes.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const logoutCookieStr = Array.isArray(logoutCookies) ? logoutCookies.join('; ') : logoutCookies;
      expect(logoutCookieStr).toContain('ipis_token');
      expect(logoutCookieStr).toContain('Max-Age=0');

      // Step 4: GET /me without cookie → 401
      const meAfterLogout = await request(app).get('/api/v1/auth/me');
      expect(meAfterLogout.status).toBe(401);
    });
  });

  describe('Password reset lifecycle regression', () => {
    it('should complete forgot-password → validate → reset → login-with-new-password cycle', async () => {
      const user = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });

      // Step 1: Request password reset
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@test.com' });
      expect(forgotRes.status).toBe(200);

      // Get the token from DB
      const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(1);
      // We can't get the plaintext from DB (only hash stored), but we can test validate + reset
      // by creating a known token manually
      const crypto = await import('node:crypto');
      const plaintext = crypto.randomUUID();
      const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // Step 2: Validate token
      const validateRes = await request(app)
        .get(`/api/v1/auth/validate-reset-token?token=${plaintext}`);
      expect(validateRes.status).toBe(200);
      expect(validateRes.body.data.valid).toBe(true);

      // Step 3: Reset password
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: plaintext, newPassword: 'new-secure-password' });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body).toEqual({ success: true });

      // Step 4: Login with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'new-secure-password' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.email).toBe('admin@test.com');
    });
  });

  describe('First-login change-password regression', () => {
    it('should complete login (mustChangePassword=true) → change-password → /me returns mustChangePassword=false', async () => {
      const user = await createTestUser('ADMIN', {
        email: 'admin@test.com',
        mustChangePassword: true,
      });

      // Step 1: Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: user.password });
      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers['set-cookie'];

      // Step 2: GET /me returns mustChangePassword: true
      const meBeforeRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);
      expect(meBeforeRes.status).toBe(200);
      expect(meBeforeRes.body.data.mustChangePassword).toBe(true);

      // Step 3: Change password
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'new-secure-password' });
      expect(changeRes.status).toBe(200);
      expect(changeRes.body).toEqual({ success: true });

      // Step 4: GET /me returns mustChangePassword: false
      const meAfterRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);
      expect(meAfterRes.status).toBe(200);
      expect(meAfterRes.body.data.mustChangePassword).toBe(false);
    });
  });

  // Rate limit tests must be last — they exhaust shared in-memory rate limiters
  describe('Rate limiting', () => {
    it('should return 429 after exceeding failed login attempts', async () => {
      // Send enough failed requests to exceed the rate limit (10 per 15 min)
      for (let i = 0; i < 11; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'brute@test.com', password: 'wrong' });
      }

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'brute@test.com', password: 'wrong' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    });

    it('should return 429 after exceeding forgot-password rate limit (AC 7)', async () => {
      // Send 6 requests (limit is 5 per hour)
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'brute@test.com' });
      }

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'brute@test.com' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});

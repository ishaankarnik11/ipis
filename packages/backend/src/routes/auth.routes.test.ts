import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock email service
vi.mock('../services/email.service.js', () => ({
  sendPasswordResetEmail: vi.fn(),
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

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockTokenCreate = prisma.passwordResetToken.create as ReturnType<typeof vi.fn>;
const mockTokenFindFirst = prisma.passwordResetToken.findFirst as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;

describe('Auth Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('correct-password', 10);
  });

  const activeUser = () => ({
    id: 'user-1',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return user data and set httpOnly cookie on valid credentials', async () => {
      mockFindUnique.mockResolvedValue(activeUser());

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: 'user-1',
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
      mockFindUnique.mockResolvedValue(activeUser());

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email with same message as wrong password', async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'any-password' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for deactivated user', async () => {
      mockFindUnique.mockResolvedValue({ ...activeUser(), isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });

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
      // First login to get a cookie
      mockFindUnique.mockResolvedValue(activeUser());

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });

      const cookies = loginRes.headers['set-cookie'];

      // Now call /me with the cookie
      mockFindUnique.mockResolvedValue(activeUser());

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data).toEqual({
        id: 'user-1',
        name: 'Test Admin',
        role: 'ADMIN',
        email: 'admin@test.com',
        departmentId: 'dept-1',
        mustChangePassword: false,
      });
    });

    it('should return 401 without cookie', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for expired token', async () => {
      mockFindUnique.mockResolvedValue(activeUser());

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });

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
      mockFindUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('should return success for existing user and create token', async () => {
      mockFindUnique.mockResolvedValue(activeUser());
      mockTokenCreate.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@test.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockTokenCreate).toHaveBeenCalled();
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
      mockTokenFindFirst.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .get('/api/v1/auth/validate-reset-token?token=some-uuid');

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
    });

    it('should return valid: false for invalid/expired/used token (AC 2)', async () => {
      mockTokenFindFirst.mockResolvedValue(null);

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
      mockTokenFindFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockTransaction.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-uuid', newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('should return 401 for invalid token', async () => {
      mockTokenFindFirst.mockResolvedValue(null);

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
      // Login first
      mockFindUnique.mockResolvedValue(activeUser());
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });
      const cookies = loginRes.headers['set-cookie'];

      mockFindUnique.mockResolvedValue(activeUser());
      mockUserUpdate.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockUserUpdate).toHaveBeenCalled();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ newPassword: 'newpass123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for password shorter than 8 chars', async () => {
      // Login first
      mockFindUnique.mockResolvedValue(activeUser());
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });
      const cookies = loginRes.headers['set-cookie'];

      mockFindUnique.mockResolvedValue(activeUser());

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookies)
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // Rate limit tests must be last — they exhaust shared in-memory rate limiters
  describe('Rate limiting', () => {
    it('should return 429 after exceeding failed login attempts', async () => {
      mockFindUnique.mockResolvedValue(null);

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
      mockFindUnique.mockResolvedValue(null);

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

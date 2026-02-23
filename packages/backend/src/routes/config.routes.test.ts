import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';

// Mock Prisma — must include ALL models that any imported route might reference
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
const mockConfigFindFirst = prisma.systemConfig.findFirst as ReturnType<typeof vi.fn>;
const mockConfigUpsert = prisma.systemConfig.upsert as ReturnType<typeof vi.fn>;

describe('Config Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  async function loginAs(role: string): Promise<string[]> {
    const user = {
      id: `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@test.com`,
      passwordHash: hashedPassword,
      name: `Test ${role}`,
      role,
      isActive: true,
      departmentId: null,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUserFindUnique.mockResolvedValueOnce(user);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    return res.headers['set-cookie'] as string[];
  }

  describe('GET /api/v1/config', () => {
    it('should return config data for admin (AC 5)', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockConfigFindFirst.mockResolvedValue({
        id: 'cfg-1',
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/config')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        standardMonthlyHours: 160,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
      });
    });
  });

  describe('PUT /api/v1/config', () => {
    it('should update config and return success (AC 6)', async () => {
      const adminCookies = await loginAs('ADMIN');

      mockConfigUpsert.mockResolvedValue({
        id: 'cfg-1',
        standardMonthlyHours: 176,
        healthyMarginThreshold: 0.2,
        atRiskMarginThreshold: 0.05,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .put('/api/v1/config')
        .set('Cookie', adminCookies)
        .send({ standardMonthlyHours: 176 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('should reject non-integer standardMonthlyHours (AC 6)', async () => {
      const adminCookies = await loginAs('ADMIN');

      const res = await request(app)
        .put('/api/v1/config')
        .set('Cookie', adminCookies)
        .send({ standardMonthlyHours: 160.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('RBAC — Non-admin gets 403 on config endpoints (AC 7)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on GET /api/v1/config`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/config')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });

      it(`should return 403 for ${role} on PUT /api/v1/config`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .put('/api/v1/config')
          .set('Cookie', cookies)
          .send({ standardMonthlyHours: 176 });

        expect(res.status).toBe(403);
      });
    }
  });
});

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';

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
    auditEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

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
const mockAuditFindMany = prisma.auditEvent.findMany as ReturnType<typeof vi.fn>;
const mockAuditCount = prisma.auditEvent.count as ReturnType<typeof vi.fn>;

describe('Audit Routes', () => {
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

  describe('GET /api/v1/audit-log', () => {
    it('should return paginated audit events for Admin (AC 1)', async () => {
      const adminCookies = await loginAs('ADMIN');

      const mockEvents = [
        {
          id: 'evt-1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user-1',
          metadata: { name: 'Alice' },
          ipAddress: '127.0.0.1',
          createdAt: new Date('2026-02-24T10:00:00Z'),
          actor: { name: 'Admin', email: 'admin@test.com' },
        },
      ];

      mockAuditFindMany.mockResolvedValue(mockEvents);
      mockAuditCount.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/audit-log')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].actorName).toBe('Admin');
      expect(res.body.data[0].actorEmail).toBe('admin@test.com');
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(50);
    });

    it('should support pagination params', async () => {
      const adminCookies = await loginAs('ADMIN');
      mockAuditFindMany.mockResolvedValue([]);
      mockAuditCount.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/audit-log?page=2&pageSize=10')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.pageSize).toBe(10);
    });

    it('should support action filter param', async () => {
      const adminCookies = await loginAs('ADMIN');
      mockAuditFindMany.mockResolvedValue([]);
      mockAuditCount.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/audit-log?actions=USER_CREATED,USER_UPDATED')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
    });

    it('should clamp pageSize to max 100', async () => {
      const adminCookies = await loginAs('ADMIN');
      mockAuditFindMany.mockResolvedValue([]);
      mockAuditCount.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/audit-log?pageSize=999')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.meta.pageSize).toBe(100);
    });
  });

  describe('RBAC — Non-admin gets 403 on audit-log (AC 2)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on GET /api/v1/audit-log`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/audit-log')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });
    }
  });

  describe('Unauthenticated access', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/audit-log');
      expect(res.status).toBe(401);
    });
  });
});

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';

describe('Audit Routes', () => {
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

  async function seedAuditEvents(actorId: string, count: number, action = 'USER_CREATED') {
    for (let i = 0; i < count; i++) {
      await prisma.auditEvent.create({
        data: {
          actorId,
          action,
          entityType: 'User',
          entityId: `entity-${i}`,
          metadata: { index: i },
          ipAddress: '127.0.0.1',
        },
      });
    }
  }

  describe('GET /api/v1/audit-log', () => {
    it('should return paginated audit events for Admin (AC 1)', async () => {
      const { cookies, user } = await loginAs('ADMIN');
      await seedAuditEvents(user.id, 3);

      const res = await request(app)
        .get('/api/v1/audit-log')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data[0]).toHaveProperty('actorName');
      expect(res.body.data[0]).toHaveProperty('actorEmail');
      expect(res.body.data[0].actorName).toBe(user.name);
      expect(res.body.data[0].actorEmail).toBe(user.email);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(50);
    });

    it('should support pagination params', async () => {
      const { cookies, user } = await loginAs('ADMIN');
      await seedAuditEvents(user.id, 15);

      const res = await request(app)
        .get('/api/v1/audit-log?page=2&pageSize=10')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.pageSize).toBe(10);
    });

    it('should support action filter param', async () => {
      const { cookies, user } = await loginAs('ADMIN');
      await seedAuditEvents(user.id, 2, 'USER_CREATED');
      await seedAuditEvents(user.id, 3, 'USER_UPDATED');

      const res = await request(app)
        .get('/api/v1/audit-log?actions=USER_CREATED')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      for (const evt of res.body.data) {
        expect(evt.action).toBe('USER_CREATED');
      }
    });

    it('should clamp pageSize to max 100', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/audit-log?pageSize=999')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.meta.pageSize).toBe(100);
    });
  });

  describe('RBAC — Non-admin gets 403 on audit-log (AC 2)', () => {
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      it(`should return 403 for ${role} on GET /api/v1/audit-log`, async () => {
        const { cookies } = await loginAs(role);

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

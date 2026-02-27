import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import * as auditService from './audit.service.js';

describe('audit.service', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function seedAuditEvents() {
    await seedTestDepartments();
    const admin = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Admin' });

    const evt1 = await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-new',
        metadata: { name: 'Alice' },
        ipAddress: '127.0.0.1',
      },
    });

    const evt2 = await prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'PROJECT_APPROVED',
        entityType: 'Project',
        entityId: 'proj-1',
        metadata: null,
        ipAddress: null,
      },
    });

    return { admin, evt1, evt2 };
  }

  describe('getAuditLog', () => {
    it('should return paginated audit events with flattened actor fields', async () => {
      await seedAuditEvents();

      const result = await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 2, page: 1, pageSize: 50 });

      // Most recent first (PROJECT_APPROVED was created second)
      expect(result.data[0].action).toBe('PROJECT_APPROVED');
      expect(result.data[0].actorName).toBeNull();
      expect(result.data[0].actorEmail).toBeNull();

      expect(result.data[1].action).toBe('USER_CREATED');
      expect(result.data[1].actorName).toBe('Admin');
      expect(result.data[1].actorEmail).toBe('admin@test.com');
    });

    it('should apply action filter with IN clause', async () => {
      await seedAuditEvents();

      const result = await auditService.getAuditLog(
        { actions: ['USER_CREATED', 'USER_UPDATED'] },
        { page: 1, pageSize: 50 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('USER_CREATED');
    });

    it('should apply date range filter with BETWEEN', async () => {
      await seedAuditEvents();

      // Events were just created — use today's date range
      const today = new Date().toISOString().slice(0, 10);
      const result = await auditService.getAuditLog(
        { startDate: today, endDate: today },
        { page: 1, pageSize: 50 },
      );

      expect(result.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply actor email ILIKE filter', async () => {
      await seedAuditEvents();

      const result = await auditService.getAuditLog(
        { actorEmail: 'admin' },
        { page: 1, pageSize: 50 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].actorEmail).toBe('admin@test.com');
    });

    it('should calculate correct pagination offset', async () => {
      await seedAuditEvents();

      const result = await auditService.getAuditLog({}, { page: 2, pageSize: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 2, page: 2, pageSize: 1 });
    });

    it('should order by createdAt desc', async () => {
      await seedAuditEvents();

      const result = await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      // The second event was created after the first, so it should come first
      const timestamps = result.data.map((e: { createdAt: Date }) => new Date(e.createdAt).getTime());
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
    });

    it('should not apply filters when none are provided', async () => {
      // No events seeded — empty DB
      const result = await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({ total: 0, page: 1, pageSize: 50 });
    });
  });
});

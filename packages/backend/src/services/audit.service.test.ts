import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AUDIT_ACTIONS } from '@ipis/shared';
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

    const now = new Date();
    const earlier = new Date(now.getTime() - 1000);

    const evt1 = await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-new',
        metadata: { name: 'Alice' },
        ipAddress: '127.0.0.1',
        createdAt: earlier,
      },
    });

    const evt2 = await prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'PROJECT_APPROVED',
        entityType: 'Project',
        entityId: 'proj-1',
        metadata: undefined,
        ipAddress: null,
        createdAt: now,
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

  describe('logAuditEvent', () => {
    it('should persist an audit event with all fields populated', async () => {
      await seedTestDepartments();
      const admin = await createTestUser('ADMIN', { email: 'admin@test.com', name: 'Admin' });

      await auditService.logAuditEvent({
        actorId: admin.id,
        action: AUDIT_ACTIONS.USER_CREATED,
        entityType: 'User',
        entityId: 'user-new-123',
        ipAddress: '10.0.0.1',
        metadata: { email: 'new@test.com', role: 'FINANCE' },
      });

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        actorId: admin.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-new-123',
        ipAddress: '10.0.0.1',
      });
      expect(events[0].metadata).toEqual({ email: 'new@test.com', role: 'FINANCE' });
      expect(events[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle null actorId for system-initiated events', async () => {
      await auditService.logAuditEvent({
        action: AUDIT_ACTIONS.RECALCULATION_TRIGGERED,
        entityType: 'RecalculationRun',
        entityId: 'run-1',
      });

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0].actorId).toBeNull();
      expect(events[0].ipAddress).toBeNull();
      expect(events[0].metadata).toBeNull();
    });

    it('should handle null entityId', async () => {
      await auditService.logAuditEvent({
        action: AUDIT_ACTIONS.UPLOAD_TIMESHEET_REJECTED,
        entityType: 'Upload',
        metadata: { errorCount: 3 },
      });

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0].entityId).toBeNull();
    });

    it('should not throw when database write fails (fire-and-forget)', async () => {
      // Use a non-existent actorId to trigger FK constraint violation
      await expect(
        auditService.logAuditEvent({
          actorId: '00000000-0000-4000-8000-000000000099',
          action: AUDIT_ACTIONS.USER_CREATED,
          entityType: 'User',
          entityId: 'user-1',
        }),
      ).resolves.toBeUndefined();

      // Verify no event was written
      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(0);
    });

    it('should store metadata as JSON', async () => {
      await auditService.logAuditEvent({
        action: AUDIT_ACTIONS.UPLOAD_BILLING_SUCCESS,
        entityType: 'Upload',
        entityId: 'upload-1',
        metadata: { rowCount: 50, periodMonth: 3, periodYear: 2026 },
      });

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0].metadata).toEqual({ rowCount: 50, periodMonth: 3, periodYear: 2026 });
    });

    it('should populate ip_address correctly', async () => {
      await auditService.logAuditEvent({
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: 'SystemConfig',
        entityId: 'default',
        ipAddress: '192.168.1.100',
      });

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0].ipAddress).toBe('192.168.1.100');
    });

    it('should use action strings from AUDIT_ACTIONS constants (no magic strings)', async () => {
      const allActions = Object.values(AUDIT_ACTIONS);

      // Verify we have all 20 expected actions
      expect(allActions.length).toBe(20);

      for (const action of allActions) {
        await auditService.logAuditEvent({
          action,
          entityType: 'Test',
        });
      }

      const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'asc' } });
      expect(events).toHaveLength(allActions.length);
      expect(events.map((e) => e.action)).toEqual(allActions);
    });

    it('should set createdAt timestamp automatically', async () => {
      const before = new Date();
      await auditService.logAuditEvent({
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: 'SystemConfig',
        entityId: 'default',
      });
      const after = new Date();

      const events = await prisma.auditEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(events[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

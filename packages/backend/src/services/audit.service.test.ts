import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    auditEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';
import * as auditService from './audit.service.js';

const mockFindMany = prisma.auditEvent.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.auditEvent.count as ReturnType<typeof vi.fn>;

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
  {
    id: 'evt-2',
    action: 'PROJECT_APPROVED',
    entityType: 'Project',
    entityId: 'proj-1',
    metadata: null,
    ipAddress: null,
    createdAt: new Date('2026-02-24T09:00:00Z'),
    actor: null,
  },
];

describe('audit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuditLog', () => {
    it('should return paginated audit events with flattened actor fields', async () => {
      mockFindMany.mockResolvedValue(mockEvents);
      mockCount.mockResolvedValue(2);

      const result = await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'evt-1',
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-1',
        metadata: { name: 'Alice' },
        ipAddress: '127.0.0.1',
        createdAt: mockEvents[0].createdAt,
        actorName: 'Admin',
        actorEmail: 'admin@test.com',
      });
      expect(result.data[1].actorName).toBeNull();
      expect(result.data[1].actorEmail).toBeNull();
      expect(result.meta).toEqual({ total: 2, page: 1, pageSize: 50 });
    });

    it('should apply action filter with IN clause', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditService.getAuditLog(
        { actions: ['USER_CREATED', 'USER_UPDATED'] },
        { page: 1, pageSize: 50 },
      );

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.action).toEqual({ in: ['USER_CREATED', 'USER_UPDATED'] });
    });

    it('should apply date range filter with BETWEEN', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditService.getAuditLog(
        { startDate: '2026-01-01', endDate: '2026-01-31' },
        { page: 1, pageSize: 50 },
      );

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date('2026-01-01'));
      const expectedEnd = new Date('2026-01-31');
      expectedEnd.setUTCHours(23, 59, 59, 999);
      expect(where.createdAt.lte).toEqual(expectedEnd);
    });

    it('should apply actor email ILIKE filter', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditService.getAuditLog(
        { actorEmail: 'admin' },
        { page: 1, pageSize: 50 },
      );

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.actor).toEqual({
        email: { contains: 'admin', mode: 'insensitive' },
      });
    });

    it('should calculate correct pagination offset', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(100);

      await auditService.getAuditLog({}, { page: 3, pageSize: 25 });

      const args = mockFindMany.mock.calls[0][0];
      expect(args.skip).toBe(50);
      expect(args.take).toBe(25);
    });

    it('should order by createdAt desc', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should not apply filters when none are provided', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditService.getAuditLog({}, { page: 1, pageSize: 50 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).toEqual({});
    });
  });
});

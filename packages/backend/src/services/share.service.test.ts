import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  cleanDb,
  seedTestDepartments,
  createTestUser,
  disconnectTestDb,
} from '../test-utils/db.js';
import { prisma } from '../lib/prisma.js';
import { createShareLink, getSharedReport, revokeShareLink } from './share.service.js';

afterAll(async () => {
  await disconnectTestDb();
});

describe('share.service', () => {
  let financeUser: { id: string; role: string; email: string };
  let adminUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();

    const depts = await seedTestDepartments();

    const finance = await createTestUser('FINANCE', {
      departmentId: depts.get('Finance'),
    });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };

    const admin = await createTestUser('ADMIN');
    adminUser = { id: admin.id, role: admin.role, email: admin.email };
  });

  describe('createShareLink', () => {
    it('creates a token with correct 30-day expiry and returns shareUrl', async () => {
      const before = new Date();

      const result = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', financeUser);

      expect(result.token).toBeDefined();
      expect(result.token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.shareUrl).toBe(`/reports/shared/${result.token}`);
      expect(result.expiresAt).toBeDefined();

      // Verify expiry is approximately 30 days from now
      const expiresAt = new Date(result.expiresAt);
      const expectedMinExpiry = new Date(before);
      expectedMinExpiry.setDate(expectedMinExpiry.getDate() + 29);
      const expectedMaxExpiry = new Date(before);
      expectedMaxExpiry.setDate(expectedMaxExpiry.getDate() + 31);

      expect(expiresAt.getTime()).toBeGreaterThan(expectedMinExpiry.getTime());
      expect(expiresAt.getTime()).toBeLessThan(expectedMaxExpiry.getTime());

      // Verify DB row
      const row = await prisma.sharedReportToken.findUnique({
        where: { id: result.token },
      });
      expect(row).not.toBeNull();
      expect(row!.reportType).toBe('project');
      expect(row!.periodMonth).toBe(3);
      expect(row!.periodYear).toBe(2026);
      expect(row!.createdById).toBe(financeUser.id);
      expect(row!.revokedAt).toBeNull();
    });

    it('rejects invalid period format', async () => {
      await expect(
        createShareLink('project', '00000000-0000-0000-0000-000000000000', 'invalid', financeUser),
      ).rejects.toThrow('Period must be in YYYY-MM format with month 1-12');
    });

    it('rejects out-of-range month', async () => {
      await expect(
        createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-13', financeUser),
      ).rejects.toThrow('Period must be in YYYY-MM format with month 1-12');
    });

    it('stores snapshot data as JSONB', async () => {
      const result = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', financeUser);

      const row = await prisma.sharedReportToken.findUnique({
        where: { id: result.token },
      });
      expect(row).not.toBeNull();
      // snapshotData should be stored (could be empty array if no calculation data)
      expect(row!.snapshotData).toBeDefined();
    });
  });

  describe('getSharedReport', () => {
    it('returns snapshot data for a valid, non-expired, non-revoked token', async () => {
      const shareResult = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', financeUser);

      const report = await getSharedReport(shareResult.token);

      expect(report.snapshotData).toBeDefined();
      expect(report.reportType).toBe('project');
      expect(report.createdAt).toBeDefined();
      expect(report.expiresAt).toBeDefined();
    });

    it('throws GoneError with LINK_EXPIRED for expired token', async () => {
      const shareResult = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', financeUser);

      // Manually set expiresAt to the past
      await prisma.sharedReportToken.update({
        where: { id: shareResult.token },
        data: { expiresAt: new Date('2020-01-01') },
      });

      await expect(getSharedReport(shareResult.token)).rejects.toThrow(
        'This share link has expired',
      );

      try {
        await getSharedReport(shareResult.token);
      } catch (err: unknown) {
        const error = err as { code: string };
        expect(error.code).toBe('LINK_EXPIRED');
      }
    });

    it('throws GoneError with LINK_REVOKED for revoked token', async () => {
      const shareResult = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', financeUser);

      // Manually revoke
      await prisma.sharedReportToken.update({
        where: { id: shareResult.token },
        data: { revokedAt: new Date() },
      });

      await expect(getSharedReport(shareResult.token)).rejects.toThrow(
        'This share link has been revoked',
      );

      try {
        await getSharedReport(shareResult.token);
      } catch (err: unknown) {
        const error = err as { code: string };
        expect(error.code).toBe('LINK_REVOKED');
      }
    });

    it('throws NotFoundError for non-existent token', async () => {
      await expect(
        getSharedReport('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Share link not found');
    });
  });

  describe('revokeShareLink', () => {
    it('sets revokedAt on the token', async () => {
      const shareResult = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', adminUser);

      await revokeShareLink(shareResult.token);

      const row = await prisma.sharedReportToken.findUnique({
        where: { id: shareResult.token },
      });
      expect(row!.revokedAt).not.toBeNull();
    });

    it('makes subsequent getSharedReport return 410 LINK_REVOKED', async () => {
      const shareResult = await createShareLink('project', '00000000-0000-0000-0000-000000000000', '2026-03', adminUser);

      await revokeShareLink(shareResult.token);

      await expect(getSharedReport(shareResult.token)).rejects.toThrow(
        'This share link has been revoked',
      );
    });

    it('throws NotFoundError for non-existent token', async () => {
      await expect(
        revokeShareLink('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Share link not found');
    });
  });
});

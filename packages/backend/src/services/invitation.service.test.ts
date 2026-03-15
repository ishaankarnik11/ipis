import crypto from 'node:crypto';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, createTestUser, disconnectTestDb } from '../test-utils/db.js';

vi.mock('./email.service.js', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

import { createInvitation, validateInvitation, completeProfile } from './invitation.service.js';

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('invitation.service', () => {
  beforeEach(async () => {
    await cleanDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createInvitation', () => {
    it('creates InvitationToken with 48-hour expiry', async () => {
      const user = await createTestUser('FINANCE', { email: 'invite@test.com', status: 'INVITED' });

      await createInvitation(user.id, user.email, user.role);

      const tokens = await prisma.invitationToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].hashedToken).toBeTruthy();
      expect(tokens[0].usedAt).toBeNull();

      const diffHours = (tokens[0].expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(diffHours).toBeGreaterThan(47);
      expect(diffHours).toBeLessThanOrEqual(48);
    });

    it('invalidates previous unused invitations', async () => {
      const user = await createTestUser('HR', { email: 'reinvite@test.com', status: 'INVITED' });

      await createInvitation(user.id, user.email, user.role);
      await createInvitation(user.id, user.email, user.role);

      const validTokens = await prisma.invitationToken.findMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      });
      expect(validTokens).toHaveLength(1);
    });
  });

  describe('validateInvitation', () => {
    it('returns valid with email and role for unexpired unused token', async () => {
      const user = await createTestUser('FINANCE', { email: 'valid@test.com', status: 'INVITED' });
      const token = crypto.randomUUID();

      await prisma.invitationToken.create({
        data: { userId: user.id, hashedToken: hashSha256(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
      });

      const result = await validateInvitation(token);

      expect(result.valid).toBe(true);
      expect(result.data).toMatchObject({ email: 'valid@test.com', role: 'FINANCE' });
      expect(Array.isArray(result.data!.departments)).toBe(true);
    });

    it('returns INVITATION_EXPIRED for expired token', async () => {
      const user = await createTestUser('HR', { email: 'expired@test.com', status: 'INVITED' });
      const token = crypto.randomUUID();

      await prisma.invitationToken.create({
        data: { userId: user.id, hashedToken: hashSha256(token), expiresAt: new Date(Date.now() - 1000) },
      });

      const result = await validateInvitation(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVITATION_EXPIRED');
    });

    it('returns INVITATION_USED for already-used token', async () => {
      const user = await createTestUser('ADMIN', { email: 'used@test.com', status: 'ACTIVE' });
      const token = crypto.randomUUID();

      await prisma.invitationToken.create({
        data: { userId: user.id, hashedToken: hashSha256(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), usedAt: new Date() },
      });

      const result = await validateInvitation(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVITATION_USED');
    });

    it('returns INVITATION_INVALID for non-existent token', async () => {
      const result = await validateInvitation('non-existent-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVITATION_INVALID');
    });
  });

  describe('completeProfile', () => {
    it('sets user to ACTIVE with name and issues JWT', async () => {
      const user = await createTestUser('FINANCE', { email: 'complete@test.com', status: 'INVITED' });
      const token = crypto.randomUUID();

      await prisma.invitationToken.create({
        data: { userId: user.id, hashedToken: hashSha256(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
      });

      const result = await completeProfile({ token, name: 'Jane Finance' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ email: 'complete@test.com', name: 'Jane Finance', role: 'FINANCE' });
      expect(result.jwtToken).toBeTruthy();

      // Verify DB state
      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.status).toBe('ACTIVE');
      expect(updated!.name).toBe('Jane Finance');

      // Verify invitation marked used
      const inv = await prisma.invitationToken.findFirst({ where: { userId: user.id } });
      expect(inv!.usedAt).not.toBeNull();
    });

    it('rejects expired invitation', async () => {
      const user = await createTestUser('HR', { email: 'exp-complete@test.com', status: 'INVITED' });
      const token = crypto.randomUUID();

      await prisma.invitationToken.create({
        data: { userId: user.id, hashedToken: hashSha256(token), expiresAt: new Date(Date.now() - 1000) },
      });

      const result = await completeProfile({ token, name: 'Should Fail' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVITATION_EXPIRED');
    });

    it('rejects missing/short name', async () => {
      await expect(
        completeProfile({ token: 'any', name: 'A' }),
      ).rejects.toThrow('Name is required');
    });

    it('rejects invalid token', async () => {
      const result = await completeProfile({ token: 'nonexistent', name: 'Jane Doe' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVITATION_INVALID');
    });
  });
});

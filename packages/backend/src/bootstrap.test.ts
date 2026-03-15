import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from './lib/prisma.js';
import { cleanDb, disconnectTestDb } from './test-utils/db.js';
import { bootstrapAdmin } from './bootstrap.js';

// Mock email service — bootstrap may try to send email
vi.mock('./services/email.service.js', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendWelcomeEmail } from './services/email.service.js';
const mockSendWelcome = sendWelcomeEmail as ReturnType<typeof vi.fn>;

describe('bootstrapAdmin', () => {
  beforeEach(async () => {
    await cleanDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('creates admin user when DB is empty and ADMIN_EMAIL is set', async () => {
    process.env['ADMIN_EMAIL'] = 'admin@bootstrap.test';

    await bootstrapAdmin();

    const user = await prisma.user.findUnique({ where: { email: 'admin@bootstrap.test' } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('ADMIN');
    expect(user!.status).toBe('INVITED');
    expect(user!.name).toBeNull();

    delete process.env['ADMIN_EMAIL'];
  });

  it('creates InvitationToken with 48-hour expiry', async () => {
    process.env['ADMIN_EMAIL'] = 'admin@bootstrap.test';

    await bootstrapAdmin();

    const user = await prisma.user.findUnique({ where: { email: 'admin@bootstrap.test' } });
    const tokens = await prisma.invitationToken.findMany({
      where: { userId: user!.id },
    });

    expect(tokens).toHaveLength(1);
    const token = tokens[0];
    expect(token.hashedToken).toBeTruthy();
    expect(token.usedAt).toBeNull();

    // Expiry should be ~48 hours from now
    const diffMs = token.expiresAt.getTime() - Date.now();
    const diffHours = diffMs / (60 * 60 * 1000);
    expect(diffHours).toBeGreaterThan(47);
    expect(diffHours).toBeLessThanOrEqual(48);

    delete process.env['ADMIN_EMAIL'];
  });

  it('sends welcome email to the admin', async () => {
    process.env['ADMIN_EMAIL'] = 'admin@bootstrap.test';

    await bootstrapAdmin();

    expect(mockSendWelcome).toHaveBeenCalledWith(
      'admin@bootstrap.test',
      expect.stringContaining('/accept-invitation/'),
      'ADMIN',
    );

    delete process.env['ADMIN_EMAIL'];
  });

  it('skips when users already exist (idempotent)', async () => {
    // Create an existing user first
    await prisma.user.create({
      data: { email: 'existing@test.com', role: 'HR', status: 'ACTIVE' },
    });

    process.env['ADMIN_EMAIL'] = 'admin@bootstrap.test';

    await bootstrapAdmin();

    // No new admin should be created
    const admin = await prisma.user.findUnique({ where: { email: 'admin@bootstrap.test' } });
    expect(admin).toBeNull();
    expect(mockSendWelcome).not.toHaveBeenCalled();

    delete process.env['ADMIN_EMAIL'];
  });

  it('does not crash when ADMIN_EMAIL is not set', async () => {
    delete process.env['ADMIN_EMAIL'];

    await expect(bootstrapAdmin()).resolves.toBeUndefined();

    const userCount = await prisma.user.count();
    expect(userCount).toBe(0);
  });

  it('does not create duplicate admin on second run', async () => {
    process.env['ADMIN_EMAIL'] = 'admin@bootstrap.test';

    await bootstrapAdmin();
    await bootstrapAdmin(); // Second run

    const users = await prisma.user.findMany({ where: { email: 'admin@bootstrap.test' } });
    expect(users).toHaveLength(1);

    delete process.env['ADMIN_EMAIL'];
  });
});

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, createTestUser, disconnectTestDb } from '../test-utils/db.js';

// Mock email to avoid SMTP dependency in unit tests
vi.mock('./email.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import { requestOtp, verifyOtp } from './otp.service.js';

describe('otp.service', () => {
  beforeEach(async () => {
    await cleanDb();
    vi.clearAllMocks();
    delete process.env['MASTER_OTP'];
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('requestOtp', () => {
    it('creates OtpToken for active user', async () => {
      const user = await createTestUser('ADMIN', { email: 'active@test.com', status: 'ACTIVE' });

      const result = await requestOtp('active@test.com');

      expect(result.success).toBe(true);

      const tokens = await prisma.otpToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].hashedOtp).toBeTruthy();
      expect(tokens[0].attempts).toBe(0);
      expect(tokens[0].usedAt).toBeNull();

      // Expiry should be ~5 minutes from now
      const diffMs = tokens[0].expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(4 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(5 * 60 * 1000);
    });

    it('returns success for non-existent email (anti-enumeration)', async () => {
      const result = await requestOtp('nobody@test.com');
      expect(result.success).toBe(true);

      const tokenCount = await prisma.otpToken.count();
      expect(tokenCount).toBe(0);
    });

    it('returns success for deactivated user without sending OTP', async () => {
      await createTestUser('FINANCE', { email: 'deactivated@test.com', status: 'DEACTIVATED' });

      const result = await requestOtp('deactivated@test.com');
      expect(result.success).toBe(true);

      const tokenCount = await prisma.otpToken.count();
      expect(tokenCount).toBe(0);
    });

    it('returns PROFILE_INCOMPLETE for invited user', async () => {
      await createTestUser('HR', { email: 'invited@test.com', status: 'INVITED' });

      const result = await requestOtp('invited@test.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('PROFILE_INCOMPLETE');
    });

    it('invalidates previous OTPs when new one is requested', async () => {
      const user = await createTestUser('ADMIN', { email: 'reissue@test.com', status: 'ACTIVE' });

      await requestOtp('reissue@test.com');
      await requestOtp('reissue@test.com');

      const validTokens = await prisma.otpToken.findMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      });
      // Only the latest should be valid
      expect(validTokens).toHaveLength(1);
    });

    it('rate limits after 5 requests in 10 minutes', async () => {
      const user = await createTestUser('ADMIN', { email: 'ratelimit@test.com', status: 'ACTIVE' });

      for (let i = 0; i < 5; i++) {
        await requestOtp('ratelimit@test.com');
      }

      const result = await requestOtp('ratelimit@test.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('RATE_LIMITED');
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('verifyOtp', () => {
    it('verifies correct OTP and returns JWT token', async () => {
      const user = await createTestUser('ADMIN', { email: 'verify@test.com', status: 'ACTIVE' });

      // Create a known OTP token
      const crypto = await import('node:crypto');
      const otp = '123456';
      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      await prisma.otpToken.create({
        data: {
          userId: user.id,
          hashedOtp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const result = await verifyOtp('verify@test.com', '123456');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: user.id, email: 'verify@test.com', role: 'ADMIN' });
      expect(result.token).toBeTruthy();

      // Token should be marked as used
      const tokens = await prisma.otpToken.findMany({ where: { userId: user.id } });
      expect(tokens[0].usedAt).not.toBeNull();
    });

    it('rejects incorrect OTP and increments attempts', async () => {
      const user = await createTestUser('ADMIN', { email: 'wrong@test.com', status: 'ACTIVE' });

      const crypto = await import('node:crypto');
      const hashedOtp = crypto.createHash('sha256').update('123456').digest('hex');

      await prisma.otpToken.create({
        data: {
          userId: user.id,
          hashedOtp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const result = await verifyOtp('wrong@test.com', '999999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_OTP');
      expect(result.attemptsRemaining).toBe(2);

      const token = await prisma.otpToken.findFirst({ where: { userId: user.id } });
      expect(token!.attempts).toBe(1);
    });

    it('returns OTP_EXHAUSTED after 3 wrong attempts', async () => {
      const user = await createTestUser('ADMIN', { email: 'exhaust@test.com', status: 'ACTIVE' });

      const crypto = await import('node:crypto');
      const hashedOtp = crypto.createHash('sha256').update('123456').digest('hex');

      await prisma.otpToken.create({
        data: {
          userId: user.id,
          hashedOtp,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 3, // Already exhausted
        },
      });

      const result = await verifyOtp('exhaust@test.com', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OTP_EXHAUSTED');
    });

    it('returns OTP_EXPIRED for expired token', async () => {
      const user = await createTestUser('ADMIN', { email: 'expired@test.com', status: 'ACTIVE' });

      const crypto = await import('node:crypto');
      const hashedOtp = crypto.createHash('sha256').update('123456').digest('hex');

      await prisma.otpToken.create({
        data: {
          userId: user.id,
          hashedOtp,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const result = await verifyOtp('expired@test.com', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OTP_EXPIRED');
    });

    it('accepts MASTER_OTP when env var is set', async () => {
      const user = await createTestUser('ADMIN', { email: 'master@test.com', status: 'ACTIVE' });
      process.env['MASTER_OTP'] = '000000';

      const result = await verifyOtp('master@test.com', '000000');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: user.id, email: 'master@test.com' });
      expect(result.token).toBeTruthy();

      delete process.env['MASTER_OTP'];
    });

    it('returns INVALID_OTP for non-existent user', async () => {
      const result = await verifyOtp('nobody@test.com', '123456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_OTP');
    });
  });
});

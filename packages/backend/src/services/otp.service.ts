import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { signToken } from '../lib/jwt.js';
import { sendOtpEmail } from './email.service.js';
import { logAuditEvent } from './audit.service.js';
import { AUDIT_ACTIONS } from '@ipis/shared';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export interface RequestOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
}

/**
 * Requests an OTP for the given email. Sends via SMTP if user is ACTIVE.
 * Returns the same response shape regardless of whether the email exists (anti-enumeration).
 */
export async function requestOtp(email: string): Promise<RequestOtpResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // INVITED user — need to complete profile first
  if (user && user.status === 'INVITED') {
    return {
      success: false,
      error: 'PROFILE_INCOMPLETE',
      message: 'Please complete your profile setup first. Check your email for the invitation link.',
    };
  }

  // Non-existent or DEACTIVATED user — return success to prevent enumeration
  if (!user || user.status !== 'ACTIVE') {
    return { success: true, message: 'OTP sent to your email' };
  }

  // Rate limit + OTP creation in transaction to prevent race conditions
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  const rateLimited = await prisma.$transaction(async (tx) => {
    const recentCount = await tx.otpToken.count({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
      const oldestRecent = await tx.otpToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const retryAfterMs = oldestRecent
        ? RATE_LIMIT_WINDOW_MS - (Date.now() - oldestRecent.createdAt.getTime())
        : RATE_LIMIT_WINDOW_MS;

      return {
        success: false as const,
        error: 'RATE_LIMITED' as const,
        message: `Too many OTP requests. Please try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    // Invalidate any previous unused OTPs for this user
    await tx.otpToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() },
    });

    await tx.otpToken.create({
      data: {
        userId: user.id,
        hashedOtp,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });

    return null; // Not rate limited
  });

  if (rateLimited) return rateLimited;

  // Dev mode only: log OTP to console for debugging
  if (config.nodeEnv === 'development' && config.masterOtp) {
    logger.info({ email, otp }, '[DEV] OTP for login');
  }

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    logger.error({ err, email }, 'Failed to send OTP email');
    // Still return success — OTP is created, dev can use MASTER_OTP
  }

  return { success: true, message: 'OTP sent to your email' };
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  attemptsRemaining?: number;
  data?: { id: string; name: string | null; email: string; role: string };
  token?: string; // JWT token to set as cookie
}

/**
 * Verifies an OTP code for the given email.
 * Returns JWT token on success for the caller to set as cookie.
 */
export async function verifyOtp(email: string, otp: string, ipAddress?: string): Promise<VerifyOtpResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    return { success: false, error: 'INVALID_OTP', message: 'Invalid email or OTP' };
  }

  // MASTER_OTP bypass — development/test only
  if (config.nodeEnv !== 'production' && config.masterOtp && otp === config.masterOtp) {
    const token = await signToken({ sub: user.id, role: user.role, email: user.email });

    logAuditEvent({
      actorId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
      metadata: { method: 'master_otp' },
    }).catch((err) => logger.warn({ err }, 'Failed to log OTP login audit'));

    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    };
  }

  // Find the latest valid (unused, not expired) OTP token
  const otpToken = await prisma.otpToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpToken) {
    return { success: false, error: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
  }

  if (otpToken.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: 'OTP_EXHAUSTED', message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  const inputHash = hashOtp(otp);
  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(otpToken.hashedOtp, 'hex');
  const isMatch = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);
  if (!isMatch) {
    // Increment attempts
    await prisma.otpToken.update({
      where: { id: otpToken.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = MAX_ATTEMPTS - otpToken.attempts - 1;
    return {
      success: false,
      error: remaining <= 0 ? 'OTP_EXHAUSTED' : 'INVALID_OTP',
      message: remaining <= 0
        ? 'Too many incorrect attempts. Please request a new OTP.'
        : `Invalid OTP`,
      attemptsRemaining: Math.max(0, remaining),
    };
  }

  // OTP is valid — mark as used
  await prisma.otpToken.update({
    where: { id: otpToken.id },
    data: { usedAt: new Date() },
  });

  const token = await signToken({ sub: user.id, role: user.role, email: user.email });

  logAuditEvent({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_LOGIN,
    entityType: 'User',
    entityId: user.id,
    ipAddress: ipAddress ?? null,
    metadata: { method: 'otp' },
  }).catch((err) => logger.warn({ err }, 'Failed to log OTP login audit'));

  return {
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  };
}

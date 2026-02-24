import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../lib/errors.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { sendPasswordResetEmail } from './email.service.js';

const SALT_ROUNDS = 10;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Perform bcrypt work to prevent timing-based user enumeration.
    // Without this, response time reveals whether an email exists.
    await bcrypt.hash(password, SALT_ROUNDS);
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    departmentId: user.departmentId ?? null,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function generateResetToken(): { plaintext: string; hash: string } {
  const plaintext = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    // Fire-and-forget: do not reveal whether email exists
    return;
  }

  const { plaintext, hash } = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    },
  });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${plaintext}`;
  sendPasswordResetEmail(email, resetUrl).catch(() => {});
}

export async function validateResetToken(token: string): Promise<boolean> {
  const hash = hashToken(token);

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  return !!record;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const hash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  });
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { usedAt: { not: null } },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });
  logger.info({ count: result.count }, 'Cleaned up expired password reset tokens');
  return result.count;
}

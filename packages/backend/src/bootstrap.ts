import crypto from 'node:crypto';
import { prisma } from './lib/prisma.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { sendWelcomeEmail } from './services/email.service.js';

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Bootstrap the first admin user from ADMIN_EMAIL env var.
 * Idempotent — only runs when the database has zero users.
 */
export async function bootstrapAdmin(): Promise<void> {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    logger.debug('Bootstrap skipped — users already exist');
    return;
  }

  const adminEmail = process.env['ADMIN_EMAIL'];
  if (!adminEmail) {
    logger.warn('ADMIN_EMAIL not set. No bootstrap admin created. Set ADMIN_EMAIL in .env to create the first admin account.');
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      role: 'ADMIN',
      status: 'INVITED',
    },
  });

  const token = crypto.randomUUID();
  await prisma.invitationToken.create({
    data: {
      userId: user.id,
      hashedToken: hashSha256(token),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const invitationUrl = `${config.frontendUrl}/accept-invitation/${token}`;

  try {
    await sendWelcomeEmail(adminEmail, invitationUrl, 'ADMIN');
    logger.info({ email: adminEmail }, 'Bootstrap: Admin account created. Welcome email sent.');
  } catch (err) {
    // Email may fail in dev without SMTP configured — admin is still created
    logger.warn({ email: adminEmail, err }, 'Bootstrap: Admin created but welcome email failed. Use the invitation URL from logs.');
    logger.info({ invitationUrl }, 'Bootstrap: Invitation URL (email delivery failed)');
  }
}

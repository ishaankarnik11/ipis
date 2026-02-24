import { logger } from '../lib/logger.js';

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  // TODO: Replace with AWS SES in production
  logger.info({ to: email, resetUrl }, 'Password reset email (dev mode — not actually sent)');
}

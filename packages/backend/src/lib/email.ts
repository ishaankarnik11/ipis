import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from './config.js';
import { logger } from './logger.js';

let transporter: Transporter | null = null;

/**
 * Initializes the SMTP transport and verifies the connection.
 * Must be called at app startup. Throws if SMTP is not configured.
 */
export async function initEmailTransport(): Promise<void> {
  const { host, port, user, pass, from } = config.smtp;

  if (!host || !user || !pass || !from) {
    throw new Error(
      'Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env',
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    logger.info({ host, port, user }, 'SMTP transport verified');
  } catch (err) {
    logger.error({ err, host, port, user }, 'SMTP transport verification failed');
    throw new Error(`SMTP connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Creates a transport from a Nodemailer Ethereal test account (for automated tests).
 */
export async function initTestTransport(): Promise<void> {
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  logger.info('Ethereal test transport initialized');
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email via the configured transport.
 * Logs full content in dev mode when MASTER_OTP is set.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!transporter) {
    throw new Error('Email transport not initialized. Call initEmailTransport() first.');
  }

  const from = config.smtp.from || 'IPIS <noreply@example.com>';

  // In dev mode with MASTER_OTP, log the email content for debugging
  if (config.nodeEnv === 'development' && config.masterOtp) {
    logger.info(
      { to: options.to, subject: options.subject, text: options.text },
      'Email content (dev mode)',
    );
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ messageId: info.messageId, to: options.to }, 'Email sent');

    // Log Ethereal preview URL if available (for test accounts)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info({ previewUrl }, 'Email preview (Ethereal)');
    }
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, 'Email send failed');
    throw new Error(`Failed to send email to ${options.to}: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Backwards-compatible plain-text email function.
 * Used by project.service.ts for notification emails (approval, rejection).
 */
export async function sendEmail({ to, subject, body }: { to: string | string[]; subject: string; body: string }): Promise<void> {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  // If transport is not initialized (test env without SMTP), log and skip
  if (!transporter) {
    logger.info({ to: recipients, subject }, 'Email skipped (transport not initialized)');
    return;
  }

  await sendMail({
    to: recipients,
    subject,
    html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${body}</pre>`,
    text: body,
  });
}

/**
 * Returns the current transport (for testing inspection).
 */
export function getTransporter(): Transporter | null {
  return transporter;
}

/**
 * Resets the transport (for testing cleanup).
 */
export function resetTransport(): void {
  transporter = null;
}

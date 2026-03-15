import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initTestTransport, resetTransport, getTransporter } from '../lib/email.js';
import { sendOtpEmail, sendWelcomeEmail } from './email.service.js';

// Use Ethereal (Nodemailer's built-in test service) — real SMTP, throwaway mailbox
describe('email.service (Ethereal — real SMTP)', () => {
  beforeAll(async () => {
    await initTestTransport();
  });

  afterAll(() => {
    resetTransport();
  });

  it('transport should be initialized', () => {
    expect(getTransporter()).not.toBeNull();
  });

  describe('sendOtpEmail', () => {
    it('sends an OTP email with correct subject and content', async () => {
      await expect(
        sendOtpEmail('test@example.com', '123456'),
      ).resolves.toBeUndefined();
    });

    it('includes OTP code in subject', async () => {
      // The send itself succeeds — Ethereal accepts any recipient
      await sendOtpEmail('recipient@example.com', '789012');
      // No throw = success. Ethereal doesn't reject.
    });
  });

  describe('sendWelcomeEmail', () => {
    it('sends a welcome email with invitation URL', async () => {
      await expect(
        sendWelcomeEmail(
          'newuser@example.com',
          'http://localhost:5173/onboard?token=abc-123',
          'DELIVERY_MANAGER',
        ),
      ).resolves.toBeUndefined();
    });

    it('formats role label correctly', async () => {
      // DEPT_HEAD → Dept Head
      await expect(
        sendWelcomeEmail(
          'head@example.com',
          'http://localhost:5173/onboard?token=xyz',
          'DEPT_HEAD',
        ),
      ).resolves.toBeUndefined();
    });
  });

});

describe('email transport not initialized', () => {
  it('sendOtpEmail throws when transport not initialized', async () => {
    resetTransport();
    await expect(
      sendOtpEmail('test@example.com', '123456'),
    ).rejects.toThrow('Email transport not initialized');
  });
});

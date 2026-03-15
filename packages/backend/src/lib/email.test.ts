import { describe, it, expect, afterEach, vi } from 'vitest';
import { resetTransport, sendMail } from './email.js';

describe('email transport', () => {
  afterEach(() => {
    resetTransport();
  });

  it('sendMail throws when transport not initialized', async () => {
    resetTransport();
    await expect(
      sendMail({ to: 'test@example.com', subject: 'Test', html: '<p>Test</p>', text: 'Test' }),
    ).rejects.toThrow('Email transport not initialized');
  });
});

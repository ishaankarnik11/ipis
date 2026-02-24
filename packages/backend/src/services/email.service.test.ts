import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { sendPasswordResetEmail } from './email.service.js';
import { logger } from '../lib/logger.js';

const mockLogInfo = logger.info as ReturnType<typeof vi.fn>;

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log the reset URL with recipient email in dev mode', async () => {
    await sendPasswordResetEmail('user@test.com', 'http://localhost:5173/reset-password?token=abc-123');

    expect(mockLogInfo).toHaveBeenCalledWith(
      { to: 'user@test.com', resetUrl: 'http://localhost:5173/reset-password?token=abc-123' },
      'Password reset email (dev mode — not actually sent)',
    );
  });

  it('should resolve void without throwing', async () => {
    await expect(
      sendPasswordResetEmail('user@test.com', 'http://localhost:5173/reset-password?token=abc-123'),
    ).resolves.toBeUndefined();
  });
});

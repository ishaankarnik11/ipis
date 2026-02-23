import { describe, it, expect, vi } from 'vitest';
import { signToken, verifyToken } from './jwt.js';
import { UnauthorizedError } from './errors.js';

// Mock config to provide a stable JWT secret for tests
vi.mock('./config.js', () => ({
  config: {
    jwtSecret: 'test-secret-key-that-is-long-enough-for-hs256',
  },
}));

describe('JWT utilities', () => {
  const payload = { sub: 'user-123', role: 'ADMIN', email: 'test@test.com' };

  it('should sign and verify a token round-trip', async () => {
    const token = await signToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const verified = await verifyToken(token);
    expect(verified.sub).toBe('user-123');
    expect(verified.role).toBe('ADMIN');
    expect(verified.email).toBe('test@test.com');
  });

  it('should reject an invalid token', async () => {
    await expect(verifyToken('invalid.token.here')).rejects.toThrow(UnauthorizedError);
  });

  it('should reject a tampered token', async () => {
    const token = await signToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyToken(tampered)).rejects.toThrow(UnauthorizedError);
  });
});

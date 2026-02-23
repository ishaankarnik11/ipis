import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { authMiddleware } from './auth.middleware.js';
import { UnauthorizedError } from '../lib/errors.js';

// Mock JWT utilities
vi.mock('../lib/jwt.js', () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
}));

// Mock config (required since auth.middleware imports config)
vi.mock('../lib/config.js', () => ({
  config: {
    nodeEnv: 'test',
  },
}));

import { verifyToken, signToken } from '../lib/jwt.js';

const mockVerify = verifyToken as ReturnType<typeof vi.fn>;
const mockSign = signToken as ReturnType<typeof vi.fn>;

function createMockReq(cookies: Record<string, string> = {}): Partial<Request> {
  return { cookies };
}

function createMockRes(): Partial<Response> {
  return {
    cookie: vi.fn(),
  };
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw UnauthorizedError when no cookie is present', async () => {
    const req = createMockReq({}) as Request;
    const res = createMockRes() as Response;

    await expect(authMiddleware(req, res, vi.fn())).rejects.toThrow(UnauthorizedError);
  });

  it('should attach user to request on valid token', async () => {
    mockVerify.mockResolvedValue({ sub: 'user-1', role: 'ADMIN', email: 'test@test.com' });
    mockSign.mockResolvedValue('new-token');

    const req = createMockReq({ ipis_token: 'valid-token' }) as Request;
    const res = createMockRes() as Response;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', role: 'ADMIN', email: 'test@test.com' });
    expect(next).toHaveBeenCalled();
  });

  it('should set a fresh cookie for sliding expiry', async () => {
    mockVerify.mockResolvedValue({ sub: 'user-1', role: 'ADMIN', email: 'test@test.com' });
    mockSign.mockResolvedValue('refreshed-token');

    const req = createMockReq({ ipis_token: 'valid-token' }) as Request;
    const res = createMockRes() as Response;

    await authMiddleware(req, res, vi.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      'ipis_token',
      'refreshed-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
  });

  it('should throw UnauthorizedError on expired token', async () => {
    mockVerify.mockRejectedValue(new UnauthorizedError('Session expired'));

    const req = createMockReq({ ipis_token: 'expired-token' }) as Request;
    const res = createMockRes() as Response;

    await expect(authMiddleware(req, res, vi.fn())).rejects.toThrow('Session expired');
  });
});

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@ipis/shared';
import { verifyToken, signToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import { config } from '../lib/config.js';

const COOKIE_NAME = 'ipis_token';
const COOKIE_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours in ms

export function getCookieName(): string {
  return COOKIE_NAME;
}

export function getCookieOptions(nodeEnv: string) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: nodeEnv === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  const payload = await verifyToken(token);

  req.user = {
    id: payload.sub,
    role: payload.role as UserRole,
    email: payload.email,
  };

  // Sliding expiry: re-issue token with fresh 2h window
  const newToken = await signToken({
    sub: payload.sub,
    role: payload.role,
    email: payload.email,
  });

  res.cookie(COOKIE_NAME, newToken, getCookieOptions(config.nodeEnv));

  next();
}

import { SignJWT, jwtVerify, errors } from 'jose';
import { config } from './config.js';
import { UnauthorizedError } from './errors.js';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

export interface JwtPayload {
  sub: string;
  role: string;
  email: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      role: payload.role as string,
      email: payload.email as string,
    };
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      throw new UnauthorizedError('Session expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

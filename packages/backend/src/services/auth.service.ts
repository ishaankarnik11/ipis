import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Gets the current authenticated user's profile.
 * Used by GET /auth/me after OTP-based session is established.
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('User not found or not active');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    departmentId: user.departmentId ?? null,
    status: user.status,
  };
}

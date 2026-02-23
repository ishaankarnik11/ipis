import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../lib/errors.js';

const SALT_ROUNDS = 10;

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Perform bcrypt work to prevent timing-based user enumeration.
    // Without this, response time reveals whether an email exists.
    await bcrypt.hash(password, SALT_ROUNDS);
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    departmentId: user.departmentId ?? null,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

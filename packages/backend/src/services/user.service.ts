import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { ConflictError } from '../lib/errors.js';

const SALT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  isActive: true,
} as const;

function generateTemporaryPassword(): string {
  return crypto.randomUUID().slice(0, 12);
}

export async function createUser(data: {
  name: string;
  email: string;
  role: string;
  departmentId?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role as never,
      departmentId: data.departmentId ?? null,
      passwordHash,
      isActive: true,
      mustChangePassword: true,
    },
    select: USER_SELECT,
  });

  return { ...user, temporaryPassword };
}

export async function getAll() {
  return prisma.user.findMany({
    select: USER_SELECT,
  });
}

export async function getAllDepartments() {
  return prisma.department.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    role?: string;
    departmentId?: string | null;
    isActive?: boolean;
  },
) {
  return prisma.user.update({
    where: { id },
    data: data as never,
    select: USER_SELECT,
  });
}

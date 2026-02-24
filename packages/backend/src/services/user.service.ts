import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { UserRole } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';

const SALT_ROUNDS = 10;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  isActive: true,
  department: { select: { name: true } },
} as const;

function flattenUser(user: { department: { name: string } | null; [key: string]: unknown }) {
  const { department, ...rest } = user;
  return { ...rest, departmentName: department?.name ?? null };
}

function generateTemporaryPassword(): string {
  return crypto.randomUUID().slice(0, 12);
}

export async function createUser(data: CreateUserInput) {
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
      role: data.role as UserRole,
      departmentId: data.departmentId ?? null,
      passwordHash,
      isActive: true,
      mustChangePassword: true,
    },
    select: USER_SELECT,
  });

  return { ...flattenUser(user), temporaryPassword };
}

export async function getAll() {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
  });
  return users.map(flattenUser);
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

export async function updateUser(id: string, data: UpdateUserInput) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        role: data.role ? (data.role as UserRole) : undefined,
      },
      select: USER_SELECT,
    });
    return flattenUser(user);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }
}

import type { UserRole, UserStatus } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from '@ipis/shared';
import { AUDIT_ACTIONS } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logAuditEvent } from './audit.service.js';
import { createInvitation } from './invitation.service.js';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true,
  department: { select: { name: true } },
} as const;

function flattenUser<T extends { department: { name: string } | null }>(user: T) {
  const { department, ...rest } = user;
  return { ...rest, departmentName: department?.name ?? null };
}

export async function createUser(data: CreateUserInput, actorId?: string, ipAddress?: string) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      name: data.name ?? null,
      email: data.email,
      role: data.role as UserRole,
      departmentId: data.departmentId ?? null,
      status: 'INVITED',
    },
    select: USER_SELECT,
  });

  void logAuditEvent({
    actorId: actorId ?? null,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    ipAddress: ipAddress ?? null,
    metadata: { email: data.email, role: data.role },
  });

  // Send invitation email (non-blocking — user is created even if email fails)
  createInvitation(user.id, data.email, data.role).catch((err) => {
    logger.error({ err, email: data.email }, 'Failed to create invitation for new user');
  });

  return flattenUser(user);
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

export async function updateUser(id: string, data: UpdateUserInput, actorId?: string, ipAddress?: string) {
  // Prevent self-deactivation
  if (data.status === 'DEACTIVATED' && actorId && actorId === id) {
    throw new ValidationError('You cannot deactivate your own account');
  }

  // Prevent losing all admins — guard deactivation AND role changes away from ADMIN
  const isDeactivating = data.status === 'DEACTIVATED';
  const isChangingRoleFromAdmin = data.role != null && data.role !== 'ADMIN';

  if (isDeactivating || isChangingRoleFromAdmin) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (target?.role === 'ADMIN' && target.status === 'ACTIVE') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (activeAdminCount <= 1) {
        const action = isDeactivating ? 'deactivate' : 'change the role of';
        throw new ValidationError(`Cannot ${action} the last active admin user`);
      }
    }
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role as UserRole;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.status !== undefined) updateData.status = data.status as UserStatus;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    void logAuditEvent({
      actorId: actorId ?? null,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'User',
      entityId: id,
      ipAddress: ipAddress ?? null,
      metadata: JSON.parse(JSON.stringify(data)),
    });

    if (data.status === 'DEACTIVATED') {
      void logAuditEvent({
        actorId: actorId ?? null,
        action: AUDIT_ACTIONS.USER_DEACTIVATED,
        entityType: 'User',
        entityId: id,
        ipAddress: ipAddress ?? null,
      });
    }

    return flattenUser(user);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }
}

export async function resendInvitation(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.status !== 'INVITED') {
    throw new ValidationError('Can only resend invitation for users with INVITED status');
  }

  await createInvitation(user.id, user.email, user.role);
}

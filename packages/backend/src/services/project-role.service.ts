import type { CreateProjectRoleInput, UpdateProjectRoleInput } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

export async function createRole(data: CreateProjectRoleInput) {
  const existing = await prisma.projectRole.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new ConflictError('A project role with this name already exists');
  }

  const role = await prisma.projectRole.create({
    data: { name: data.name },
  });

  return {
    id: role.id,
    name: role.name,
    isActive: role.isActive,
    createdAt: role.createdAt,
  };
}

export async function getAllRoles(activeOnly?: boolean) {
  const where = activeOnly ? { isActive: true } : {};

  const roles = await prisma.projectRole.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));
}

export async function updateRole(id: string, data: UpdateProjectRoleInput) {
  const existing = await prisma.projectRole.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Project role not found');
  }

  const updated = await prisma.projectRole.update({
    where: { id },
    data: { isActive: data.isActive },
  });

  return {
    id: updated.id,
    name: updated.name,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
  };
}

export async function validateRoleId(roleId: string): Promise<void> {
  const role = await prisma.projectRole.findUnique({
    where: { id: roleId },
    select: { isActive: true },
  });

  if (!role || !role.isActive) {
    throw new ValidationError('Invalid or inactive project role');
  }
}

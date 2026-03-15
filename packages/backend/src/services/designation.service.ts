import type { CreateDesignationInput, UpdateDesignationInput } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

export async function createDesignation(data: CreateDesignationInput) {
  const existing = await prisma.designation.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new ConflictError('A designation with this name already exists');
  }

  const designation = await prisma.designation.create({
    data: {
      name: data.name,
      departmentId: data.departmentId ?? null,
    },
    include: { department: { select: { id: true, name: true } } },
  });

  return {
    id: designation.id,
    name: designation.name,
    departmentId: designation.departmentId,
    departmentName: designation.department?.name ?? null,
    isActive: designation.isActive,
    createdAt: designation.createdAt,
  };
}

export async function getAllDesignations(activeOnly?: boolean) {
  const where = activeOnly ? { isActive: true } : {};

  const designations = await prisma.designation.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { department: { select: { id: true, name: true } } },
  });

  return designations.map((d) => ({
    id: d.id,
    name: d.name,
    departmentId: d.departmentId,
    departmentName: d.department?.name ?? null,
    isActive: d.isActive,
    createdAt: d.createdAt,
  }));
}

export async function updateDesignation(id: string, data: UpdateDesignationInput) {
  const existing = await prisma.designation.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Designation not found');
  }

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.designation.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
    });
    if (duplicate) {
      throw new ConflictError('A designation with this name already exists');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.designation.update({
    where: { id },
    data: updateData,
    include: { department: { select: { id: true, name: true } } },
  });

  return {
    id: updated.id,
    name: updated.name,
    departmentId: updated.departmentId,
    departmentName: updated.department?.name ?? null,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
  };
}

export async function validateDesignationId(designationId: string): Promise<void> {
  const designation = await prisma.designation.findUnique({
    where: { id: designationId },
    select: { isActive: true },
  });

  if (!designation || !designation.isActive) {
    throw new ValidationError('Invalid or inactive designation');
  }
}

// Backwards-compatible aliases
export const createRole = createDesignation;
export const getAllRoles = getAllDesignations;
export const updateRole = updateDesignation;
export const validateRoleId = validateDesignationId;

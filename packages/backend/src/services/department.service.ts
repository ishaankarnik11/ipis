import type { CreateDepartmentInput, UpdateDepartmentInput } from '@ipis/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  headUserId: true,
  isActive: true,
  createdAt: true,
  _count: { select: { employees: { where: { isResigned: false } } } },
} as const;

function formatDepartment(dept: {
  id: string;
  name: string;
  headUserId: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: { employees: number };
}) {
  return {
    id: dept.id,
    name: dept.name,
    headUserId: dept.headUserId,
    isActive: dept.isActive,
    createdAt: dept.createdAt,
    employeeCount: dept._count.employees,
  };
}

export async function createDepartment(data: CreateDepartmentInput) {
  const existing = await prisma.department.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new ConflictError('A department with this name already exists');
  }

  if (data.headUserId) {
    const headUser = await prisma.user.findUnique({
      where: { id: data.headUserId },
      select: { role: true, status: true },
    });
    if (!headUser) {
      throw new ValidationError('Department head user not found');
    }
    if (headUser.status !== 'ACTIVE') {
      throw new ValidationError('Department head user is not active');
    }
    if (headUser.role !== 'DEPT_HEAD') {
      throw new ValidationError('Department head must have the DEPT_HEAD role');
    }
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: data.name,
        headUserId: data.headUserId ?? null,
      },
      select: DEPARTMENT_SELECT,
    });

    return formatDepartment(department);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('A department with this name already exists');
    }
    throw err;
  }
}

export async function getAllDepartments(activeOnly?: boolean) {
  const where = activeOnly ? { isActive: true } : {};

  const departments = await prisma.department.findMany({
    where,
    orderBy: { name: 'asc' },
    select: DEPARTMENT_SELECT,
  });

  return departments.map(formatDepartment);
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput) {
  const existing = await prisma.department.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Department not found');
  }

  if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.department.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
    });
    if (duplicate) {
      throw new ConflictError('A department with this name already exists');
    }
  }

  if (data.headUserId) {
    const headUser = await prisma.user.findUnique({
      where: { id: data.headUserId },
      select: { role: true, status: true },
    });
    if (!headUser) {
      throw new ValidationError('Department head user not found');
    }
    if (headUser.status !== 'ACTIVE') {
      throw new ValidationError('Department head user is not active');
    }
    if (headUser.role !== 'DEPT_HEAD') {
      throw new ValidationError('Department head must have the DEPT_HEAD role');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.headUserId !== undefined) updateData.headUserId = data.headUserId;

  const updated = await prisma.department.update({
    where: { id },
    data: updateData,
    select: DEPARTMENT_SELECT,
  });

  return formatDepartment(updated);
}

export async function deactivateDepartment(id: string) {
  const existing = await prisma.department.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      _count: { select: { employees: { where: { isResigned: false } } } },
    },
  });

  if (!existing) {
    throw new NotFoundError('Department not found');
  }

  if (!existing.isActive) {
    throw new ValidationError('Department is already inactive');
  }

  if (existing._count.employees > 0) {
    throw new ValidationError(
      `Cannot deactivate department with ${existing._count.employees} active employee${existing._count.employees === 1 ? '' : 's'}. Reassign employees first.`,
    );
  }

  const updated = await prisma.department.update({
    where: { id },
    data: { isActive: false },
    select: DEPARTMENT_SELECT,
  });

  return formatDepartment(updated);
}

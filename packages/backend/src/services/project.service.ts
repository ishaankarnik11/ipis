import type { CreateProjectInput, UpdateProjectInput, AddTeamMemberInput } from '@ipis/shared';
import type { EngagementModel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

interface RequestUser {
  id: string;
  role: string;
  email: string;
}

const PROJECT_SELECT = {
  id: true,
  name: true,
  client: true,
  vertical: true,
  engagementModel: true,
  status: true,
  contractValuePaise: true,
  deliveryManagerId: true,
  rejectionComment: true,
  completionPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_SELECT }>;

function serializeProject(project: ProjectRow) {
  return {
    ...project,
    contractValuePaise: project.contractValuePaise != null
      ? Number(project.contractValuePaise)
      : null,
    completionPercent: project.completionPercent != null
      ? Number(project.completionPercent)
      : null,
  };
}

async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

async function getDmEmail(deliveryManagerId: string): Promise<string> {
  const dm = await prisma.user.findUnique({
    where: { id: deliveryManagerId },
    select: { email: true },
  });
  return dm?.email ?? '';
}

/**
 * Atomically update a project's status, guarding against TOCTOU races.
 * Uses the expected current status in the where clause so the update is a no-op
 * if another request already changed the status.
 */
async function atomicStatusTransition(
  id: string,
  expectedStatus: string,
  data: Prisma.ProjectUpdateInput,
): Promise<{ id: string; name: string; deliveryManagerId: string }> {
  try {
    const updated = await prisma.project.update({
      where: { id, status: expectedStatus as Prisma.EnumProjectStatusFilter['equals'] },
      data,
      select: { id: true, name: true, deliveryManagerId: true },
    });
    return updated;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      // Either project doesn't exist, or status already changed
      const existing = await prisma.project.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundError('Project not found');
      }
      throw new ValidationError(
        `Cannot perform this action: project status is ${existing.status}, expected ${expectedStatus}`,
      );
    }
    throw error;
  }
}

export async function createProject(data: CreateProjectInput, user: RequestUser) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      client: data.client,
      vertical: data.vertical,
      engagementModel: data.engagementModel as EngagementModel,
      contractValuePaise: data.contractValuePaise ?? null,
      deliveryManagerId: user.id,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    select: PROJECT_SELECT,
  });

  // Fire-and-forget email to admins
  getAdminEmails()
    .then((emails) => {
      if (emails.length > 0) {
        return sendEmail({
          to: emails,
          subject: `New project pending approval: ${data.name}`,
          body: `A new project "${data.name}" has been submitted for approval by ${user.email}.`,
        });
      }
    })
    .catch((err) => logger.error(err, 'Failed to send project creation email'));

  return serializeProject(project);
}

export async function getAll(user: RequestUser) {
  let where: Prisma.ProjectWhereInput = {};

  if (user.role === 'ADMIN' || user.role === 'FINANCE') {
    where = {};
  } else if (user.role === 'DEPT_HEAD') {
    // DEPT_HEAD sees projects whose delivery manager shares the same department
    const deptHead = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (deptHead?.departmentId) {
      where = { deliveryManager: { departmentId: deptHead.departmentId } };
    } else {
      where = { deliveryManagerId: user.id };
    }
  } else {
    // DELIVERY_MANAGER — own projects only
    where = { deliveryManagerId: user.id };
  }

  const projects = await prisma.project.findMany({
    where,
    select: PROJECT_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return projects.map(serializeProject);
}

export async function getById(id: string, user: RequestUser) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: PROJECT_SELECT,
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Ownership check for DM
  if (
    user.role === 'DELIVERY_MANAGER' &&
    project.deliveryManagerId !== user.id
  ) {
    throw new ForbiddenError('Access denied');
  }

  return serializeProject(project);
}

export async function approveProject(id: string) {
  const project = await atomicStatusTransition(id, 'PENDING_APPROVAL', {
    status: 'ACTIVE',
  });

  // Fire-and-forget email to DM
  getDmEmail(project.deliveryManagerId)
    .then((email) => {
      if (email) {
        return sendEmail({
          to: email,
          subject: `Your project ${project.name} has been approved`,
          body: `Your project "${project.name}" has been approved and is now active.`,
        });
      }
    })
    .catch((err) => logger.error(err, 'Failed to send project approval email'));
}

export async function rejectProject(id: string, comment: string) {
  const project = await atomicStatusTransition(id, 'PENDING_APPROVAL', {
    status: 'REJECTED',
    rejectionComment: comment,
  });

  // Fire-and-forget email to DM
  getDmEmail(project.deliveryManagerId)
    .then((email) => {
      if (email) {
        return sendEmail({
          to: email,
          subject: `Your project ${project.name} has been rejected`,
          body: `Your project "${project.name}" has been rejected.\n\nReason: ${comment}`,
        });
      }
    })
    .catch((err) => logger.error(err, 'Failed to send project rejection email'));
}

export async function updateProject(id: string, data: UpdateProjectInput, user: RequestUser) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, deliveryManagerId: true, status: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.deliveryManagerId !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  // Only REJECTED projects can be edited (DM applies corrections before resubmitting)
  if (project.status !== 'REJECTED') {
    throw new ValidationError('Only REJECTED projects can be edited');
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      engagementModel: data.engagementModel as EngagementModel | undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
    select: PROJECT_SELECT,
  });

  return serializeProject(updated);
}

export async function resubmitProject(id: string, user: RequestUser) {
  // Verify ownership before attempting atomic transition
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { deliveryManagerId: true },
  });

  if (!existing) {
    throw new NotFoundError('Project not found');
  }

  if (existing.deliveryManagerId !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  const project = await atomicStatusTransition(id, 'REJECTED', {
    status: 'PENDING_APPROVAL',
    rejectionComment: null,
  });

  // Fire-and-forget email to admins
  getAdminEmails()
    .then((emails) => {
      if (emails.length > 0) {
        return sendEmail({
          to: emails,
          subject: `New project pending approval: ${project.name}`,
          body: `Project "${project.name}" has been resubmitted for approval by ${user.email}.`,
        });
      }
    })
    .catch((err) => logger.error(err, 'Failed to send project resubmission email'));
}

// ── Team Roster Management ──────────────────────────────────────────

async function loadProjectForTeam(
  projectId: string,
  user: RequestUser,
  options?: { requireActive?: boolean; additionalRoles?: string[] },
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deliveryManagerId: true, engagementModel: true, status: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const bypassRoles = ['ADMIN', ...(options?.additionalRoles ?? [])];
  if (!bypassRoles.includes(user.role) && project.deliveryManagerId !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  if (options?.requireActive && project.status !== 'ACTIVE') {
    throw new ValidationError('Project must be in ACTIVE status');
  }

  return project;
}

export async function addTeamMember(
  projectId: string,
  data: AddTeamMemberInput,
  user: RequestUser,
) {
  const project = await loadProjectForTeam(projectId, user, { requireActive: true });

  // T&M billing rate validation
  if (project.engagementModel === 'TIME_AND_MATERIALS' && data.billingRatePaise == null) {
    throw new ValidationError('billingRatePaise is required for T&M projects');
  }

  // Check employee exists and is not resigned
  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
    select: { id: true, isResigned: true },
  });

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  if (employee.isResigned) {
    throw new ValidationError('Cannot assign a resigned employee to a project');
  }

  try {
    const record = await prisma.employeeProject.create({
      data: {
        projectId,
        employeeId: data.employeeId,
        role: data.role,
        billingRatePaise: data.billingRatePaise ?? null,
      },
    });

    return {
      employeeId: record.employeeId,
      role: record.role,
      billingRatePaise: record.billingRatePaise != null ? Number(record.billingRatePaise) : null,
      assignedAt: record.assignedAt,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new ConflictError('Employee is already assigned to this project');
    }
    throw error;
  }
}

export async function getTeamMembers(projectId: string, user: RequestUser) {
  await loadProjectForTeam(projectId, user, { additionalRoles: ['FINANCE'] });

  const members = await prisma.employeeProject.findMany({
    where: { projectId },
    include: {
      employee: {
        select: { name: true, designation: true },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return members.map((m) => ({
    employeeId: m.employeeId,
    name: m.employee.name,
    designation: m.employee.designation,
    role: m.role,
    billingRatePaise: m.billingRatePaise != null ? Number(m.billingRatePaise) : null,
    assignedAt: m.assignedAt,
  }));
}

export async function removeTeamMember(
  projectId: string,
  employeeId: string,
  user: RequestUser,
) {
  await loadProjectForTeam(projectId, user, { requireActive: true });

  try {
    await prisma.employeeProject.delete({
      where: {
        projectId_employeeId: { projectId, employeeId },
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw new NotFoundError('Team member not found');
    }
    throw error;
  }
}

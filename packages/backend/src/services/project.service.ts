import type { CreateProjectInput, UpdateProjectInput, AddTeamMemberInput } from '@ipis/shared';
import { AUDIT_ACTIONS } from '@ipis/shared';
import type { EngagementModel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { logAuditEvent } from './audit.service.js';
import { validateDesignationId } from './designation.service.js';
import { triggerRecalculationForLatestPeriod } from './upload.service.js';

/** Status priority for default project list sort order: lower = higher priority */
export const STATUS_PRIORITY: Record<string, number> = {
  ACTIVE: 1,
  PENDING_APPROVAL: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
  REJECTED: 5,
};

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
  slaDescription: true,
  vendorCostPaise: true,
  manpowerCostPaise: true,
  budgetPaise: true,
  infraCostMode: true,
  deliveryManagerId: true,
  deliveryManager: { select: { name: true } },
  rejectionComment: true,
  completionPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_SELECT }>;

function serializeProject(project: ProjectRow) {
  const { deliveryManager, ...rest } = project;
  return {
    ...rest,
    deliveryManagerName: deliveryManager?.name ?? null,
    contractValuePaise: project.contractValuePaise != null
      ? Number(project.contractValuePaise)
      : null,
    vendorCostPaise: project.vendorCostPaise != null
      ? Number(project.vendorCostPaise)
      : null,
    manpowerCostPaise: project.manpowerCostPaise != null
      ? Number(project.manpowerCostPaise)
      : null,
    budgetPaise: project.budgetPaise != null
      ? Number(project.budgetPaise)
      : null,
    completionPercent: project.completionPercent != null
      ? Number(project.completionPercent)
      : null,
  };
}

async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
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
): Promise<{ id: string; name: string; deliveryManagerId: string | null }> {
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

export async function createProject(data: CreateProjectInput, user: RequestUser, ipAddress?: string) {
  // Extract model-specific fields based on engagement model
  const modelFields: Record<string, unknown> = {};
  switch (data.engagementModel) {
    case 'AMC':
      if ('slaDescription' in data && data.slaDescription) {
        modelFields.slaDescription = data.slaDescription;
      }
      break;
    case 'FIXED_COST':
      if ('budgetPaise' in data && data.budgetPaise != null) {
        modelFields.budgetPaise = data.budgetPaise;
      }
      break;
    case 'INFRASTRUCTURE':
      if ('vendorCostPaise' in data && data.vendorCostPaise != null) {
        modelFields.vendorCostPaise = data.vendorCostPaise;
      }
      if ('manpowerCostPaise' in data && data.manpowerCostPaise != null) {
        modelFields.manpowerCostPaise = data.manpowerCostPaise;
      }
      if ('infraCostMode' in data) {
        modelFields.infraCostMode = data.infraCostMode;
      }
      break;
  }

  const members = data.members ?? [];

  // Pre-validate: check for duplicate employeeIds in members array
  if (members.length > 0) {
    const employeeIds = members.map((m) => m.employeeId);
    const uniqueIds = new Set(employeeIds);
    if (uniqueIds.size !== employeeIds.length) {
      throw new ValidationError('Duplicate employee in members array');
    }
  }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: data.name,
        client: data.client,
        vertical: data.vertical,
        engagementModel: data.engagementModel as EngagementModel,
        contractValuePaise: data.contractValuePaise ?? null,
        deliveryManagerId: user.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        ...modelFields,
      },
      select: PROJECT_SELECT,
    });

    // Validate and create each member assignment
    for (const member of members) {
      // T&M billing rate validation
      if (data.engagementModel === 'TIME_AND_MATERIALS' && member.billingRatePaise == null) {
        throw new ValidationError('billingRatePaise is required for T&M projects');
      }

      // Check employee exists and is not resigned
      const employee = await tx.employee.findUnique({
        where: { id: member.employeeId },
        select: { id: true, isResigned: true, name: true },
      });
      if (!employee) {
        throw new NotFoundError(`Employee ${member.employeeId} not found`);
      }
      if (employee.isResigned) {
        throw new ValidationError(`Cannot assign resigned employee ${employee.name} to a project`);
      }

      // Validate designation is active
      const desig = await tx.designation.findUnique({
        where: { id: member.designationId },
        select: { isActive: true },
      });
      if (!desig || !desig.isActive) {
        throw new ValidationError('Invalid or inactive designation');
      }

      await tx.employeeProject.create({
        data: {
          projectId: created.id,
          employeeId: member.employeeId,
          designationId: member.designationId,
          billingRatePaise: member.billingRatePaise ?? null,
          allocationPercent: member.allocationPercent ?? 100,
        },
      });
    }

    return created;
  });

  void logAuditEvent({
    actorId: user.id,
    action: AUDIT_ACTIONS.PROJECT_CREATED,
    entityType: 'Project',
    entityId: project.id,
    ipAddress: ipAddress ?? null,
    metadata: { name: data.name, client: data.client, engagementModel: data.engagementModel },
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

interface ProjectFinancials {
  revenuePaise: number | null;
  costPaise: number | null;
  profitPaise: number | null;
  marginPercent: number | null;
}

/**
 * Fetches per-project financial data from calculation_snapshots.
 * Uses the latest MARGIN_PERCENT snapshot per project (same approach as Executive Dashboard)
 * with breakdownJson for revenue/cost/profit values, plus individual figureType queries
 * for projects that may have partial snapshots.
 */
async function getProjectFinancialsMap(
  projectIds: string[],
): Promise<Map<string, ProjectFinancials>> {
  if (projectIds.length === 0) return new Map();

  // Fetch MARGIN_PERCENT snapshots — extract revenue/cost/profit from breakdownJson
  // (same approach as dashboard.service.ts — single source of truth)
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: {
      entityType: 'PROJECT',
      entityId: { in: projectIds },
      figureType: 'MARGIN_PERCENT',
    },
    orderBy: { calculatedAt: 'desc' },
    select: {
      entityId: true,
      valuePaise: true,
      breakdownJson: true,
    },
  });

  // Deduplicate: keep latest per entityId (already sorted desc)
  const result = new Map<string, ProjectFinancials>();
  for (const snap of snapshots) {
    if (result.has(snap.entityId)) continue;
    const breakdown = (snap.breakdownJson as Record<string, unknown>) ?? {};
    const revenuePaise = (breakdown.revenue as number) ?? null;
    const costPaise = (breakdown.cost as number) ?? null;
    const profitPaise = (breakdown.profit as number) ?? (revenuePaise != null && costPaise != null ? revenuePaise - costPaise : null);
    const marginPercent = Number(snap.valuePaise) / 10000;
    result.set(snap.entityId, { revenuePaise, costPaise, profitPaise, marginPercent });
  }

  return result;
}

export async function getAll(user: RequestUser, options?: { scope?: string }) {
  let where: Prisma.ProjectWhereInput = {};
  const scope = options?.scope;

  if (user.role === 'ADMIN' || user.role === 'FINANCE') {
    where = {};
  } else if (user.role === 'DEPT_HEAD') {
    // DEPT_HEAD sees projects that have at least one team member from their department
    const deptHead = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (deptHead?.departmentId) {
      where = {
        employeeProjects: {
          some: {
            employee: { departmentId: deptHead.departmentId },
          },
        },
      };
    } else {
      where = { id: 'NO_MATCH' }; // No department → no projects
    }
  } else if (user.role === 'DELIVERY_MANAGER' && scope === 'all') {
    // DM with scope=all — show all projects (cross-project visibility)
    where = {};
  } else {
    // DELIVERY_MANAGER default — own projects only
    where = { deliveryManagerId: user.id };
  }

  const projects = await prisma.project.findMany({
    where,
    select: PROJECT_SELECT,
  });

  // Sort by status priority (ACTIVE first), then name ASC within each group
  projects.sort((a, b) => {
    const aPriority = STATUS_PRIORITY[a.status] ?? 99;
    const bPriority = STATUS_PRIORITY[b.status] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  // Fetch financial data from calculation_snapshots (same source as Executive Dashboard)
  const projectIds = projects.map((p) => p.id);
  const financialsMap = await getProjectFinancialsMap(projectIds);

  return projects.map((p) => ({
    ...serializeProject(p),
    financials: financialsMap.get(p.id) ?? null,
  }));
}

export async function getById(id: string, user: RequestUser) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: PROJECT_SELECT,
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // DM: read-only access to all projects (cross-project visibility per Story 10.6)
  // Write operations (update, resubmit) have their own ownership checks

  // DEPT_HEAD: can only access projects with team members from their department
  if (user.role === 'DEPT_HEAD') {
    const deptHead = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (!deptHead?.departmentId) {
      throw new ForbiddenError('Access denied');
    }
    const hasDeptMember = await prisma.employeeProject.findFirst({
      where: {
        projectId: id,
        employee: { departmentId: deptHead.departmentId },
      },
    });
    if (!hasDeptMember) {
      throw new ForbiddenError('Access denied');
    }
  }

  // Query latest MARGIN_PERCENT snapshot — extract revenue/cost/profit from breakdownJson
  // (same approach as dashboard.service.ts — single source of truth)
  const marginSnap = await prisma.calculationSnapshot.findFirst({
    where: {
      entityType: 'PROJECT',
      entityId: id,
      figureType: 'MARGIN_PERCENT',
    },
    orderBy: { calculatedAt: 'desc' },
    select: { valuePaise: true, breakdownJson: true },
  });

  let financials: {
    revenuePaise: number | null;
    costPaise: number | null;
    profitPaise: number | null;
    marginPercent: number | null;
    burnRatePaise: number | null;
    plannedBurnRatePaise: number | null;
    budgetPaise: number | null;
    actualCostPaise: number | null;
    variancePaise: number | null;
    consumedPercent: number | null;
  } | null = null;
  if (marginSnap) {
    const breakdown = marginSnap.breakdownJson as Record<string, unknown>;
    const revenuePaise = (breakdown.revenue as number) ?? null;
    const costPaise = (breakdown.cost as number) ?? null;
    const profitPaise = (breakdown.profit as number) ?? (revenuePaise != null && costPaise != null ? revenuePaise - costPaise : null);
    const marginPercent = Number(marginSnap.valuePaise) / 10000;

    // Compute burn rate
    let burnRatePaise: number | null = null;
    let plannedBurnRatePaise: number | null = null;

    // Count distinct periods with snapshot data for this project
    const allSnaps = await prisma.calculationSnapshot.findMany({
      where: { entityType: 'PROJECT', entityId: id, figureType: 'MARGIN_PERCENT' },
      select: { periodMonth: true, periodYear: true, breakdownJson: true, calculatedAt: true },
      orderBy: { calculatedAt: 'desc' },
    });
    const seenPeriods = new Set<string>();
    let totalCost = 0;
    for (const s of allSnaps) {
      const pKey = `${s.periodYear}-${s.periodMonth}`;
      if (seenPeriods.has(pKey)) continue;
      seenPeriods.add(pKey);
      const bd = s.breakdownJson as Record<string, number>;
      totalCost += bd.cost ?? 0;
    }

    if (totalCost > 0) {
      if (project.engagementModel === 'FIXED_COST') {
        const now = new Date();
        const start = new Date(project.startDate);
        const monthsElapsed = Math.max(1,
          (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1,
        );
        burnRatePaise = Math.round(totalCost / monthsElapsed);

        if (project.contractValuePaise && project.endDate) {
          const end = new Date(project.endDate);
          const plannedMonths = Math.max(1,
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
          );
          plannedBurnRatePaise = Math.round(Number(project.contractValuePaise) / plannedMonths);
        }
      } else {
        const months = Math.max(1, seenPeriods.size);
        burnRatePaise = Math.round(totalCost / months);
      }
    }

    // Budget vs Actual (Fixed Cost only)
    const isFixedCost = project.engagementModel === 'FIXED_COST';
    const budgetPaise = isFixedCost && project.contractValuePaise ? Number(project.contractValuePaise) : null;
    const actualCostPaise = totalCost;
    const variancePaise = budgetPaise != null ? budgetPaise - actualCostPaise : null;
    const consumedPercent = budgetPaise != null && budgetPaise > 0 ? (actualCostPaise / budgetPaise) * 100 : null;

    financials = { revenuePaise, costPaise, profitPaise, marginPercent, burnRatePaise, plannedBurnRatePaise, budgetPaise, actualCostPaise, variancePaise, consumedPercent };
  }

  return { ...serializeProject(project), financials };
}

export async function approveProject(id: string, actorId?: string, ipAddress?: string) {
  const project = await atomicStatusTransition(id, 'PENDING_APPROVAL', {
    status: 'ACTIVE',
  });

  void logAuditEvent({
    actorId: actorId ?? null,
    action: AUDIT_ACTIONS.PROJECT_APPROVED,
    entityType: 'Project',
    entityId: project.id,
    ipAddress: ipAddress ?? null,
    metadata: { projectName: project.name },
  });

  // Fire-and-forget email to DM
  if (project.deliveryManagerId) getDmEmail(project.deliveryManagerId)
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

export async function rejectProject(id: string, comment: string, actorId?: string, ipAddress?: string) {
  const project = await atomicStatusTransition(id, 'PENDING_APPROVAL', {
    status: 'REJECTED',
    rejectionComment: comment,
  });

  void logAuditEvent({
    actorId: actorId ?? null,
    action: AUDIT_ACTIONS.PROJECT_REJECTED,
    entityType: 'Project',
    entityId: project.id,
    ipAddress: ipAddress ?? null,
    metadata: { projectName: project.name, rejectionComment: comment },
  });

  // Fire-and-forget email to DM
  if (project.deliveryManagerId) getDmEmail(project.deliveryManagerId)
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
    select: { id: true, deliveryManagerId: true, status: true, engagementModel: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Completion percent update path — Finance or DM (own project) on ACTIVE Fixed Cost
  const { completionPercent, ...otherFields } = data;
  const isCompletionOnly = completionPercent != null && Object.keys(otherFields).length === 0;

  if (isCompletionOnly) {
    if (project.engagementModel !== 'FIXED_COST') {
      throw new ValidationError('Completion percent only applies to Fixed Cost projects');
    }
    if (project.status !== 'ACTIVE') {
      throw new ValidationError('Completion percent can only be updated on active projects');
    }
    if (user.role === 'DELIVERY_MANAGER' && project.deliveryManagerId !== user.id) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { completionPercent },
      select: PROJECT_SELECT,
    });
    return serializeProject(updated);
  }

  // Full edit path — DM only, REJECTED projects only
  if (project.deliveryManagerId !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  if (project.status !== 'REJECTED') {
    throw new ValidationError('Only REJECTED projects can be edited');
  }

  // Separate model-specific fields from base fields to guard by engagement model
  const {
    slaDescription, vendorCostPaise, manpowerCostPaise, budgetPaise, infraCostMode,
    ...baseFields
  } = otherFields;

  // Use the target engagement model (if changing) or the current one
  const effectiveModel = (baseFields.engagementModel ?? project.engagementModel) as string;

  const modelFields: Record<string, unknown> = {};
  switch (effectiveModel) {
    case 'AMC':
      if (slaDescription !== undefined) modelFields.slaDescription = slaDescription;
      break;
    case 'FIXED_COST':
      if (budgetPaise !== undefined) modelFields.budgetPaise = budgetPaise;
      break;
    case 'INFRASTRUCTURE':
      if (vendorCostPaise !== undefined) modelFields.vendorCostPaise = vendorCostPaise;
      if (manpowerCostPaise !== undefined) modelFields.manpowerCostPaise = manpowerCostPaise;
      if (infraCostMode !== undefined) modelFields.infraCostMode = infraCostMode;
      break;
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...baseFields,
      ...modelFields,
      engagementModel: baseFields.engagementModel as EngagementModel | undefined,
      startDate: baseFields.startDate ? new Date(baseFields.startDate) : undefined,
      endDate: baseFields.endDate ? new Date(baseFields.endDate) : undefined,
    },
    select: PROJECT_SELECT,
  });

  return serializeProject(updated);
}

export async function resubmitProject(id: string, user: RequestUser, ipAddress?: string) {
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

  void logAuditEvent({
    actorId: user.id,
    action: AUDIT_ACTIONS.PROJECT_RESUBMITTED,
    entityType: 'Project',
    entityId: project.id,
    ipAddress: ipAddress ?? null,
    metadata: { projectName: project.name },
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

  // Validate designationId references an active Designation
  await validateDesignationId(data.designationId);

  // Check total allocation across all projects
  const existingAllocations = await prisma.employeeProject.findMany({
    where: { employeeId: data.employeeId },
    select: { allocationPercent: true },
  });
  const currentTotal = existingAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  const newAllocation = data.allocationPercent ?? 100;
  const overAllocated = currentTotal + newAllocation > 100;

  try {
    const record = await prisma.employeeProject.create({
      data: {
        projectId,
        employeeId: data.employeeId,
        designationId: data.designationId,
        billingRatePaise: data.billingRatePaise ?? null,
        allocationPercent: newAllocation,
      },
    });

    // Trigger recalculation for this project
    try {
      await triggerRecalculationForLatestPeriod();
    } catch (recalcError) {
      logger.error({ recalcError, projectId }, 'Recalculation failed after adding team member');
    }

    return {
      employeeId: record.employeeId,
      designationId: record.designationId,
      billingRatePaise: record.billingRatePaise != null ? Number(record.billingRatePaise) : null,
      allocationPercent: record.allocationPercent,
      assignedAt: record.assignedAt,
      overAllocated,
      totalAllocation: currentTotal + newAllocation,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new ConflictError('Employee is already assigned to this project');
    }
    throw error;
  }
}

export async function getTeamMembers(projectId: string, user: RequestUser) {
  await loadProjectForTeam(projectId, user, { additionalRoles: ['FINANCE', 'DEPT_HEAD'] });

  const members = await prisma.employeeProject.findMany({
    where: { projectId },
    include: {
      employee: {
        select: { name: true, designation: true, annualCtcPaise: true },
      },
      designation: {
        select: { name: true },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return members.map((m) => ({
    employeeId: m.employeeId,
    name: m.employee.name,
    employeeDesignation: m.employee.designation,
    designationId: m.designationId,
    designationName: m.designation.name,
    billingRatePaise: m.billingRatePaise != null ? Number(m.billingRatePaise) : null,
    monthlyCostPaise: Number(m.employee.annualCtcPaise) / 12,
    allocationPercent: m.allocationPercent,
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

    // Trigger recalculation for this project
    try {
      await triggerRecalculationForLatestPeriod();
    } catch (recalcError) {
      logger.error({ recalcError, projectId }, 'Recalculation failed after removing team member');
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw new NotFoundError('Team member not found');
    }
    throw error;
  }
}

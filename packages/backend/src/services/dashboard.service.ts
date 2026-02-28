import { prisma } from '../lib/prisma.js';

interface RequestUser {
  id: string;
  role: string;
  email: string;
}

interface DashboardFilters {
  department?: string;
  vertical?: string;
  engagementModel?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ProjectDashboardRow {
  projectId: string;
  projectName: string;
  engagementModel: string;
  department: string | null;
  vertical: string;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

export async function getProjectDashboard(
  user: RequestUser,
  filters: DashboardFilters,
): Promise<ProjectDashboardRow[]> {
  // Step 1: Find the latest period with PROJECT/MARGIN_PERCENT snapshots
  const latestSnapshot = await prisma.calculationSnapshot.findFirst({
    where: { entityType: 'PROJECT', figureType: 'MARGIN_PERCENT' },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    select: { periodMonth: true, periodYear: true },
  });

  if (!latestSnapshot) {
    return [];
  }

  const { periodMonth, periodYear } = latestSnapshot;

  // Step 2: Fetch all PROJECT/MARGIN_PERCENT snapshots for that period
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: {
      entityType: 'PROJECT',
      figureType: 'MARGIN_PERCENT',
      periodMonth,
      periodYear,
    },
    orderBy: { calculatedAt: 'desc' },
    select: {
      entityId: true,
      valuePaise: true,
      breakdownJson: true,
      calculatedAt: true,
    },
  });

  // Deduplicate by entityId — keep latest calculatedAt (already sorted desc)
  const latestByProject = new Map<string, (typeof snapshots)[0]>();
  for (const snap of snapshots) {
    if (!latestByProject.has(snap.entityId)) {
      latestByProject.set(snap.entityId, snap);
    }
  }

  if (latestByProject.size === 0) {
    return [];
  }

  const projectIds = [...latestByProject.keys()];

  // Step 3: Fetch project metadata with delivery manager department info
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      name: true,
      vertical: true,
      engagementModel: true,
      status: true,
      deliveryManagerId: true,
      deliveryManager: {
        select: {
          departmentId: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  // Step 4: RBAC scoping — reuse pattern from project.service.ts:171-190
  let filteredProjects = projects;

  if (user.role === 'ADMIN' || user.role === 'FINANCE') {
    // No filter — sees all
  } else if (user.role === 'DEPT_HEAD') {
    const deptHead = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (deptHead?.departmentId) {
      filteredProjects = projects.filter(
        (p) => p.deliveryManager?.departmentId === deptHead.departmentId,
      );
    } else {
      filteredProjects = projects.filter((p) => p.deliveryManagerId === user.id);
    }
  } else {
    // DELIVERY_MANAGER — own projects only
    filteredProjects = projects.filter((p) => p.deliveryManagerId === user.id);
  }

  // Step 5: Build result rows
  let rows: ProjectDashboardRow[] = filteredProjects.map((project) => {
    const snap = latestByProject.get(project.id)!;
    const breakdown = snap.breakdownJson as Record<string, unknown>;
    const marginPercent = Number(snap.valuePaise) / 10000;

    return {
      projectId: project.id,
      projectName: project.name,
      engagementModel: project.engagementModel,
      department: project.deliveryManager?.department?.name ?? null,
      vertical: project.vertical,
      status: project.status,
      revenuePaise: (breakdown.revenue as number) ?? 0,
      costPaise: (breakdown.cost as number) ?? 0,
      profitPaise: (breakdown.profit as number) ?? 0,
      marginPercent,
    };
  });

  // Step 6: Apply filters in-memory
  if (filters.department) {
    rows = rows.filter((r) => r.department === filters.department);
  }
  if (filters.vertical) {
    rows = rows.filter((r) => r.vertical === filters.vertical);
  }
  if (filters.engagementModel) {
    rows = rows.filter((r) => r.engagementModel === filters.engagementModel);
  }
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }

  // Step 7: Sort (default marginPercent DESC)
  const sortBy = filters.sortBy ?? 'marginPercent';
  const sortOrder = filters.sortOrder ?? 'desc';
  const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

  rows.sort((a, b) => {
    const aVal = a[sortBy as keyof ProjectDashboardRow] ?? 0;
    const bVal = b[sortBy as keyof ProjectDashboardRow] ?? 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * sortMultiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * sortMultiplier;
  });

  return rows;
}

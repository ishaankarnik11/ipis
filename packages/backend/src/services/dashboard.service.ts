import { prisma } from '../lib/prisma.js';
import { getConfig } from './config.service.js';

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
  deptTeamCount?: number;
  burnRatePaise: number;
  plannedBurnRatePaise?: number;
  budgetPaise: number | null;
  actualCostPaise: number;
  variancePaise: number | null;
  consumedPercent: number | null;
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
      startDate: true,
      endDate: true,
      contractValuePaise: true,
      deliveryManagerId: true,
      deliveryManager: {
        select: {
          departmentId: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  // Step 3b: Fetch total cost across ALL periods for burn rate calculation
  const allCostSnapshots = await prisma.calculationSnapshot.findMany({
    where: {
      entityType: 'PROJECT',
      entityId: { in: projectIds },
      figureType: 'MARGIN_PERCENT',
    },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, periodMonth: true, periodYear: true, breakdownJson: true, calculatedAt: true },
  });

  // Deduplicate by (entityId, periodMonth, periodYear) — keep latest
  const costByProjectPeriod = new Map<string, { totalCost: number; monthsWithData: number }>();
  const seenPeriods = new Set<string>();
  for (const snap of allCostSnapshots) {
    const key = `${snap.entityId}::${snap.periodMonth}::${snap.periodYear}`;
    if (seenPeriods.has(key)) continue;
    seenPeriods.add(key);

    const existing = costByProjectPeriod.get(snap.entityId) ?? { totalCost: 0, monthsWithData: 0 };
    const breakdown = snap.breakdownJson as Record<string, unknown>;
    existing.totalCost += (breakdown.cost as number) ?? 0;
    existing.monthsWithData += 1;
    costByProjectPeriod.set(snap.entityId, existing);
  }

  // Step 4: RBAC scoping — reuse pattern from project.service.ts:171-190
  let filteredProjects = projects;
  const deptTeamCounts = new Map<string, number>();

  if (user.role === 'ADMIN' || user.role === 'FINANCE') {
    // No filter — sees all
  } else if (user.role === 'DEPT_HEAD') {
    const deptHead = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (deptHead?.departmentId) {
      // Find projects with team members from the dept head's department, with counts
      const deptEmployeeProjects = await prisma.employeeProject.findMany({
        where: {
          projectId: { in: projectIds },
          employee: { departmentId: deptHead.departmentId },
        },
        select: { projectId: true },
      });
      // Count employees per project
      for (const ep of deptEmployeeProjects) {
        deptTeamCounts.set(ep.projectId, (deptTeamCounts.get(ep.projectId) ?? 0) + 1);
      }
      const deptProjectIdSet = new Set(deptTeamCounts.keys());
      filteredProjects = projects.filter((p) => deptProjectIdSet.has(p.id));
    } else {
      filteredProjects = [];
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

    // Compute burn rate
    const costData = costByProjectPeriod.get(project.id);
    let burnRatePaise = 0;
    let plannedBurnRatePaise: number | undefined;

    if (costData && costData.totalCost > 0) {
      if (project.engagementModel === 'FIXED_COST') {
        // Fixed Cost: total cost / months elapsed since start date
        const now = new Date();
        const start = new Date(project.startDate);
        const monthsElapsed = Math.max(1,
          (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1,
        );
        burnRatePaise = Math.round(costData.totalCost / monthsElapsed);

        // Planned burn: contract value / total planned months
        if (project.contractValuePaise && project.endDate) {
          const end = new Date(project.endDate);
          const plannedMonths = Math.max(1,
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
          );
          plannedBurnRatePaise = Math.round(Number(project.contractValuePaise) / plannedMonths);
        }
      } else {
        // T&M / AMC / INFRASTRUCTURE: total cost / months with data
        const months = Math.max(1, costData.monthsWithData);
        burnRatePaise = Math.round(costData.totalCost / months);
      }
    }

    // Budget vs Actual (Fixed Cost only)
    const totalCostAllPeriods = costData?.totalCost ?? 0;
    const isFixedCost = project.engagementModel === 'FIXED_COST';
    const budgetPaise = isFixedCost && project.contractValuePaise ? Number(project.contractValuePaise) : null;
    const actualCostPaise = totalCostAllPeriods;
    const variancePaise = budgetPaise != null ? budgetPaise - actualCostPaise : null;
    const consumedPercent = budgetPaise != null && budgetPaise > 0 ? (actualCostPaise / budgetPaise) * 100 : null;

    const row: ProjectDashboardRow = {
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
      burnRatePaise,
      budgetPaise,
      actualCostPaise,
      variancePaise,
      consumedPercent,
    };
    if (plannedBurnRatePaise !== undefined) {
      row.plannedBurnRatePaise = plannedBurnRatePaise;
    }
    // Include dept team count for DEPT_HEAD role
    const count = deptTeamCounts.get(project.id);
    if (count !== undefined) {
      row.deptTeamCount = count;
    }
    return row;
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
  const validSortFields: (keyof ProjectDashboardRow)[] = [
    'projectName', 'engagementModel', 'department', 'vertical', 'status',
    'revenuePaise', 'costPaise', 'profitPaise', 'marginPercent',
  ];
  const sortBy = (validSortFields.includes(filters.sortBy as keyof ProjectDashboardRow)
    ? filters.sortBy
    : 'marginPercent') as keyof ProjectDashboardRow;
  const sortOrder = filters.sortOrder ?? 'desc';
  const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

  rows.sort((a, b) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * sortMultiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * sortMultiplier;
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Helper: find latest period for a given entity type
// ---------------------------------------------------------------------------

async function findLatestPeriod(
  entityType: string,
  figureType: string = 'MARGIN_PERCENT',
): Promise<{ periodMonth: number; periodYear: number } | null> {
  const snap = await prisma.calculationSnapshot.findFirst({
    where: { entityType, figureType },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    select: { periodMonth: true, periodYear: true },
  });
  return snap;
}

// ---------------------------------------------------------------------------
// Helper: collect snapshots by entityId for a given entityType + period
// Returns a map: entityId → { revenuePaise, costPaise, marginPercent }
// ---------------------------------------------------------------------------

interface EntityFinancials {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

async function collectEntityFinancials(
  entityType: string,
  periodMonth: number,
  periodYear: number,
): Promise<Map<string, EntityFinancials>> {
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType, periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, figureType: true, valuePaise: true, calculatedAt: true },
  });

  // Deduplicate: keep latest calculatedAt per (entityId, figureType)
  const seen = new Set<string>();
  const deduped: typeof snapshots = [];
  for (const snap of snapshots) {
    const key = `${snap.entityId}::${snap.figureType}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(snap);
    }
  }

  // Group by entityId, collect figureType values
  const result = new Map<string, EntityFinancials>();
  const partial = new Map<string, { revenue?: number; cost?: number; margin?: number }>();

  for (const snap of deduped) {
    const existing = partial.get(snap.entityId) ?? {};
    if (snap.figureType === 'REVENUE_CONTRIBUTION') {
      existing.revenue = Number(snap.valuePaise);
    } else if (snap.figureType === 'EMPLOYEE_COST') {
      existing.cost = Number(snap.valuePaise);
    } else if (snap.figureType === 'MARGIN_PERCENT') {
      existing.margin = Number(snap.valuePaise) / 10000;
    }
    partial.set(snap.entityId, existing);
  }

  for (const [entityId, vals] of partial) {
    const revenue = vals.revenue ?? 0;
    const cost = vals.cost ?? 0;
    result.set(entityId, {
      revenuePaise: revenue,
      costPaise: cost,
      profitPaise: revenue - cost,
      marginPercent: vals.margin ?? 0,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Executive Dashboard (AC: 1)
// ---------------------------------------------------------------------------

export interface ExecutiveDashboardResult {
  revenuePaise: number;
  costPaise: number;
  marginPercent: number;
  billableUtilisationPercent: number;
  top5Projects: ProjectDashboardRow[];
  bottom5Projects: ProjectDashboardRow[];
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboardResult | null> {
  const period = await findLatestPeriod('COMPANY');
  if (!period) return null;

  const { periodMonth, periodYear } = period;

  // Company-level totals
  const companyFinancials = await collectEntityFinancials('COMPANY', periodMonth, periodYear);
  const company = companyFinancials.get('COMPANY') ?? { revenuePaise: 0, costPaise: 0, profitPaise: 0, marginPercent: 0 };

  // Top-5 / Bottom-5 projects by margin
  const projectSnapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'PROJECT', figureType: 'MARGIN_PERCENT', periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, valuePaise: true, breakdownJson: true, calculatedAt: true },
  });

  const latestByProject = new Map<string, (typeof projectSnapshots)[0]>();
  for (const snap of projectSnapshots) {
    if (!latestByProject.has(snap.entityId)) {
      latestByProject.set(snap.entityId, snap);
    }
  }

  const projectIds = [...latestByProject.keys()];
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true, name: true, vertical: true, engagementModel: true, status: true,
      deliveryManagerId: true,
      deliveryManager: { select: { departmentId: true, department: { select: { name: true } } } },
    },
  });

  const projectRows: ProjectDashboardRow[] = projects.filter((project) => latestByProject.has(project.id)).map((project) => {
    const snap = latestByProject.get(project.id)!;
    const breakdown = snap.breakdownJson as Record<string, unknown>;
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
      marginPercent: Number(snap.valuePaise) / 10000,
      burnRatePaise: 0,
      budgetPaise: null,
      actualCostPaise: 0,
      variancePaise: null,
      consumedPercent: null,
    };
  });

  // Sort by margin DESC for top-5
  const sorted = [...projectRows].sort((a, b) => b.marginPercent - a.marginPercent);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse(); // worst margin first

  // Billable utilisation from COMPANY UTILIZATION_PERCENT snapshot
  const utilisationSnap = await prisma.calculationSnapshot.findFirst({
    where: {
      entityType: 'COMPANY',
      entityId: 'COMPANY',
      figureType: 'UTILIZATION_PERCENT',
      periodMonth,
      periodYear,
    },
    orderBy: { calculatedAt: 'desc' },
    select: { valuePaise: true },
  });

  const billableUtilisationPercent = utilisationSnap
    ? Number(utilisationSnap.valuePaise) / 10000
    : 0;

  return {
    revenuePaise: company.revenuePaise,
    costPaise: company.costPaise,
    marginPercent: company.marginPercent,
    billableUtilisationPercent,
    top5Projects: top5,
    bottom5Projects: bottom5,
  };
}

// ---------------------------------------------------------------------------
// Practice Dashboard (AC: 3)
// ---------------------------------------------------------------------------

export interface PracticeDashboardRow {
  designation: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  employeeCount: number;
}

export async function getPracticeDashboard(): Promise<PracticeDashboardRow[]> {
  const period = await findLatestPeriod('PRACTICE');
  if (!period) return [];

  const { periodMonth, periodYear } = period;

  const financials = await collectEntityFinancials('PRACTICE', periodMonth, periodYear);

  // Count employees per designation from EMPLOYEE snapshots
  const empSnapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'EMPLOYEE', figureType: 'EMPLOYEE_COST', periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, calculatedAt: true },
  });

  const uniqueEmpIds = new Set<string>();
  for (const snap of empSnapshots) {
    if (!uniqueEmpIds.has(snap.entityId)) uniqueEmpIds.add(snap.entityId);
  }

  const employees = uniqueEmpIds.size > 0
    ? await prisma.employee.findMany({
        where: { id: { in: [...uniqueEmpIds] } },
        select: { id: true, designation: true },
      })
    : [];

  // Note: PRACTICE snapshot entityIds are designation strings (e.g. "Senior Developer").
  // Employee count matching relies on Employee.designation exactly matching these strings.
  const countByDesignation = new Map<string, number>();
  for (const emp of employees) {
    countByDesignation.set(emp.designation, (countByDesignation.get(emp.designation) ?? 0) + 1);
  }

  const rows: PracticeDashboardRow[] = [];
  for (const [designation, fin] of financials) {
    rows.push({
      designation,
      ...fin,
      employeeCount: countByDesignation.get(designation) ?? 0,
    });
  }

  // Sort by cost descending
  rows.sort((a, b) => b.costPaise - a.costPaise);
  return rows;
}

// ---------------------------------------------------------------------------
// Department Dashboard (AC: 4)
// ---------------------------------------------------------------------------

export interface DepartmentDashboardRow {
  departmentId: string;
  departmentName: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number | null;
}

export async function getDepartmentDashboard(user: RequestUser): Promise<DepartmentDashboardRow[]> {
  // Fetch ALL departments first — even those without snapshots
  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const period = await findLatestPeriod('DEPARTMENT');

  // Collect financials only if snapshots exist; otherwise all departments get zeroed values
  const financials = period
    ? await collectEntityFinancials('DEPARTMENT', period.periodMonth, period.periodYear)
    : new Map<string, EntityFinancials>();

  const zeroFinancials: EntityFinancials = { revenuePaise: 0, costPaise: 0, profitPaise: 0, marginPercent: 0 };

  let rows: DepartmentDashboardRow[] = allDepartments.map((dept) => {
    const fin = financials.get(dept.id) ?? zeroFinancials;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      revenuePaise: fin.revenuePaise,
      costPaise: fin.costPaise,
      profitPaise: fin.profitPaise,
      // Cost-center departments (zero revenue) → null margin instead of misleading -100%
      marginPercent: fin.revenuePaise === 0 ? null : fin.marginPercent,
    };
  });

  // RBAC: DH sees own department only
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (currentUser?.departmentId) {
      rows = rows.filter((r) => r.departmentId === currentUser.departmentId);
    } else {
      rows = [];
    }
  }

  // Sort by revenue descending
  rows.sort((a, b) => b.revenuePaise - a.revenuePaise);
  return rows;
}

// ---------------------------------------------------------------------------
// Department Dashboard — Month-over-Month Comparison (Story 11.2)
// ---------------------------------------------------------------------------

export interface DepartmentMonthData {
  periodMonth: number;
  periodYear: number;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number | null;
}

export interface DepartmentComparisonRow {
  departmentId: string;
  departmentName: string;
  months: DepartmentMonthData[];
}

export async function getDepartmentComparison(
  user: RequestUser,
  months: Array<{ month: number; year: number }>,
): Promise<DepartmentComparisonRow[]> {
  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Collect financials for each requested month
  const monthFinancials = new Map<string, Map<string, EntityFinancials>>();
  for (const { month, year } of months) {
    const key = `${year}-${month}`;
    const financials = await collectEntityFinancials('DEPARTMENT', month, year);
    monthFinancials.set(key, financials);
  }

  let rows: DepartmentComparisonRow[] = allDepartments.map((dept) => ({
    departmentId: dept.id,
    departmentName: dept.name,
    months: months.map(({ month, year }) => {
      const key = `${year}-${month}`;
      const fin = monthFinancials.get(key)?.get(dept.id);
      if (!fin) {
        return {
          periodMonth: month,
          periodYear: year,
          revenuePaise: 0,
          costPaise: 0,
          profitPaise: 0,
          marginPercent: null,
        };
      }
      return {
        periodMonth: month,
        periodYear: year,
        revenuePaise: fin.revenuePaise,
        costPaise: fin.costPaise,
        profitPaise: fin.profitPaise,
        marginPercent: fin.revenuePaise === 0 ? null : fin.marginPercent,
      };
    }),
  }));

  // RBAC: DH sees own department only
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (currentUser?.departmentId) {
      rows = rows.filter((r) => r.departmentId === currentUser.departmentId);
    } else {
      rows = [];
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Department Dashboard — Drill-Down (Story 11.3)
// ---------------------------------------------------------------------------

export interface DepartmentDrilldownEmployee {
  employeeId: string;
  name: string;
  designation: string;
  billableUtilisationPercent: number;
  revenueContributionPaise: number;
  costPaise: number;
}

export interface DepartmentDrilldownProject {
  projectId: string;
  projectName: string;
  employeeCount: number;
  revenueContributionPaise: number;
}

export interface DepartmentDrilldownResult {
  departmentId: string;
  departmentName: string;
  employees: DepartmentDrilldownEmployee[];
  projects: DepartmentDrilldownProject[];
}

export async function getDepartmentDrilldown(
  user: RequestUser,
  departmentId: string,
): Promise<DepartmentDrilldownResult | null> {
  // RBAC: DH/DM can only access own department; ADMIN/FINANCE/HR see all
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE' && user.role !== 'HR') {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (currentUser?.departmentId !== departmentId) {
      return null;
    }
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true },
  });
  if (!department) return null;

  // Get employees in this department (exclude resigned)
  const employees = await prisma.employee.findMany({
    where: { departmentId, isResigned: false },
    select: { id: true, name: true, designation: true },
  });

  if (employees.length === 0) {
    return {
      departmentId: department.id,
      departmentName: department.name,
      employees: [],
      projects: [],
    };
  }

  const empIds = employees.map((e) => e.id);

  // Find latest period for EMPLOYEE snapshots
  const period = await findLatestPeriod('EMPLOYEE', 'EMPLOYEE_COST');

  // Build employee metrics from snapshots
  const empMetrics = new Map<string, { cost: number; revenue: number; billableHours: number }>();

  if (period) {
    const snapshots = await prisma.calculationSnapshot.findMany({
      where: {
        entityType: 'EMPLOYEE',
        entityId: { in: empIds },
        periodMonth: period.periodMonth,
        periodYear: period.periodYear,
      },
      orderBy: { calculatedAt: 'desc' },
      select: { entityId: true, figureType: true, valuePaise: true, breakdownJson: true, calculatedAt: true },
    });

    // Deduplicate: keep latest per (entityId, figureType)
    const seen = new Set<string>();
    for (const snap of snapshots) {
      const key = `${snap.entityId}::${snap.figureType}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = empMetrics.get(snap.entityId) ?? { cost: 0, revenue: 0, billableHours: 0 };
      if (snap.figureType === 'EMPLOYEE_COST') {
        existing.cost = Number(snap.valuePaise);
        const bd = snap.breakdownJson as Record<string, number>;
        existing.billableHours = bd.billableHours ?? 0;
      } else if (snap.figureType === 'REVENUE_CONTRIBUTION') {
        existing.revenue = Number(snap.valuePaise);
      }
      empMetrics.set(snap.entityId, existing);
    }
  }

  const config = await getConfig();
  const standardMonthlyHours = config.standardMonthlyHours;

  const drilldownEmployees: DepartmentDrilldownEmployee[] = employees.map((emp) => {
    const metrics = empMetrics.get(emp.id);
    const billableHours = metrics?.billableHours ?? 0;
    return {
      employeeId: emp.id,
      name: emp.name,
      designation: emp.designation,
      billableUtilisationPercent: standardMonthlyHours === 0 ? 0 : billableHours / standardMonthlyHours,
      revenueContributionPaise: metrics?.revenue ?? 0,
      costPaise: metrics?.cost ?? 0,
    };
  });

  // Find projects involving these employees
  const employeeProjects = await prisma.employeeProject.findMany({
    where: { employeeId: { in: empIds } },
    select: {
      projectId: true,
      employeeId: true,
      project: { select: { id: true, name: true } },
    },
  });

  // Group by project: count employees and sum revenue
  const projectMap = new Map<string, { name: string; employeeIds: Set<string>; revenue: number }>();
  for (const ep of employeeProjects) {
    const existing = projectMap.get(ep.projectId) ?? { name: ep.project.name, employeeIds: new Set(), revenue: 0 };
    existing.employeeIds.add(ep.employeeId);
    projectMap.set(ep.projectId, existing);
  }

  // Add revenue per project from employee metrics
  for (const [projectId, data] of projectMap) {
    let projectRevenue = 0;
    for (const empId of data.employeeIds) {
      projectRevenue += empMetrics.get(empId)?.revenue ?? 0;
    }
    data.revenue = projectRevenue;
  }

  const drilldownProjects: DepartmentDrilldownProject[] = [...projectMap.entries()].map(
    ([projectId, data]) => ({
      projectId,
      projectName: data.name,
      employeeCount: data.employeeIds.size,
      revenueContributionPaise: data.revenue,
    }),
  );

  // Sort projects by revenue desc
  drilldownProjects.sort((a, b) => b.revenueContributionPaise - a.revenueContributionPaise);

  return {
    departmentId: department.id,
    departmentName: department.name,
    employees: drilldownEmployees,
    projects: drilldownProjects,
  };
}

// ---------------------------------------------------------------------------
// Company Dashboard (AC: 5)
// ---------------------------------------------------------------------------

export interface CompanyDashboardResult {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  departments: DepartmentDashboardRow[];
}

export async function getCompanyDashboard(): Promise<CompanyDashboardResult | null> {
  const period = await findLatestPeriod('COMPANY');
  if (!period) return null;

  const { periodMonth, periodYear } = period;

  // Company totals
  const companyFinancials = await collectEntityFinancials('COMPANY', periodMonth, periodYear);
  const company = companyFinancials.get('COMPANY') ?? { revenuePaise: 0, costPaise: 0, profitPaise: 0, marginPercent: 0 };

  // Department breakdown — include ALL departments, not just those with snapshots
  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const deptFinancials = await collectEntityFinancials('DEPARTMENT', periodMonth, periodYear);
  const zeroFinancials: EntityFinancials = { revenuePaise: 0, costPaise: 0, profitPaise: 0, marginPercent: 0 };

  const deptRows: DepartmentDashboardRow[] = allDepartments.map((dept) => {
    const fin = deptFinancials.get(dept.id) ?? zeroFinancials;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      revenuePaise: fin.revenuePaise,
      costPaise: fin.costPaise,
      profitPaise: fin.profitPaise,
      marginPercent: fin.revenuePaise === 0 ? null : fin.marginPercent,
    };
  });

  deptRows.sort((a, b) => b.revenuePaise - a.revenuePaise);

  return {
    ...company,
    departments: deptRows,
  };
}

// ---------------------------------------------------------------------------
// Employee Dashboard (Story 6.5, AC: 1-3)
// ---------------------------------------------------------------------------

export interface EmployeeDashboardFilters {
  department?: string;
  designation?: string;
}

export interface EmployeeDashboardRow {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
  marginPercent: number;
  profitabilityRank: number;
}

export async function getEmployeeDashboard(
  user: RequestUser,
  filters: EmployeeDashboardFilters,
): Promise<EmployeeDashboardRow[]> {
  // Step 1: Find latest period for EMPLOYEE snapshots (use EMPLOYEE_COST since no MARGIN_PERCENT)
  const period = await findLatestPeriod('EMPLOYEE', 'EMPLOYEE_COST');
  if (!period) return [];

  const { periodMonth, periodYear } = period;

  // Step 2: Fetch all EMPLOYEE snapshots for this period
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'EMPLOYEE', periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, figureType: true, valuePaise: true, breakdownJson: true, calculatedAt: true },
  });

  // Deduplicate: keep latest per (entityId, figureType)
  const seen = new Set<string>();
  const deduped: typeof snapshots = [];
  for (const snap of snapshots) {
    const key = `${snap.entityId}::${snap.figureType}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(snap);
    }
  }

  // Group by entityId
  const empData = new Map<string, {
    cost: number;
    revenue: number;
    totalHours: number;
    billableHours: number;
    availableHours: number;
  }>();

  for (const snap of deduped) {
    const existing = empData.get(snap.entityId) ?? { cost: 0, revenue: 0, totalHours: 0, billableHours: 0, availableHours: 0 };
    if (snap.figureType === 'EMPLOYEE_COST') {
      existing.cost = Number(snap.valuePaise);
      const bd = snap.breakdownJson as Record<string, number>;
      existing.totalHours = bd.totalHours ?? 0;
      existing.billableHours = bd.billableHours ?? 0;
      existing.availableHours = bd.availableHours ?? 0;
    } else if (snap.figureType === 'REVENUE_CONTRIBUTION') {
      existing.revenue = Number(snap.valuePaise);
    }
    empData.set(snap.entityId, existing);
  }

  if (empData.size === 0) return [];

  const empIds = [...empData.keys()];

  // Step 3: Fetch employee metadata (exclude resigned)
  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds }, isResigned: false },
    select: {
      id: true,
      name: true,
      designation: true,
      isBillable: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  // Step 4: Get standardMonthlyHours from config (fallback to 160 if null/undefined)
  const config = await getConfig();
  const standardMonthlyHours = config.standardMonthlyHours ?? 160;

  // Step 5: Build rows with computed fields
  const allRows = employees.map((emp) => {
    const data = empData.get(emp.id)!;
    const profitContributionPaise = data.revenue - data.cost;
    const billableUtilisationPercent = standardMonthlyHours === 0 ? 0 : data.billableHours / standardMonthlyHours;
    const marginPercent = data.revenue === 0 ? 0 : profitContributionPaise / data.revenue;

    return {
      employeeId: emp.id,
      name: emp.name,
      designation: emp.designation,
      department: emp.department.name,
      departmentId: emp.departmentId,
      isBillable: emp.isBillable,
      totalHours: data.totalHours,
      billableHours: data.billableHours,
      billableUtilisationPercent,
      totalCostPaise: data.cost,
      revenueContributionPaise: data.revenue,
      profitContributionPaise,
      marginPercent,
      profitabilityRank: 0, // computed below
    };
  });

  // Step 6: Compute profitabilityRank over FULL unfiltered dataset.
  // Story 11.6: Rank by profit margin (marginPercent DESC). Only billable employees are ranked.
  // Non-billable employees get rank 0 (mapped to null/"—" on frontend).
  const billableRows = allRows.filter((r) => r.isBillable);
  const sortedForRank = [...billableRows].sort((a, b) => b.marginPercent - a.marginPercent);
  const rankMap = new Map<string, number>();
  sortedForRank.forEach((row, index) => {
    rankMap.set(row.employeeId, index + 1);
  });
  for (const row of allRows) {
    row.profitabilityRank = rankMap.get(row.employeeId) ?? 0;
  }

  // Step 7: RBAC scoping
  let filtered = allRows;
  if (user.role === 'ADMIN' || user.role === 'FINANCE' || user.role === 'HR') {
    // Full access — sees all employees
  } else {
    // DEPT_HEAD — own department only
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (currentUser?.departmentId) {
      filtered = allRows.filter((r) => r.departmentId === currentUser.departmentId);
    } else {
      filtered = [];
    }
  }

  // Step 8: Apply filters
  if (filters.department) {
    filtered = filtered.filter((r) => r.department === filters.department);
  }
  if (filters.designation) {
    filtered = filtered.filter((r) => r.designation === filters.designation);
  }

  // Return without internal departmentId
  // Defense in depth: strip financial fields for HR role (AC: 4)
  if (user.role === 'HR') {
    return filtered.map(({ departmentId: _deptId, isBillable: _b, totalCostPaise: _c, revenueContributionPaise: _r, profitContributionPaise: _p, marginPercent: _m, profitabilityRank: _rank, ...rest }) => ({
      ...rest,
      totalCostPaise: 0,
      revenueContributionPaise: 0,
      profitContributionPaise: 0,
      marginPercent: 0,
      profitabilityRank: 0,
    }));
  }
  return filtered.map(({ departmentId: _deptId, isBillable: _b, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Employee Detail (Story 6.5, AC: 9)
// ---------------------------------------------------------------------------

export interface EmployeeMonthlyHistory {
  periodMonth: number;
  periodYear: number;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
}

export interface EmployeeProjectAssignment {
  projectId: string;
  projectName: string;
  designationId: string;
  designationName: string;
  sellingRatePaise: number | null;
  assignedAt: string;
}

export interface EmployeeUtilisationSummary {
  billableHours: number;
  totalHours: number;
  utilisationPercent: number;
}

export interface EmployeeDetailResult {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
  annualCtcPaise: number;
  isBillable: boolean;
  isResigned: boolean;
  utilisationSummary: EmployeeUtilisationSummary | null;
  monthlyHistory: EmployeeMonthlyHistory[];
  projectAssignments: EmployeeProjectAssignment[];
}

export async function getEmployeeDetail(
  user: RequestUser,
  employeeId: string,
): Promise<EmployeeDetailResult | null> {
  // Fetch employee with department — include resigned employees for status badge display
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      designation: true,
      annualCtcPaise: true,
      isBillable: true,
      isResigned: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  if (!employee) return null;

  // RBAC: DEPT_HEAD can only see own-department employees; HR/ADMIN/FINANCE see all
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE' && user.role !== 'HR') {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });
    if (currentUser?.departmentId !== employee.departmentId) {
      return null;
    }
  }

  // Fetch all EMPLOYEE snapshots for this employee across all periods
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'EMPLOYEE', entityId: employeeId },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { calculatedAt: 'desc' }],
    select: { figureType: true, valuePaise: true, breakdownJson: true, periodMonth: true, periodYear: true, calculatedAt: true },
  });

  // Deduplicate by (periodMonth, periodYear, figureType) — keep latest
  const seenPeriodFigure = new Set<string>();
  const dedupedSnaps: typeof snapshots = [];
  for (const snap of snapshots) {
    const key = `${snap.periodYear}-${snap.periodMonth}-${snap.figureType}`;
    if (!seenPeriodFigure.has(key)) {
      seenPeriodFigure.add(key);
      dedupedSnaps.push(snap);
    }
  }

  // Group by period
  const periodData = new Map<string, { cost: number; revenue: number; totalHours: number; billableHours: number; periodMonth: number; periodYear: number }>();
  for (const snap of dedupedSnaps) {
    const periodKey = `${snap.periodYear}-${snap.periodMonth}`;
    const existing = periodData.get(periodKey) ?? { cost: 0, revenue: 0, totalHours: 0, billableHours: 0, periodMonth: snap.periodMonth, periodYear: snap.periodYear };
    if (snap.figureType === 'EMPLOYEE_COST') {
      existing.cost = Number(snap.valuePaise);
      const bd = snap.breakdownJson as Record<string, number>;
      existing.totalHours = bd.totalHours ?? 0;
      existing.billableHours = bd.billableHours ?? 0;
    } else if (snap.figureType === 'REVENUE_CONTRIBUTION') {
      existing.revenue = Number(snap.valuePaise);
    }
    periodData.set(periodKey, existing);
  }

  const config = await getConfig();
  const standardMonthlyHours = config.standardMonthlyHours;

  const monthlyHistory: EmployeeMonthlyHistory[] = [...periodData.values()].map((pd) => ({
    periodMonth: pd.periodMonth,
    periodYear: pd.periodYear,
    totalHours: pd.totalHours,
    billableHours: pd.billableHours,
    billableUtilisationPercent: standardMonthlyHours === 0 ? 0 : pd.billableHours / standardMonthlyHours,
    totalCostPaise: pd.cost,
    revenueContributionPaise: pd.revenue,
    profitContributionPaise: pd.revenue - pd.cost,
  }));

  // Sort by period descending
  monthlyHistory.sort((a, b) => (b.periodYear - a.periodYear) || (b.periodMonth - a.periodMonth));

  // Utilization summary from latest period
  let utilisationSummary: EmployeeUtilisationSummary | null = null;
  if (monthlyHistory.length > 0) {
    const latest = monthlyHistory[0]!;
    utilisationSummary = {
      billableHours: latest.billableHours,
      totalHours: latest.totalHours,
      utilisationPercent: latest.billableUtilisationPercent,
    };
  }

  // Fetch project assignments with selling rate and assigned date
  const assignments = await prisma.employeeProject.findMany({
    where: { employeeId },
    select: {
      designationId: true,
      billingRatePaise: true,
      assignedAt: true,
      designation: { select: { name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const projectAssignments: EmployeeProjectAssignment[] = assignments.map((a) => ({
    projectId: a.project.id,
    projectName: a.project.name,
    designationId: a.designationId,
    designationName: a.designation.name,
    sellingRatePaise: a.billingRatePaise != null ? Number(a.billingRatePaise) : null,
    assignedAt: a.assignedAt.toISOString(),
  }));

  // Defense in depth: strip financial fields for HR role
  const isHR = user.role === 'HR';
  const finalHistory = isHR
    ? monthlyHistory.map(({ totalCostPaise: _c, revenueContributionPaise: _r, profitContributionPaise: _p, ...rest }) => ({
        ...rest,
        totalCostPaise: 0,
        revenueContributionPaise: 0,
        profitContributionPaise: 0,
      }))
    : monthlyHistory;

  const finalAssignments = isHR
    ? projectAssignments.map(({ sellingRatePaise: _s, ...rest }) => ({ ...rest, sellingRatePaise: null }))
    : projectAssignments;

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    designation: employee.designation,
    department: employee.department.name,
    annualCtcPaise: Number(employee.annualCtcPaise),
    isBillable: employee.isBillable,
    isResigned: employee.isResigned,
    utilisationSummary,
    monthlyHistory: finalHistory,
    projectAssignments: finalAssignments,
  };
}

// ---------------------------------------------------------------------------
// Client Dashboard (Story 11.7)
// ---------------------------------------------------------------------------

export interface ClientDashboardRow {
  clientName: string;
  totalRevenuePaise: number;
  totalCostPaise: number;
  profitPaise: number;
  marginPercent: number | null;
  activeProjectCount: number;
}

export async function getClientDashboard(): Promise<ClientDashboardRow[]> {
  const period = await findLatestPeriod('PROJECT');
  if (!period) return [];

  const { periodMonth, periodYear } = period;

  // Fetch all PROJECT MARGIN_PERCENT snapshots for latest period
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'PROJECT', figureType: 'MARGIN_PERCENT', periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, breakdownJson: true, calculatedAt: true },
  });

  // Deduplicate by entityId — keep latest
  const latestByProject = new Map<string, (typeof snapshots)[0]>();
  for (const snap of snapshots) {
    if (!latestByProject.has(snap.entityId)) {
      latestByProject.set(snap.entityId, snap);
    }
  }

  const projectIds = [...latestByProject.keys()];
  if (projectIds.length === 0) return [];

  // Fetch project metadata — client name
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, client: true, status: true },
  });

  // Group by client (case-insensitive)
  const clientMap = new Map<string, {
    displayName: string;
    revenue: number;
    cost: number;
    activeCount: number;
  }>();

  for (const project of projects) {
    if (!project.client) continue; // Skip projects without a client

    const clientKey = project.client.trim().toLowerCase();
    const existing = clientMap.get(clientKey) ?? { displayName: project.client.trim(), revenue: 0, cost: 0, activeCount: 0 };

    const snap = latestByProject.get(project.id);
    if (snap) {
      const breakdown = snap.breakdownJson as Record<string, number>;
      existing.revenue += breakdown.revenue ?? 0;
      existing.cost += breakdown.cost ?? 0;
    }

    if (project.status === 'ACTIVE') {
      existing.activeCount += 1;
    }

    clientMap.set(clientKey, existing);
  }

  // Build result rows
  const rows: ClientDashboardRow[] = [...clientMap.values()].map((data) => {
    const profit = data.revenue - data.cost;
    const margin = data.revenue === 0 ? null : profit / data.revenue;
    return {
      clientName: data.displayName,
      totalRevenuePaise: data.revenue,
      totalCostPaise: data.cost,
      profitPaise: profit,
      marginPercent: margin,
      activeProjectCount: data.activeCount,
    };
  });

  // Sort by revenue descending
  rows.sort((a, b) => b.totalRevenuePaise - a.totalRevenuePaise);
  return rows;
}

export interface ClientProjectRow {
  projectId: string;
  projectName: string;
  engagementModel: string;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

export async function getClientProjects(clientName: string): Promise<ClientProjectRow[]> {
  const period = await findLatestPeriod('PROJECT');
  if (!period) return [];

  const { periodMonth, periodYear } = period;

  // Find all projects for this client (case-insensitive match)
  const projects = await prisma.project.findMany({
    where: { client: { equals: clientName, mode: 'insensitive' } },
    select: { id: true, name: true, engagementModel: true, status: true },
  });

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  // Fetch snapshots for these projects
  const snapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'PROJECT', figureType: 'MARGIN_PERCENT', entityId: { in: projectIds }, periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, valuePaise: true, breakdownJson: true, calculatedAt: true },
  });

  const latestByProject = new Map<string, (typeof snapshots)[0]>();
  for (const snap of snapshots) {
    if (!latestByProject.has(snap.entityId)) {
      latestByProject.set(snap.entityId, snap);
    }
  }

  return projects.map((project) => {
    const snap = latestByProject.get(project.id);
    const breakdown = (snap?.breakdownJson as Record<string, number>) ?? {};
    const revenue = breakdown.revenue ?? 0;
    const cost = breakdown.cost ?? 0;
    return {
      projectId: project.id,
      projectName: project.name,
      engagementModel: project.engagementModel,
      status: project.status,
      revenuePaise: revenue,
      costPaise: cost,
      profitPaise: revenue - cost,
      marginPercent: snap ? Number(snap.valuePaise) / 10000 : 0,
    };
  });
}

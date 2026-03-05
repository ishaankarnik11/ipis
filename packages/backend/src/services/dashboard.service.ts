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

  const projectRows: ProjectDashboardRow[] = projects.map((project) => {
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
    };
  });

  // Sort by margin DESC for top-5
  const sorted = [...projectRows].sort((a, b) => b.marginPercent - a.marginPercent);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse(); // worst margin first

  // Billable utilisation from EMPLOYEE snapshots
  // Note: Uses simple entityId dedup (not collectEntityFinancials) because we only need
  // breakdownJson hours from EMPLOYEE_COST — one figureType, so per-figureType dedup is unnecessary.
  const empSnapshots = await prisma.calculationSnapshot.findMany({
    where: { entityType: 'EMPLOYEE', figureType: 'EMPLOYEE_COST', periodMonth, periodYear },
    orderBy: { calculatedAt: 'desc' },
    select: { entityId: true, breakdownJson: true, calculatedAt: true },
  });

  const seenEmp = new Set<string>();
  let totalBillable = 0;
  let totalAvailable = 0;
  for (const snap of empSnapshots) {
    if (seenEmp.has(snap.entityId)) continue;
    seenEmp.add(snap.entityId);
    const bd = snap.breakdownJson as Record<string, number>;
    totalBillable += bd.billableHours ?? 0;
    totalAvailable += bd.availableHours ?? 0;
  }

  const billableUtilisationPercent = totalAvailable === 0 ? 0 : totalBillable / totalAvailable;

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
  marginPercent: number;
}

export async function getDepartmentDashboard(user: RequestUser): Promise<DepartmentDashboardRow[]> {
  const period = await findLatestPeriod('DEPARTMENT');
  if (!period) return [];

  const { periodMonth, periodYear } = period;

  const financials = await collectEntityFinancials('DEPARTMENT', periodMonth, periodYear);

  // Resolve department names
  const deptIds = [...financials.keys()];
  const departments = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true },
  });

  const deptNameMap = new Map<string, string>();
  for (const dept of departments) {
    deptNameMap.set(dept.id, dept.name);
  }

  let rows: DepartmentDashboardRow[] = [];
  for (const [deptId, fin] of financials) {
    rows.push({
      departmentId: deptId,
      departmentName: deptNameMap.get(deptId) ?? deptId,
      ...fin,
    });
  }

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

  // Department breakdown (unscoped — all departments)
  const deptFinancials = await collectEntityFinancials('DEPARTMENT', periodMonth, periodYear);
  const deptIds = [...deptFinancials.keys()];
  const departments = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true },
  });

  const deptNameMap = new Map<string, string>();
  for (const dept of departments) {
    deptNameMap.set(dept.id, dept.name);
  }

  const deptRows: DepartmentDashboardRow[] = [];
  for (const [deptId, fin] of deptFinancials) {
    deptRows.push({
      departmentId: deptId,
      departmentName: deptNameMap.get(deptId) ?? deptId,
      ...fin,
    });
  }

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
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  // Step 4: Get standardMonthlyHours from config
  const config = await getConfig();
  const standardMonthlyHours = config.standardMonthlyHours;

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
  // NOTE: "profitabilityRank" is intentionally ranked by revenueContributionPaise DESC (not profit).
  // This matches FR38/AC8: "highest revenue contributors appear first". The naming aligns with
  // the PRD's definition of profitability ranking, which uses revenue as the primary sort key.
  const sortedForRank = [...allRows].sort((a, b) => b.revenueContributionPaise - a.revenueContributionPaise);
  const rankMap = new Map<string, number>();
  sortedForRank.forEach((row, index) => {
    rankMap.set(row.employeeId, index + 1);
  });
  for (const row of allRows) {
    row.profitabilityRank = rankMap.get(row.employeeId)!;
  }

  // Step 7: RBAC scoping
  let filtered = allRows;
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
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
  return filtered.map(({ departmentId: _deptId, ...rest }) => rest);
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
  roleId: string;
  roleName: string;
}

export interface EmployeeDetailResult {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  monthlyHistory: EmployeeMonthlyHistory[];
  projectAssignments: EmployeeProjectAssignment[];
}

export async function getEmployeeDetail(
  user: RequestUser,
  employeeId: string,
): Promise<EmployeeDetailResult | null> {
  // Fetch employee with department — exclude resigned employees (consistent with dashboard list)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      designation: true,
      isResigned: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  if (!employee || employee.isResigned) return null;

  // RBAC: DEPT_HEAD can only see own-department employees
  if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
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

  // Fetch project assignments
  const assignments = await prisma.employeeProject.findMany({
    where: { employeeId },
    select: {
      roleId: true,
      projectRole: { select: { name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const projectAssignments: EmployeeProjectAssignment[] = assignments.map((a) => ({
    projectId: a.project.id,
    projectName: a.project.name,
    roleId: a.roleId,
    roleName: a.projectRole.name,
  }));

  return {
    employeeId: employee.id,
    name: employee.name,
    designation: employee.designation,
    department: employee.department.name,
    monthlyHistory,
    projectAssignments,
  };
}

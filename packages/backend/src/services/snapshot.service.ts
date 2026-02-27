import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const ENGINE_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface EmployeeSnapshotData {
  employeeId: string;
  name: string;
  designation: string;
  departmentId: string;
  hours: number;
  costPerHourPaise: number;
  contributionPaise: number;
  billingRatePaise: number | null;
  billableHours: number;
  availableHours: number;
}

export interface ProjectResult {
  projectId: string;
  engagementModel: 'TIME_AND_MATERIALS' | 'FIXED_COST' | 'AMC' | 'INFRASTRUCTURE';
  infraCostMode: 'SIMPLE' | 'DETAILED' | null;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  vendorCostPaise?: number;
  manpowerCostPaise?: number;
  projectDepartmentId?: string;
  employees: EmployeeSnapshotData[];
}

export interface PersistSnapshotsInput {
  recalculationRunId: string;
  periodMonth: number;
  periodYear: number;
  projectResults: ProjectResult[];
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Breakdown JSON shapes by entity/figure:
 *
 * PROJECT + MARGIN_PERCENT (model-aware):
 *   T&M/FC/AMC:         { engagementModel, revenue, cost, profit, employees: [{...}] }
 *   Infra DETAILED:      { engagementModel, infraCostMode:'DETAILED', revenue, cost, profit, vendorCostPaise, employees: [{...}] }
 *   Infra SIMPLE:        { engagementModel, infraCostMode:'SIMPLE', revenue, cost, profit, vendorCostPaise, manpowerCostPaise }
 *
 * EMPLOYEE + EMPLOYEE_COST: { totalHours, billableHours }
 * All others:               {}
 */
type BreakdownJson = Record<string, unknown>;

interface SnapshotRow {
  recalculationRunId: string;
  entityType: string;
  entityId: string;
  figureType: string;
  periodMonth: number;
  periodYear: number;
  valuePaise: bigint;
  breakdownJson: BreakdownJson;
  engineVersion: string;
  calculatedAt: Date;
}

// ---------------------------------------------------------------------------
// Breakdown JSON builders (AC 10)
// ---------------------------------------------------------------------------

function buildProjectBreakdownJson(pr: ProjectResult): BreakdownJson {
  const isInfraSimple =
    pr.engagementModel === 'INFRASTRUCTURE' && pr.infraCostMode === 'SIMPLE';
  const isInfraDetailed =
    pr.engagementModel === 'INFRASTRUCTURE' && pr.infraCostMode === 'DETAILED';

  if (isInfraSimple) {
    return {
      engagementModel: pr.engagementModel,
      infraCostMode: 'SIMPLE',
      revenue: pr.revenuePaise,
      cost: pr.costPaise,
      profit: pr.profitPaise,
      vendorCostPaise: pr.vendorCostPaise ?? 0,
      manpowerCostPaise: pr.manpowerCostPaise ?? 0,
    };
  }

  const employees = pr.employees.map((emp) => ({
    employeeId: emp.employeeId,
    name: emp.name,
    designation: emp.designation,
    hours: emp.hours,
    costPerHourPaise: emp.costPerHourPaise,
    contributionPaise: emp.contributionPaise,
  }));

  if (isInfraDetailed) {
    return {
      engagementModel: pr.engagementModel,
      infraCostMode: 'DETAILED',
      revenue: pr.revenuePaise,
      cost: pr.costPaise,
      profit: pr.profitPaise,
      vendorCostPaise: pr.vendorCostPaise ?? 0,
      employees,
    };
  }

  // T&M, Fixed Cost, AMC
  return {
    engagementModel: pr.engagementModel,
    revenue: pr.revenuePaise,
    cost: pr.costPaise,
    profit: pr.profitPaise,
    employees,
  };
}

// ---------------------------------------------------------------------------
// Row builders — one per entity level
// ---------------------------------------------------------------------------

function buildProjectRows(input: PersistSnapshotsInput, now: Date): SnapshotRow[] {
  const rows: SnapshotRow[] = [];

  for (const pr of input.projectResults) {
    const base = {
      recalculationRunId: input.recalculationRunId,
      entityType: 'PROJECT',
      entityId: pr.projectId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      engineVersion: ENGINE_VERSION,
      calculatedAt: now,
    };

    rows.push({
      ...base,
      figureType: 'MARGIN_PERCENT',
      valuePaise: BigInt(Math.round(pr.marginPercent * 10000)),
      breakdownJson: buildProjectBreakdownJson(pr),
    });

    rows.push({
      ...base,
      figureType: 'EMPLOYEE_COST',
      valuePaise: BigInt(pr.costPaise),
      breakdownJson: {},
    });

    rows.push({
      ...base,
      figureType: 'REVENUE_CONTRIBUTION',
      valuePaise: BigInt(pr.revenuePaise),
      breakdownJson: {},
    });
  }

  return rows;
}

/**
 * Aggregates costs by designation (practice) across all projects and allocates
 * revenue proportionally by each designation's cost contribution.
 *
 * Note: For Infrastructure DETAILED projects, vendor costs are included in
 * `costPaise` but not attributed to any employee. This means the sum of all
 * practice-level REVENUE_CONTRIBUTION rows will be less than the company total
 * — the vendor share is captured only at PROJECT and COMPANY levels.
 */
function buildPracticeRows(input: PersistSnapshotsInput, now: Date): SnapshotRow[] {
  const practiceMap = new Map<string, { costPaise: number; revenuePaise: number }>();

  for (const pr of input.projectResults) {
    for (const emp of pr.employees) {
      const existing = practiceMap.get(emp.designation) ?? {
        costPaise: 0,
        revenuePaise: 0,
      };
      existing.costPaise += emp.contributionPaise;
      const revenueShare =
        pr.costPaise > 0
          ? Math.round((emp.contributionPaise / pr.costPaise) * pr.revenuePaise)
          : 0;
      existing.revenuePaise += revenueShare;
      practiceMap.set(emp.designation, existing);
    }
  }

  const rows: SnapshotRow[] = [];

  for (const [designation, agg] of practiceMap) {
    const profit = agg.revenuePaise - agg.costPaise;
    const margin = agg.revenuePaise === 0 ? 0 : profit / agg.revenuePaise;
    const base = {
      recalculationRunId: input.recalculationRunId,
      entityType: 'PRACTICE',
      entityId: designation,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      engineVersion: ENGINE_VERSION,
      calculatedAt: now,
    };

    rows.push({
      ...base,
      figureType: 'MARGIN_PERCENT',
      valuePaise: BigInt(Math.round(margin * 10000)),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'EMPLOYEE_COST',
      valuePaise: BigInt(agg.costPaise),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'REVENUE_CONTRIBUTION',
      valuePaise: BigInt(agg.revenuePaise),
      breakdownJson: {},
    });
  }

  return rows;
}

/**
 * Aggregates costs by department across all projects. For projects with employee
 * assignments, groups by each employee's departmentId. For Infrastructure SIMPLE
 * (no employees), falls back to the project's own departmentId.
 *
 * Note: Same vendor cost revenue gap as practice-level — see buildPracticeRows.
 */
function buildDepartmentRows(input: PersistSnapshotsInput, now: Date): SnapshotRow[] {
  const deptMap = new Map<string, { costPaise: number; revenuePaise: number }>();

  for (const pr of input.projectResults) {
    if (pr.employees.length > 0) {
      for (const emp of pr.employees) {
        const existing = deptMap.get(emp.departmentId) ?? {
          costPaise: 0,
          revenuePaise: 0,
        };
        existing.costPaise += emp.contributionPaise;
        const revenueShare =
          pr.costPaise > 0
            ? Math.round((emp.contributionPaise / pr.costPaise) * pr.revenuePaise)
            : 0;
        existing.revenuePaise += revenueShare;
        deptMap.set(emp.departmentId, existing);
      }
    } else if (pr.projectDepartmentId) {
      // Infrastructure SIMPLE: no employees — attribute to project's department
      const existing = deptMap.get(pr.projectDepartmentId) ?? {
        costPaise: 0,
        revenuePaise: 0,
      };
      existing.costPaise += pr.costPaise;
      existing.revenuePaise += pr.revenuePaise;
      deptMap.set(pr.projectDepartmentId, existing);
    }
  }

  const rows: SnapshotRow[] = [];

  for (const [deptId, agg] of deptMap) {
    const profit = agg.revenuePaise - agg.costPaise;
    const margin = agg.revenuePaise === 0 ? 0 : profit / agg.revenuePaise;
    const base = {
      recalculationRunId: input.recalculationRunId,
      entityType: 'DEPARTMENT',
      entityId: deptId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      engineVersion: ENGINE_VERSION,
      calculatedAt: now,
    };

    rows.push({
      ...base,
      figureType: 'MARGIN_PERCENT',
      valuePaise: BigInt(Math.round(margin * 10000)),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'EMPLOYEE_COST',
      valuePaise: BigInt(agg.costPaise),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'REVENUE_CONTRIBUTION',
      valuePaise: BigInt(agg.revenuePaise),
      breakdownJson: {},
    });
  }

  return rows;
}

function buildCompanyRows(input: PersistSnapshotsInput, now: Date): SnapshotRow[] {
  let totalCost = 0;
  let totalRevenue = 0;

  for (const pr of input.projectResults) {
    totalCost += pr.costPaise;
    totalRevenue += pr.revenuePaise;
  }

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue === 0 ? 0 : profit / totalRevenue;
  const base = {
    recalculationRunId: input.recalculationRunId,
    entityType: 'COMPANY',
    entityId: 'COMPANY',
    periodMonth: input.periodMonth,
    periodYear: input.periodYear,
    engineVersion: ENGINE_VERSION,
    calculatedAt: now,
  };

  return [
    {
      ...base,
      figureType: 'MARGIN_PERCENT',
      valuePaise: BigInt(Math.round(margin * 10000)),
      breakdownJson: {},
    },
    {
      ...base,
      figureType: 'EMPLOYEE_COST',
      valuePaise: BigInt(totalCost),
      breakdownJson: {},
    },
    {
      ...base,
      figureType: 'REVENUE_CONTRIBUTION',
      valuePaise: BigInt(totalRevenue),
      breakdownJson: {},
    },
  ];
}

function buildEmployeeRows(input: PersistSnapshotsInput, now: Date): SnapshotRow[] {
  const empMap = new Map<
    string,
    {
      totalHours: number;
      billableHours: number;
      availableHours: number;
      totalCostPaise: number;
      revenueContributionPaise: number;
    }
  >();

  for (const pr of input.projectResults) {
    // AC 11: Skip Infrastructure SIMPLE (no employee assignments)
    if (pr.engagementModel === 'INFRASTRUCTURE' && pr.infraCostMode === 'SIMPLE') continue;

    for (const emp of pr.employees) {
      const existing = empMap.get(emp.employeeId) ?? {
        totalHours: 0,
        billableHours: 0,
        availableHours: 0,
        totalCostPaise: 0,
        revenueContributionPaise: 0,
      };
      existing.totalHours += emp.hours;
      existing.billableHours += emp.billableHours;
      existing.availableHours += emp.availableHours;
      existing.totalCostPaise += emp.contributionPaise;
      const revenueShare =
        pr.costPaise > 0
          ? Math.round((emp.contributionPaise / pr.costPaise) * pr.revenuePaise)
          : 0;
      existing.revenueContributionPaise += revenueShare;
      empMap.set(emp.employeeId, existing);
    }
  }

  const rows: SnapshotRow[] = [];

  for (const [empId, agg] of empMap) {
    const base = {
      recalculationRunId: input.recalculationRunId,
      entityType: 'EMPLOYEE',
      entityId: empId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      engineVersion: ENGINE_VERSION,
      calculatedAt: now,
    };

    // UTILIZATION: total hours worked / available hours (capacity usage)
    const utilPercent =
      agg.availableHours === 0 ? 0 : agg.totalHours / agg.availableHours;
    // BILLABLE: billable hours / total hours worked (billing efficiency)
    const billablePercent =
      agg.totalHours === 0 ? 0 : agg.billableHours / agg.totalHours;
    const costPerHour =
      agg.totalHours === 0 ? 0 : Math.round(agg.totalCostPaise / agg.totalHours);

    rows.push({
      ...base,
      figureType: 'EMPLOYEE_COST',
      valuePaise: BigInt(agg.totalCostPaise),
      breakdownJson: {
        totalHours: agg.totalHours,
        billableHours: agg.billableHours,
      },
    });
    rows.push({
      ...base,
      figureType: 'COST_PER_HOUR',
      valuePaise: BigInt(costPerHour),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'REVENUE_CONTRIBUTION',
      valuePaise: BigInt(agg.revenueContributionPaise),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'UTILIZATION_PERCENT',
      valuePaise: BigInt(Math.round(utilPercent * 10000)),
      breakdownJson: {},
    });
    rows.push({
      ...base,
      figureType: 'BILLABLE_PERCENT',
      valuePaise: BigInt(Math.round(billablePercent * 10000)),
      breakdownJson: {},
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Persists calculation snapshots for all entity levels (PROJECT, PRACTICE,
 * DEPARTMENT, COMPANY, EMPLOYEE) within a single atomic transaction.
 *
 * All monetary values in `projectResults` must be integer paise; percentages
 * are stored as basis points (multiplied by 10,000) in BIGINT `value_paise`.
 *
 * Error isolation (AC8): on failure, logs via pino and never rethrows — prior
 * snapshots remain intact. Caller (upload.service.ts) decides recovery action.
 */
export async function persistSnapshots(input: PersistSnapshotsInput): Promise<void> {
  try {
    const now = new Date();
    const allRows = [
      ...buildProjectRows(input, now),
      ...buildPracticeRows(input, now),
      ...buildDepartmentRows(input, now),
      ...buildCompanyRows(input, now),
      ...buildEmployeeRows(input, now),
    ];

    if (allRows.length === 0) {
      logger.info(
        { recalculationRunId: input.recalculationRunId },
        'No snapshot rows to persist',
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.calculationSnapshot.createMany({
        data: allRows.map((row) => ({
          recalculationRunId: row.recalculationRunId,
          entityType: row.entityType,
          entityId: row.entityId,
          figureType: row.figureType,
          periodMonth: row.periodMonth,
          periodYear: row.periodYear,
          valuePaise: row.valuePaise,
          breakdownJson: row.breakdownJson as object, // Prisma InputJsonValue requires explicit cast from Record<string, unknown>
          engineVersion: row.engineVersion,
          calculatedAt: row.calculatedAt,
        })),
      });
    });

    logger.info(
      { recalculationRunId: input.recalculationRunId, rowCount: allRows.length },
      'Snapshots persisted successfully',
    );
  } catch (error) {
    logger.error(
      { err: error, recalculationRunId: input.recalculationRunId },
      'Failed to persist snapshots — previous snapshots remain intact',
    );
    // Never rethrow — AC8 error isolation
  }
}

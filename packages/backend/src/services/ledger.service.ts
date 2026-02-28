import { prisma } from '../lib/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../lib/errors.js';

interface RequestUser {
  id: string;
  role: string;
  email: string;
}

interface BreakdownEmployee {
  employeeId: string;
  name: string;
  designation: string;
  hours: number;
  costPerHourPaise: number;
  contributionPaise: number;
}

interface BaseBreakdown {
  engagementModel: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface EmployeeBreakdown extends BaseBreakdown {
  employees: BreakdownEmployee[];
}

interface InfraDetailedBreakdown extends EmployeeBreakdown {
  infraCostMode: 'DETAILED';
  vendorCostPaise: number;
}

interface InfraSimpleBreakdown extends BaseBreakdown {
  infraCostMode: 'SIMPLE';
  vendorCostPaise: number;
  manpowerCostPaise: number;
}

type BreakdownJson = EmployeeBreakdown | InfraDetailedBreakdown | InfraSimpleBreakdown;

interface LedgerEmployee {
  employeeId: string;
  employeeName: string;
  designation: string;
  hours: number;
  cost_per_hour_paise: number;
  contribution_paise: number;
}

interface BaseLedgerResponse {
  revenue_paise: number;
  cost_paise: number;
  profit_paise: number;
  margin_percent: number;
  engagement_model: string;
  calculated_at: string;
  engine_version: string;
  recalculation_run_id: string;
}

interface EmployeeLedgerResponse extends BaseLedgerResponse {
  employees: LedgerEmployee[];
}

interface InfraDetailedLedgerResponse extends EmployeeLedgerResponse {
  infra_cost_mode: 'DETAILED';
  vendor_cost_paise: number;
}

interface InfraSimpleLedgerResponse extends BaseLedgerResponse {
  infra_cost_mode: 'SIMPLE';
  vendor_cost_paise: number;
  manpower_cost_paise: number;
}

export type LedgerResponse = EmployeeLedgerResponse | InfraDetailedLedgerResponse | InfraSimpleLedgerResponse;

export async function getProjectLedger(
  projectId: string,
  periodMonth: number,
  periodYear: number,
  user: RequestUser,
): Promise<LedgerResponse> {
  // RBAC ownership check (AC 5) — applied in service layer
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { deliveryManagerId: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (user.role === 'DELIVERY_MANAGER' && project.deliveryManagerId !== user.id) {
    throw new ForbiddenError('You can only access ledger data for projects you manage');
  }

  // Query the latest MARGIN_PERCENT snapshot for this project/period (AC 1)
  // The MARGIN_PERCENT row contains the full breakdown_json with all detail
  const snapshot = await prisma.calculationSnapshot.findFirst({
    where: {
      entityType: 'PROJECT',
      entityId: projectId,
      figureType: 'MARGIN_PERCENT',
      periodMonth,
      periodYear,
    },
    orderBy: { calculatedAt: 'desc' },
    select: {
      valuePaise: true,
      breakdownJson: true,
      calculatedAt: true,
      engineVersion: true,
      recalculationRunId: true,
    },
  });

  if (!snapshot) {
    throw new AppError('SNAPSHOT_NOT_FOUND', 'No calculation data available for this period', 404);
  }

  const breakdown = snapshot.breakdownJson as unknown as BreakdownJson;
  const marginPercent = Number(snapshot.valuePaise) / 10000;

  const base: BaseLedgerResponse = {
    revenue_paise: breakdown.revenue,
    cost_paise: breakdown.cost,
    profit_paise: breakdown.profit,
    margin_percent: marginPercent,
    engagement_model: breakdown.engagementModel,
    calculated_at: snapshot.calculatedAt.toISOString(),
    engine_version: snapshot.engineVersion,
    recalculation_run_id: snapshot.recalculationRunId,
  };

  // Infrastructure SIMPLE — no employees (AC 2)
  if (breakdown.engagementModel === 'INFRASTRUCTURE' && 'infraCostMode' in breakdown && breakdown.infraCostMode === 'SIMPLE') {
    const b = breakdown as InfraSimpleBreakdown;
    return {
      ...base,
      infra_cost_mode: 'SIMPLE',
      vendor_cost_paise: b.vendorCostPaise,
      manpower_cost_paise: b.manpowerCostPaise,
    };
  }

  // Infrastructure DETAILED — employees + vendor cost (AC 2)
  if (breakdown.engagementModel === 'INFRASTRUCTURE' && 'infraCostMode' in breakdown && breakdown.infraCostMode === 'DETAILED') {
    const b = breakdown as InfraDetailedBreakdown;
    return {
      ...base,
      infra_cost_mode: 'DETAILED',
      vendor_cost_paise: b.vendorCostPaise,
      employees: mapEmployees(b.employees),
    };
  }

  // T&M / Fixed Cost / AMC — employees array (AC 2)
  const b = breakdown as EmployeeBreakdown;
  return {
    ...base,
    employees: mapEmployees(b.employees),
  };
}

function mapEmployees(employees: BreakdownEmployee[]): LedgerEmployee[] {
  return employees.map((emp) => ({
    employeeId: emp.employeeId,
    employeeName: emp.name,
    designation: emp.designation,
    hours: emp.hours,
    cost_per_hour_paise: emp.costPerHourPaise,
    contribution_paise: emp.contributionPaise,
  }));
}

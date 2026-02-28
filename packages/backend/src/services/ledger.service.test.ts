import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { getProjectLedger } from './ledger.service.js';

afterAll(async () => {
  await disconnectTestDb();
});

describe('ledger.service — getProjectLedger', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let dmUser: { id: string; role: string; email: string };
  let otherDmUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();

    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };

    const dm = await createTestUser('DELIVERY_MANAGER', { departmentId: depts.get('Delivery') });
    dmUser = { id: dm.id, role: dm.role, email: dm.email };

    const otherDm = await createTestUser('DELIVERY_MANAGER', {
      email: 'other-dm@test.com',
      departmentId: depts.get('Delivery'),
    });
    otherDmUser = { id: otherDm.id, role: otherDm.role, email: otherDm.email };
  });

  async function createProjectWithSnapshot(opts: {
    deliveryManagerId: string;
    engagementModel: 'TIME_AND_MATERIALS' | 'FIXED_COST' | 'AMC' | 'INFRASTRUCTURE';
    infraCostMode?: 'SIMPLE' | 'DETAILED' | null;
    breakdownJson: object;
    marginBasisPoints: number;
  }) {
    const project = await prisma.project.create({
      data: {
        name: `Test ${opts.engagementModel} Project`,
        client: 'Test Client',
        vertical: 'IT Services',
        engagementModel: opts.engagementModel,
        status: 'ACTIVE',
        deliveryManagerId: opts.deliveryManagerId,
        infraCostMode: opts.infraCostMode ?? null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    const uploadEvent = await prisma.uploadEvent.create({
      data: {
        type: 'TIMESHEET',
        status: 'SUCCESS',
        uploadedBy: opts.deliveryManagerId,
        periodMonth: 1,
        periodYear: 2026,
        rowCount: 10,
      },
    });

    const run = await prisma.recalculationRun.create({
      data: {
        uploadEventId: uploadEvent.id,
        projectsProcessed: 1,
        completedAt: new Date(),
      },
    });

    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run.id,
        entityType: 'PROJECT',
        entityId: project.id,
        figureType: 'MARGIN_PERCENT',
        periodMonth: 1,
        periodYear: 2026,
        valuePaise: BigInt(opts.marginBasisPoints),
        breakdownJson: opts.breakdownJson,
        engineVersion: '1.0.0',
        calculatedAt: new Date(),
      },
    });

    return project;
  }

  // ── AC 1, 2: Valid T&M project — returns breakdown with employees array ──

  it('returns T&M ledger with employees array (AC 1, 2)', async () => {
    const breakdown = {
      engagementModel: 'TIME_AND_MATERIALS',
      revenue: 50000000,
      cost: 35000000,
      profit: 15000000,
      employees: [
        {
          employeeId: 'emp-1',
          name: 'Jane Doe',
          designation: 'Senior Developer',
          hours: 160,
          costPerHourPaise: 53125,
          contributionPaise: 8500000,
        },
      ],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      breakdownJson: breakdown,
      marginBasisPoints: 3000, // 0.30
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);

    expect(result.revenue_paise).toBe(50000000);
    expect(result.cost_paise).toBe(35000000);
    expect(result.profit_paise).toBe(15000000);
    expect(result.margin_percent).toBe(0.3);
    expect(result.engagement_model).toBe('TIME_AND_MATERIALS');
    expect(result.engine_version).toBe('1.0.0');
    expect(result.recalculation_run_id).toBeDefined();
    expect(result.calculated_at).toBeDefined();

    expect('employees' in result).toBe(true);
    const withEmployees = result as typeof result & { employees: unknown[] };
    expect(withEmployees.employees).toHaveLength(1);
    expect(withEmployees.employees[0]).toMatchObject({
      employeeId: 'emp-1',
      employeeName: 'Jane Doe',
      designation: 'Senior Developer',
      hours: 160,
      cost_per_hour_paise: 53125,
      contribution_paise: 8500000,
    });
  });

  // ── AC 2: Valid AMC project — returns breakdown with employees array (multi-employee) ──

  it('returns AMC ledger with multi-employee array (AC 2)', async () => {
    const breakdown = {
      engagementModel: 'AMC',
      revenue: 30000000,
      cost: 20000000,
      profit: 10000000,
      employees: [
        { employeeId: 'emp-1', name: 'Alice', designation: 'Dev', hours: 80, costPerHourPaise: 50000, contributionPaise: 4000000 },
        { employeeId: 'emp-2', name: 'Bob', designation: 'QA', hours: 60, costPerHourPaise: 40000, contributionPaise: 2400000 },
      ],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'AMC',
      breakdownJson: breakdown,
      marginBasisPoints: 3333,
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);

    expect(result.engagement_model).toBe('AMC');
    const withEmployees = result as typeof result & { employees: unknown[] };
    expect(withEmployees.employees).toHaveLength(2);
  });

  // ── AC 2: Infra SIMPLE — no employees array ──

  it('returns Infra SIMPLE ledger without employees (AC 2)', async () => {
    const breakdown = {
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'SIMPLE',
      revenue: 100000000,
      cost: 80000000,
      profit: 20000000,
      vendorCostPaise: 50000000,
      manpowerCostPaise: 30000000,
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'SIMPLE',
      breakdownJson: breakdown,
      marginBasisPoints: 2000,
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);

    expect(result.engagement_model).toBe('INFRASTRUCTURE');
    expect('infra_cost_mode' in result && result.infra_cost_mode).toBe('SIMPLE');
    expect('vendor_cost_paise' in result && result.vendor_cost_paise).toBe(50000000);
    expect('manpower_cost_paise' in result && result.manpower_cost_paise).toBe(30000000);
    expect('employees' in result).toBe(false);
  });

  // ── AC 2: Infra DETAILED — employees + vendor cost ──

  it('returns Infra DETAILED ledger with employees + vendor cost (AC 2)', async () => {
    const breakdown = {
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'DETAILED',
      revenue: 100000000,
      cost: 75000000,
      profit: 25000000,
      vendorCostPaise: 50000000,
      employees: [
        { employeeId: 'emp-1', name: 'Ops Engineer', designation: 'DevOps Lead', hours: 120, costPerHourPaise: 62500, contributionPaise: 7500000 },
      ],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'DETAILED',
      breakdownJson: breakdown,
      marginBasisPoints: 2500,
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);

    expect(result.engagement_model).toBe('INFRASTRUCTURE');
    expect('infra_cost_mode' in result && result.infra_cost_mode).toBe('DETAILED');
    expect('vendor_cost_paise' in result && result.vendor_cost_paise).toBe(50000000);
    const withEmployees = result as typeof result & { employees: unknown[] };
    expect(withEmployees.employees).toHaveLength(1);
  });

  // ── AC 3: 404 on missing snapshot ──

  it('throws SNAPSHOT_NOT_FOUND when no snapshot exists (AC 3)', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'No Snapshot Project',
        client: 'Test',
        vertical: 'IT',
        engagementModel: 'TIME_AND_MATERIALS',
        status: 'ACTIVE',
        deliveryManagerId: dmUser.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    await expect(getProjectLedger(project.id, 1, 2026, financeUser))
      .rejects.toMatchObject({
        code: 'SNAPSHOT_NOT_FOUND',
        statusCode: 404,
        message: 'No calculation data available for this period',
      });
  });

  // ── AC 5: DM accessing non-owned project — 403 ──

  it('throws ForbiddenError for DM accessing non-owned project (AC 5)', async () => {
    const breakdown = {
      engagementModel: 'TIME_AND_MATERIALS',
      revenue: 10000000,
      cost: 7000000,
      profit: 3000000,
      employees: [],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      breakdownJson: breakdown,
      marginBasisPoints: 3000,
    });

    await expect(getProjectLedger(project.id, 1, 2026, otherDmUser))
      .rejects.toMatchObject({
        statusCode: 403,
      });
  });

  // ── AC 5: Finance can access any project ──

  it('allows Finance to access any project ledger (AC 5)', async () => {
    const breakdown = {
      engagementModel: 'FIXED_COST',
      revenue: 20000000,
      cost: 15000000,
      profit: 5000000,
      employees: [],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      breakdownJson: breakdown,
      marginBasisPoints: 2500,
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);
    expect(result.revenue_paise).toBe(20000000);
  });

  // ── AC 5: DM accessing own project — allowed ──

  it('allows DM to access their own project ledger (AC 5)', async () => {
    const breakdown = {
      engagementModel: 'TIME_AND_MATERIALS',
      revenue: 10000000,
      cost: 7000000,
      profit: 3000000,
      employees: [],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      breakdownJson: breakdown,
      marginBasisPoints: 3000,
    });

    const result = await getProjectLedger(project.id, 1, 2026, dmUser);
    expect(result.revenue_paise).toBe(10000000);
  });

  // ── AC 6: All monetary values are integer paise ──

  it('returns all monetary values as integers (AC 6)', async () => {
    const breakdown = {
      engagementModel: 'TIME_AND_MATERIALS',
      revenue: 50000000,
      cost: 35000000,
      profit: 15000000,
      employees: [
        { employeeId: 'emp-1', name: 'Dev', designation: 'Dev', hours: 160, costPerHourPaise: 53125, contributionPaise: 8500000 },
      ],
    };

    const project = await createProjectWithSnapshot({
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      breakdownJson: breakdown,
      marginBasisPoints: 3000,
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);

    expect(Number.isInteger(result.revenue_paise)).toBe(true);
    expect(Number.isInteger(result.cost_paise)).toBe(true);
    expect(Number.isInteger(result.profit_paise)).toBe(true);
    expect(typeof result.margin_percent).toBe('number');
    // margin_percent is decimal, not integer
    expect(result.margin_percent).toBe(0.3);

    const withEmployees = result as typeof result & { employees: Array<{ cost_per_hour_paise: number; contribution_paise: number }> };
    expect(Number.isInteger(withEmployees.employees[0]!.cost_per_hour_paise)).toBe(true);
    expect(Number.isInteger(withEmployees.employees[0]!.contribution_paise)).toBe(true);
  });

  // ── Latest snapshot returned when multiple exist ──

  it('returns the latest snapshot when multiple exist for same period', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'Multi-Snapshot Project',
        client: 'Test',
        vertical: 'IT',
        engagementModel: 'TIME_AND_MATERIALS',
        status: 'ACTIVE',
        deliveryManagerId: dmUser.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    const uploadEvent = await prisma.uploadEvent.create({
      data: { type: 'TIMESHEET', status: 'SUCCESS', uploadedBy: dmUser.id, periodMonth: 1, periodYear: 2026, rowCount: 5 },
    });

    const run1 = await prisma.recalculationRun.create({
      data: { uploadEventId: uploadEvent.id, projectsProcessed: 1, completedAt: new Date('2026-01-15') },
    });

    const run2 = await prisma.recalculationRun.create({
      data: { uploadEventId: uploadEvent.id, projectsProcessed: 1, completedAt: new Date('2026-01-20') },
    });

    // Older snapshot
    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run1.id,
        entityType: 'PROJECT',
        entityId: project.id,
        figureType: 'MARGIN_PERCENT',
        periodMonth: 1,
        periodYear: 2026,
        valuePaise: BigInt(2000),
        breakdownJson: { engagementModel: 'TIME_AND_MATERIALS', revenue: 10000000, cost: 8000000, profit: 2000000, employees: [] },
        engineVersion: '1.0.0',
        calculatedAt: new Date('2026-01-15'),
      },
    });

    // Newer snapshot (should be returned)
    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run2.id,
        entityType: 'PROJECT',
        entityId: project.id,
        figureType: 'MARGIN_PERCENT',
        periodMonth: 1,
        periodYear: 2026,
        valuePaise: BigInt(3000),
        breakdownJson: { engagementModel: 'TIME_AND_MATERIALS', revenue: 50000000, cost: 35000000, profit: 15000000, employees: [] },
        engineVersion: '1.0.0',
        calculatedAt: new Date('2026-01-20'),
      },
    });

    const result = await getProjectLedger(project.id, 1, 2026, financeUser);
    expect(result.revenue_paise).toBe(50000000); // From newer snapshot
    expect(result.margin_percent).toBe(0.3);
  });
});

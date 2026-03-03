import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import {
  getProjectDashboard,
  getExecutiveDashboard,
  getPracticeDashboard,
  getDepartmentDashboard,
  getCompanyDashboard,
} from './dashboard.service.js';

afterAll(async () => {
  await disconnectTestDb();
});

describe('dashboard.service — getProjectDashboard', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let adminUser: { id: string; role: string; email: string };
  let dmUser: { id: string; role: string; email: string };
  let dm2User: { id: string; role: string; email: string };
  let deptHeadUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();

    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };

    const admin = await createTestUser('ADMIN');
    adminUser = { id: admin.id, role: admin.role, email: admin.email };

    const dm = await createTestUser('DELIVERY_MANAGER', { departmentId: depts.get('Delivery') });
    dmUser = { id: dm.id, role: dm.role, email: dm.email };

    const dm2 = await createTestUser('DELIVERY_MANAGER', {
      email: 'dm2@test.com',
      departmentId: depts.get('Engineering'),
    });
    dm2User = { id: dm2.id, role: dm2.role, email: dm2.email };

    const deptHead = await createTestUser('DEPT_HEAD', { departmentId: depts.get('Delivery') });
    deptHeadUser = { id: deptHead.id, role: deptHead.role, email: deptHead.email };
  });

  async function seedProjectWithSnapshot(opts: {
    name: string;
    deliveryManagerId: string;
    engagementModel: 'TIME_AND_MATERIALS' | 'FIXED_COST' | 'AMC' | 'INFRASTRUCTURE';
    vertical?: string;
    status?: string;
    marginBasisPoints: number;
    revenue: number;
    cost: number;
    profit: number;
    periodMonth?: number;
    periodYear?: number;
    calculatedAt?: Date;
  }) {
    const project = await prisma.project.create({
      data: {
        name: opts.name,
        client: 'Test Client',
        vertical: opts.vertical ?? 'IT Services',
        engagementModel: opts.engagementModel,
        status: (opts.status ?? 'ACTIVE') as 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'COMPLETED',
        deliveryManagerId: opts.deliveryManagerId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    const uploadEvent = await prisma.uploadEvent.create({
      data: {
        type: 'BILLING',
        status: 'SUCCESS',
        uploadedBy: opts.deliveryManagerId,
        periodMonth: opts.periodMonth ?? 2,
        periodYear: opts.periodYear ?? 2026,
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
        periodMonth: opts.periodMonth ?? 2,
        periodYear: opts.periodYear ?? 2026,
        valuePaise: BigInt(opts.marginBasisPoints),
        breakdownJson: {
          engagementModel: opts.engagementModel,
          revenue: opts.revenue,
          cost: opts.cost,
          profit: opts.profit,
          employees: [],
        },
        engineVersion: '1.0.0',
        calculatedAt: opts.calculatedAt ?? new Date(),
      },
    });

    return project;
  }

  // ── FINANCE sees all projects ──

  it('FINANCE sees all projects with snapshots', async () => {
    await seedProjectWithSnapshot({
      name: 'Project A',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 3000,
      revenue: 5000000,
      cost: 3500000,
      profit: 1500000,
    });

    await seedProjectWithSnapshot({
      name: 'Project B',
      deliveryManagerId: dm2User.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 1500,
      revenue: 8000000,
      cost: 6800000,
      profit: 1200000,
    });

    const result = await getProjectDashboard(financeUser, {});
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.projectName).sort()).toEqual(['Project A', 'Project B']);
  });

  // ── ADMIN sees all projects ──

  it('ADMIN sees all projects', async () => {
    await seedProjectWithSnapshot({
      name: 'Admin Project',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 2500,
      revenue: 4000000,
      cost: 3000000,
      profit: 1000000,
    });

    const result = await getProjectDashboard(adminUser, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('Admin Project');
  });

  // ── DM sees only own projects ──

  it('DELIVERY_MANAGER sees only own projects', async () => {
    await seedProjectWithSnapshot({
      name: 'DM1 Project',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 3000,
      revenue: 5000000,
      cost: 3500000,
      profit: 1500000,
    });

    await seedProjectWithSnapshot({
      name: 'DM2 Project',
      deliveryManagerId: dm2User.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 1500,
      revenue: 8000000,
      cost: 6800000,
      profit: 1200000,
    });

    const result = await getProjectDashboard(dmUser, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('DM1 Project');
  });

  // ── DEPT_HEAD sees department projects ──

  it('DEPT_HEAD sees projects from own department', async () => {
    // dmUser is in Delivery department, same as deptHeadUser
    await seedProjectWithSnapshot({
      name: 'Delivery Project',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 2000,
      revenue: 6000000,
      cost: 4800000,
      profit: 1200000,
    });

    // dm2User is in Engineering department
    await seedProjectWithSnapshot({
      name: 'Engineering Project',
      deliveryManagerId: dm2User.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 1000,
      revenue: 3000000,
      cost: 2700000,
      profit: 300000,
    });

    const result = await getProjectDashboard(deptHeadUser, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('Delivery Project');
  });

  // ── Empty when no snapshots ──

  it('returns empty array when no snapshots exist', async () => {
    const result = await getProjectDashboard(financeUser, {});
    expect(result).toEqual([]);
  });

  // ── Filter by department ──

  it('filters by department', async () => {
    await seedProjectWithSnapshot({
      name: 'Delivery Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 2500,
      revenue: 5000000,
      cost: 3750000,
      profit: 1250000,
    });

    await seedProjectWithSnapshot({
      name: 'Engineering Proj',
      deliveryManagerId: dm2User.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 1200,
      revenue: 4000000,
      cost: 3520000,
      profit: 480000,
    });

    const result = await getProjectDashboard(financeUser, { department: 'Delivery' });
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('Delivery Proj');
  });

  // ── Filter by vertical ──

  it('filters by vertical', async () => {
    await seedProjectWithSnapshot({
      name: 'FinTech Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      vertical: 'FinTech',
      marginBasisPoints: 2500,
      revenue: 5000000,
      cost: 3750000,
      profit: 1250000,
    });

    await seedProjectWithSnapshot({
      name: 'Healthcare Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      vertical: 'Healthcare',
      marginBasisPoints: 1200,
      revenue: 4000000,
      cost: 3520000,
      profit: 480000,
    });

    const result = await getProjectDashboard(financeUser, { vertical: 'FinTech' });
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('FinTech Proj');
  });

  // ── Filter by engagementModel ──

  it('filters by engagement model', async () => {
    await seedProjectWithSnapshot({
      name: 'TM Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 2500,
      revenue: 5000000,
      cost: 3750000,
      profit: 1250000,
    });

    await seedProjectWithSnapshot({
      name: 'FC Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 1200,
      revenue: 4000000,
      cost: 3520000,
      profit: 480000,
    });

    const result = await getProjectDashboard(financeUser, { engagementModel: 'FIXED_COST' });
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('FC Proj');
  });

  // ── Filter by status ──

  it('filters by status', async () => {
    await seedProjectWithSnapshot({
      name: 'Active Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'ACTIVE',
      marginBasisPoints: 2500,
      revenue: 5000000,
      cost: 3750000,
      profit: 1250000,
    });

    await seedProjectWithSnapshot({
      name: 'Completed Proj',
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      status: 'COMPLETED',
      marginBasisPoints: 1200,
      revenue: 4000000,
      cost: 3520000,
      profit: 480000,
    });

    const result = await getProjectDashboard(financeUser, { status: 'COMPLETED' });
    expect(result).toHaveLength(1);
    expect(result[0]!.projectName).toBe('Completed Proj');
  });

  // ── Default marginPercent DESC sort ──

  it('sorts by marginPercent descending by default', async () => {
    await seedProjectWithSnapshot({
      name: 'Low Margin',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 500,
      revenue: 2000000,
      cost: 1900000,
      profit: 100000,
    });

    await seedProjectWithSnapshot({
      name: 'High Margin',
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 3500,
      revenue: 10000000,
      cost: 6500000,
      profit: 3500000,
    });

    const result = await getProjectDashboard(financeUser, {});
    expect(result[0]!.projectName).toBe('High Margin');
    expect(result[1]!.projectName).toBe('Low Margin');
  });

  // ── Ascending sort ──

  it('sorts ascending when requested', async () => {
    await seedProjectWithSnapshot({
      name: 'Low Margin',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 500,
      revenue: 2000000,
      cost: 1900000,
      profit: 100000,
    });

    await seedProjectWithSnapshot({
      name: 'High Margin',
      deliveryManagerId: dmUser.id,
      engagementModel: 'FIXED_COST',
      marginBasisPoints: 3500,
      revenue: 10000000,
      cost: 6500000,
      profit: 3500000,
    });

    const result = await getProjectDashboard(financeUser, { sortOrder: 'asc' });
    expect(result[0]!.projectName).toBe('Low Margin');
    expect(result[1]!.projectName).toBe('High Margin');
  });

  // ── Dedup latest snapshot per project ──

  it('deduplicates keeping latest snapshot per project', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'Dedup Project',
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
      data: {
        type: 'BILLING',
        status: 'SUCCESS',
        uploadedBy: dmUser.id,
        periodMonth: 2,
        periodYear: 2026,
        rowCount: 10,
      },
    });

    const run1 = await prisma.recalculationRun.create({
      data: { uploadEventId: uploadEvent.id, projectsProcessed: 1, completedAt: new Date('2026-02-10') },
    });

    const run2 = await prisma.recalculationRun.create({
      data: { uploadEventId: uploadEvent.id, projectsProcessed: 1, completedAt: new Date('2026-02-15') },
    });

    // Older snapshot with lower margin
    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run1.id,
        entityType: 'PROJECT',
        entityId: project.id,
        figureType: 'MARGIN_PERCENT',
        periodMonth: 2,
        periodYear: 2026,
        valuePaise: BigInt(1000),
        breakdownJson: { engagementModel: 'TIME_AND_MATERIALS', revenue: 3000000, cost: 2700000, profit: 300000, employees: [] },
        engineVersion: '1.0.0',
        calculatedAt: new Date('2026-02-10'),
      },
    });

    // Newer snapshot with higher margin (should be used)
    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run2.id,
        entityType: 'PROJECT',
        entityId: project.id,
        figureType: 'MARGIN_PERCENT',
        periodMonth: 2,
        periodYear: 2026,
        valuePaise: BigInt(3000),
        breakdownJson: { engagementModel: 'TIME_AND_MATERIALS', revenue: 5000000, cost: 3500000, profit: 1500000, employees: [] },
        engineVersion: '1.0.0',
        calculatedAt: new Date('2026-02-15'),
      },
    });

    const result = await getProjectDashboard(financeUser, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.revenuePaise).toBe(5000000); // From newer snapshot
    expect(result[0]!.marginPercent).toBe(0.3);
  });

  // ── Revenue, cost, profit extraction ──

  it('extracts revenue, cost, profit from breakdownJson correctly', async () => {
    await seedProjectWithSnapshot({
      name: 'Values Test',
      deliveryManagerId: dmUser.id,
      engagementModel: 'TIME_AND_MATERIALS',
      marginBasisPoints: 2500,
      revenue: 10000000,
      cost: 7500000,
      profit: 2500000,
    });

    const result = await getProjectDashboard(financeUser, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.revenuePaise).toBe(10000000);
    expect(result[0]!.costPaise).toBe(7500000);
    expect(result[0]!.profitPaise).toBe(2500000);
    expect(result[0]!.marginPercent).toBe(0.25);
  });
});

// =========================================================================
// Shared seed helpers for entity-level snapshots
// =========================================================================

async function createRunForSnapshots(uploaderId: string, periodMonth = 2, periodYear = 2026) {
  const uploadEvent = await prisma.uploadEvent.create({
    data: {
      type: 'BILLING',
      status: 'SUCCESS',
      uploadedBy: uploaderId,
      periodMonth,
      periodYear,
      rowCount: 10,
    },
  });
  const run = await prisma.recalculationRun.create({
    data: { uploadEventId: uploadEvent.id, projectsProcessed: 1, completedAt: new Date() },
  });
  return run;
}

async function seedEntitySnapshots(
  runId: string,
  entityType: string,
  entityId: string,
  opts: { revenue: number; cost: number; marginBasisPoints: number; periodMonth?: number; periodYear?: number; breakdownJson?: object },
) {
  const pm = opts.periodMonth ?? 2;
  const py = opts.periodYear ?? 2026;
  const base = { recalculationRunId: runId, entityType, entityId, periodMonth: pm, periodYear: py, engineVersion: '1.0.0', calculatedAt: new Date() };

  await prisma.calculationSnapshot.createMany({
    data: [
      { ...base, figureType: 'MARGIN_PERCENT', valuePaise: BigInt(opts.marginBasisPoints), breakdownJson: {} },
      { ...base, figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(opts.revenue), breakdownJson: {} },
      { ...base, figureType: 'EMPLOYEE_COST', valuePaise: BigInt(opts.cost), breakdownJson: opts.breakdownJson ?? {} },
    ],
  });
}

// =========================================================================
// getExecutiveDashboard
// =========================================================================

describe('dashboard.service — getExecutiveDashboard', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let dmUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();
    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };
    const dm = await createTestUser('DELIVERY_MANAGER', { departmentId: depts.get('Delivery') });
    dmUser = { id: dm.id, role: dm.role, email: dm.email };
  });

  it('returns null when no snapshots exist', async () => {
    const result = await getExecutiveDashboard();
    expect(result).toBeNull();
  });

  it('returns company KPIs from COMPANY snapshots', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'COMPANY', 'COMPANY', {
      revenue: 20000000,
      cost: 14000000,
      marginBasisPoints: 3000,
    });

    // Need at least one PROJECT snapshot for top/bottom
    const project = await prisma.project.create({
      data: {
        name: 'Test Project', client: 'C', vertical: 'IT', engagementModel: 'TIME_AND_MATERIALS',
        status: 'ACTIVE', deliveryManagerId: dmUser.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      },
    });
    await prisma.calculationSnapshot.create({
      data: {
        recalculationRunId: run.id, entityType: 'PROJECT', entityId: project.id,
        figureType: 'MARGIN_PERCENT', periodMonth: 2, periodYear: 2026,
        valuePaise: BigInt(3000), breakdownJson: { revenue: 20000000, cost: 14000000, profit: 6000000, employees: [] },
        engineVersion: '1.0.0', calculatedAt: new Date(),
      },
    });

    const result = await getExecutiveDashboard();
    expect(result).not.toBeNull();
    expect(result!.revenuePaise).toBe(20000000);
    expect(result!.costPaise).toBe(14000000);
    expect(result!.marginPercent).toBe(0.3);
  });

  it('returns top-5 and bottom-5 projects sorted by margin', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'COMPANY', 'COMPANY', { revenue: 100000000, cost: 70000000, marginBasisPoints: 3000 });

    // Seed 7 projects with varying margins
    const margins = [5000, 4000, 3500, 2500, 1500, 500, -500];
    for (let i = 0; i < margins.length; i++) {
      const p = await prisma.project.create({
        data: {
          name: `Project ${i}`, client: 'C', vertical: 'IT', engagementModel: 'TIME_AND_MATERIALS',
          status: 'ACTIVE', deliveryManagerId: dmUser.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
        },
      });
      await prisma.calculationSnapshot.create({
        data: {
          recalculationRunId: run.id, entityType: 'PROJECT', entityId: p.id,
          figureType: 'MARGIN_PERCENT', periodMonth: 2, periodYear: 2026,
          valuePaise: BigInt(margins[i]!),
          breakdownJson: { revenue: 10000000, cost: 7000000, profit: 3000000, employees: [] },
          engineVersion: '1.0.0', calculatedAt: new Date(),
        },
      });
    }

    const result = await getExecutiveDashboard();
    expect(result!.top5Projects).toHaveLength(5);
    expect(result!.bottom5Projects).toHaveLength(5);

    // Top-5: highest margin first
    expect(result!.top5Projects[0]!.marginPercent).toBe(0.5);
    expect(result!.top5Projects[4]!.marginPercent).toBe(0.15);

    // Bottom-5: lowest margin first
    expect(result!.bottom5Projects[0]!.marginPercent).toBe(-0.05);
    expect(result!.bottom5Projects[4]!.marginPercent).toBe(0.35);
  });

  it('calculates billable utilisation from EMPLOYEE snapshots', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'COMPANY', 'COMPANY', { revenue: 10000000, cost: 7000000, marginBasisPoints: 3000 });

    // Seed EMPLOYEE snapshots with known hours
    await seedEntitySnapshots(run.id, 'EMPLOYEE', 'emp-1', {
      revenue: 5000000, cost: 3000000, marginBasisPoints: 0,
      breakdownJson: { totalHours: 160, billableHours: 120, availableHours: 176 },
    });
    await seedEntitySnapshots(run.id, 'EMPLOYEE', 'emp-2', {
      revenue: 5000000, cost: 4000000, marginBasisPoints: 0,
      breakdownJson: { totalHours: 160, billableHours: 80, availableHours: 176 },
    });

    const result = await getExecutiveDashboard();
    // Total billable = 120 + 80 = 200, Total available = 176 + 176 = 352
    expect(result!.billableUtilisationPercent).toBeCloseTo(200 / 352, 5);
  });
});

// =========================================================================
// getPracticeDashboard
// =========================================================================

describe('dashboard.service — getPracticeDashboard', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let dmUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();
    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };
    const dm = await createTestUser('DELIVERY_MANAGER', { departmentId: depts.get('Delivery') });
    dmUser = { id: dm.id, role: dm.role, email: dm.email };
  });

  it('returns empty array when no snapshots exist', async () => {
    const result = await getPracticeDashboard();
    expect(result).toEqual([]);
  });

  it('aggregates practice data by designation with employee counts', async () => {
    const run = await createRunForSnapshots(financeUser.id);

    // Seed PRACTICE snapshots for 3 designations
    await seedEntitySnapshots(run.id, 'PRACTICE', 'Senior Developer', { revenue: 8000000, cost: 5000000, marginBasisPoints: 3750 });
    await seedEntitySnapshots(run.id, 'PRACTICE', 'Junior Developer', { revenue: 4000000, cost: 3000000, marginBasisPoints: 2500 });
    await seedEntitySnapshots(run.id, 'PRACTICE', 'QA Engineer', { revenue: 3000000, cost: 2000000, marginBasisPoints: 3333 });

    // Seed employees for employee count
    await prisma.employee.createMany({
      data: [
        { employeeCode: 'E001', name: 'Alice', departmentId: depts.get('Delivery')!, designation: 'Senior Developer', annualCtcPaise: BigInt(120000000) },
        { employeeCode: 'E002', name: 'Bob', departmentId: depts.get('Delivery')!, designation: 'Senior Developer', annualCtcPaise: BigInt(110000000) },
        { employeeCode: 'E003', name: 'Charlie', departmentId: depts.get('Engineering')!, designation: 'Junior Developer', annualCtcPaise: BigInt(60000000) },
      ],
    });

    // Seed EMPLOYEE snapshots so the service can find them
    const emps = await prisma.employee.findMany();
    for (const emp of emps) {
      await seedEntitySnapshots(run.id, 'EMPLOYEE', emp.id, {
        revenue: 3000000, cost: 2000000, marginBasisPoints: 0,
        breakdownJson: { totalHours: 160, billableHours: 140, availableHours: 176 },
      });
    }

    const result = await getPracticeDashboard();
    expect(result).toHaveLength(3);

    // Sorted by cost descending
    expect(result[0]!.designation).toBe('Senior Developer');
    expect(result[0]!.costPaise).toBe(5000000);
    expect(result[0]!.employeeCount).toBe(2);

    expect(result[1]!.designation).toBe('Junior Developer');
    expect(result[1]!.costPaise).toBe(3000000);
    expect(result[1]!.employeeCount).toBe(1);

    expect(result[2]!.designation).toBe('QA Engineer');
    expect(result[2]!.costPaise).toBe(2000000);
    expect(result[2]!.employeeCount).toBe(0); // No QA employees seeded
  });

  it('computes profit and margin correctly', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'PRACTICE', 'Architect', { revenue: 10000000, cost: 6000000, marginBasisPoints: 4000 });

    const result = await getPracticeDashboard();
    expect(result).toHaveLength(1);
    expect(result[0]!.profitPaise).toBe(4000000);
    expect(result[0]!.marginPercent).toBe(0.4);
  });
});

// =========================================================================
// getDepartmentDashboard
// =========================================================================

describe('dashboard.service — getDepartmentDashboard', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let deptHeadUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();
    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };
    const deptHead = await createTestUser('DEPT_HEAD', { departmentId: depts.get('Delivery') });
    deptHeadUser = { id: deptHead.id, role: deptHead.role, email: deptHead.email };
  });

  it('returns empty array when no snapshots exist', async () => {
    const result = await getDepartmentDashboard(financeUser);
    expect(result).toEqual([]);
  });

  it('FINANCE sees all departments', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Delivery')!, { revenue: 8000000, cost: 5000000, marginBasisPoints: 3750 });
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Engineering')!, { revenue: 6000000, cost: 4000000, marginBasisPoints: 3333 });

    const result = await getDepartmentDashboard(financeUser);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.departmentName).sort()).toEqual(['Delivery', 'Engineering']);
  });

  it('DEPT_HEAD sees only own department', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Delivery')!, { revenue: 8000000, cost: 5000000, marginBasisPoints: 3750 });
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Engineering')!, { revenue: 6000000, cost: 4000000, marginBasisPoints: 3333 });

    const result = await getDepartmentDashboard(deptHeadUser);
    expect(result).toHaveLength(1);
    expect(result[0]!.departmentName).toBe('Delivery');
    expect(result[0]!.revenuePaise).toBe(8000000);
  });

  it('computes profit correctly from revenue - cost', async () => {
    const run = await createRunForSnapshots(financeUser.id);
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Delivery')!, { revenue: 10000000, cost: 7000000, marginBasisPoints: 3000 });

    const result = await getDepartmentDashboard(financeUser);
    expect(result[0]!.profitPaise).toBe(3000000);
    expect(result[0]!.marginPercent).toBe(0.3);
  });
});

// =========================================================================
// getCompanyDashboard
// =========================================================================

describe('dashboard.service — getCompanyDashboard', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    depts = await seedTestDepartments();
    const finance = await createTestUser('FINANCE', { departmentId: depts.get('Finance') });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };
  });

  it('returns null when no snapshots exist', async () => {
    const result = await getCompanyDashboard();
    expect(result).toBeNull();
  });

  it('returns company rollup with department breakdown', async () => {
    const run = await createRunForSnapshots(financeUser.id);

    // Company totals
    await seedEntitySnapshots(run.id, 'COMPANY', 'COMPANY', { revenue: 20000000, cost: 14000000, marginBasisPoints: 3000 });

    // Department breakdown
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Delivery')!, { revenue: 12000000, cost: 8000000, marginBasisPoints: 3333 });
    await seedEntitySnapshots(run.id, 'DEPARTMENT', depts.get('Engineering')!, { revenue: 8000000, cost: 6000000, marginBasisPoints: 2500 });

    const result = await getCompanyDashboard();
    expect(result).not.toBeNull();
    expect(result!.revenuePaise).toBe(20000000);
    expect(result!.costPaise).toBe(14000000);
    expect(result!.profitPaise).toBe(6000000);
    expect(result!.marginPercent).toBe(0.3);
    expect(result!.departments).toHaveLength(2);

    // Sorted by revenue descending
    expect(result!.departments[0]!.departmentName).toBe('Delivery');
    expect(result!.departments[1]!.departmentName).toBe('Engineering');
  });
});

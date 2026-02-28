import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { getProjectDashboard } from './dashboard.service.js';

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

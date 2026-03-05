import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test1234!';
const TEMP_PASSWORD = 'Temp1234!';

async function main() {
  console.log('Seeding E2E test database...');

  // Clean all existing data (order matters for foreign keys)
  await prisma.calculationSnapshot.deleteMany();
  await prisma.recalculationRun.deleteMany();
  await prisma.billingRecord.deleteMany();
  await prisma.timesheetEntry.deleteMany();
  await prisma.uploadEvent.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.employeeProject.deleteMany();
  await prisma.projectRole.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemConfig.deleteMany();

  // Create departments
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const finance = await prisma.department.create({ data: { name: 'Finance' } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } });
  const delivery = await prisma.department.create({ data: { name: 'Delivery' } });
  await prisma.department.create({ data: { name: 'Operations' } });

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const tempPasswordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);

  // Create test users — one per role with known credentials
  await prisma.user.create({
    data: {
      email: 'admin@e2e.test',
      passwordHash,
      name: 'E2E Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'hr@e2e.test',
      passwordHash,
      name: 'E2E HR Manager',
      role: 'HR',
      departmentId: hr.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'finance@e2e.test',
      passwordHash,
      name: 'E2E Finance User',
      role: 'FINANCE',
      departmentId: finance.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const dmUser = await prisma.user.create({
    data: {
      email: 'dm@e2e.test',
      passwordHash,
      name: 'E2E Delivery Manager',
      role: 'DELIVERY_MANAGER',
      departmentId: delivery.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const dm2User = await prisma.user.create({
    data: {
      email: 'dm2@e2e.test',
      passwordHash,
      name: 'E2E Delivery Manager 2',
      role: 'DELIVERY_MANAGER',
      departmentId: engineering.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'depthead@e2e.test',
      passwordHash,
      name: 'E2E Dept Head',
      role: 'DEPT_HEAD',
      departmentId: engineering.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // User with mustChangePassword (for first-login forced change test)
  await prisma.user.create({
    data: {
      email: 'newuser@e2e.test',
      passwordHash: tempPasswordHash,
      name: 'E2E New User',
      role: 'HR',
      departmentId: hr.id,
      isActive: true,
      mustChangePassword: true,
    },
  });

  // Seed employees for employee management tests
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP001',
      name: 'Seeded Employee One',
      departmentId: engineering.id,
      designation: 'Senior Developer',
      annualCtcPaise: BigInt(120000000),
      isBillable: true,
    },
  });

  await prisma.employee.create({
    data: {
      employeeCode: 'EMP002',
      name: 'Seeded Employee Two',
      departmentId: finance.id,
      designation: 'Financial Analyst',
      annualCtcPaise: BigInt(100000000),
      isBillable: true,
    },
  });

  await prisma.employee.create({
    data: {
      employeeCode: 'EMP003',
      name: 'Seeded Employee Three',
      departmentId: hr.id,
      designation: 'HR Coordinator',
      annualCtcPaise: BigInt(80000000),
      isBillable: false,
    },
  });

  // Additional employees for cross-role chain tests (Story 4.0b)
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP004',
      name: 'Seeded Employee Four',
      departmentId: engineering.id,
      designation: 'QA Engineer',
      annualCtcPaise: BigInt(90000000),
      isBillable: true,
    },
  });

  await prisma.employee.create({
    data: {
      employeeCode: 'EMP005',
      name: 'Seeded Employee Five',
      departmentId: delivery.id,
      designation: 'Project Manager',
      annualCtcPaise: BigInt(110000000),
      isBillable: true,
    },
  });

  // Resigned employee for Chain 5 (Resigned Employee Guard)
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP006',
      name: 'Seeded Resigned Employee',
      departmentId: engineering.id,
      designation: 'Junior Developer',
      annualCtcPaise: BigInt(60000000),
      isBillable: true,
      isResigned: true,
    },
  });

  // Dedicated user for password reset testing (so reset tests don't break other tests)
  await prisma.user.create({
    data: {
      email: 'resetuser@e2e.test',
      passwordHash,
      name: 'E2E Reset User',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Seed SystemConfig for system config tests — id must match the 'default' singleton
  // assumed by config.service.ts upsert({ where: { id: 'default' } })
  await prisma.systemConfig.create({
    data: {
      id: 'default',
      standardMonthlyHours: 176,
      healthyMarginThreshold: 0.2,
      atRiskMarginThreshold: 0.05,
    },
  });

  // Seed project roles for team assignment
  const developerRole = await prisma.projectRole.create({ data: { name: 'Developer' } });
  await prisma.projectRole.create({ data: { name: 'Tech Lead' } });
  await prisma.projectRole.create({ data: { name: 'QA Engineer' } });
  await prisma.projectRole.create({ data: { name: 'Architect' } });
  await prisma.projectRole.create({ data: { name: 'Scrum Master' } });
  const inactiveRole = await prisma.projectRole.create({ data: { name: 'Deprecated Role', isActive: false } });

  // Seed projects for project management tests
  await prisma.project.create({
    data: {
      name: 'Seeded Pending Project',
      client: 'Acme Corp',
      vertical: 'IT Services',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'PENDING_APPROVAL',
      deliveryManagerId: dmUser.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Seeded Rejected Project',
      client: 'Beta Inc',
      vertical: 'Healthcare',
      engagementModel: 'FIXED_COST',
      status: 'REJECTED',
      contractValuePaise: BigInt(50000000),
      deliveryManagerId: dmUser.id,
      rejectionComment: 'Budget exceeds approval threshold. Please revise contract value.',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
    },
  });

  // ACTIVE T&M project for project list/detail tests (Story 3.4)
  const activeTmProject = await prisma.project.create({
    data: {
      name: 'Seeded Active TM Project',
      client: 'Gamma Solutions',
      vertical: 'FinTech',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'ACTIVE',
      deliveryManagerId: dmUser.id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-11-30'),
    },
  });

  // ACTIVE Fixed Cost project for % completion tests (Story 3.4)
  const activeFcProject = await prisma.project.create({
    data: {
      name: 'Seeded Active FC Project',
      client: 'Delta Corp',
      vertical: 'Healthcare',
      engagementModel: 'FIXED_COST',
      status: 'ACTIVE',
      contractValuePaise: BigInt(80000000),
      completionPercent: 0.35,
      deliveryManagerId: dmUser.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-09-30'),
    },
  });

  // Additional PENDING_APPROVAL projects for approval/rejection E2E tests (Story 3.5)
  await prisma.project.create({
    data: {
      name: 'Seeded Pending Approve Target',
      client: 'Epsilon Ltd',
      vertical: 'Manufacturing',
      engagementModel: 'FIXED_COST',
      status: 'PENDING_APPROVAL',
      contractValuePaise: BigInt(30000000),
      deliveryManagerId: dmUser.id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2027-04-30'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Seeded Pending Reject Target',
      client: 'Zeta Corp',
      vertical: 'Consulting',
      engagementModel: 'AMC',
      status: 'PENDING_APPROVAL',
      contractValuePaise: BigInt(20000000),
      deliveryManagerId: dmUser.id,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
    },
  });

  // Assign a team member to the active T&M project (for team roster test)
  const emp1 = await prisma.employee.findFirst({ where: { employeeCode: 'EMP001' } });
  if (emp1) {
    await prisma.employeeProject.create({
      data: {
        projectId: activeTmProject.id,
        employeeId: emp1.id,
        roleId: developerRole.id,
        billingRatePaise: BigInt(500000),
      },
    });
  }

  // Seed upload history for Upload Center tests (Story 5.3)
  const hrSeedUser = await prisma.user.findFirst({ where: { email: 'hr@e2e.test' } });
  const financeSeedUser = await prisma.user.findFirst({ where: { email: 'finance@e2e.test' } });

  if (hrSeedUser) {
    await prisma.uploadEvent.create({
      data: {
        type: 'SALARY',
        status: 'SUCCESS',
        uploadedBy: hrSeedUser.id,
        periodMonth: 2,
        periodYear: 2026,
        rowCount: 10,
      },
    });

    await prisma.uploadEvent.create({
      data: {
        type: 'SALARY',
        status: 'PARTIAL',
        uploadedBy: hrSeedUser.id,
        periodMonth: 1,
        periodYear: 2026,
        rowCount: 8,
        errorSummary: [{ row: 3, employeeCode: 'EMP999', error: 'Department not found' }],
      },
    });
  }

  if (financeSeedUser) {
    await prisma.uploadEvent.create({
      data: {
        type: 'TIMESHEET',
        status: 'SUCCESS',
        uploadedBy: financeSeedUser.id,
        periodMonth: 2,
        periodYear: 2026,
        rowCount: 50,
      },
    });
  }

  // DM2 project for dashboard scoping tests (Story 6.1)
  const dm2Project = await prisma.project.create({
    data: {
      name: 'Seeded DM2 Project',
      client: 'Omega Corp',
      vertical: 'IT Services',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'ACTIVE',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  // Seed calculation snapshots for Project Dashboard tests (Story 6.1)
  const dashUploadEvent = await prisma.uploadEvent.create({
    data: {
      type: 'BILLING',
      status: 'SUCCESS',
      uploadedBy: financeSeedUser!.id,
      periodMonth: 2,
      periodYear: 2026,
      rowCount: 100,
    },
  });

  const dashRun = await prisma.recalculationRun.create({
    data: {
      uploadEventId: dashUploadEvent.id,
      projectsProcessed: 3,
      completedAt: new Date(),
    },
  });

  // activeTmProject: margin 30% (healthy), revenue 5M, cost 3.5M, profit 1.5M
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: activeTmProject.id,
      figureType: 'MARGIN_PERCENT',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(3000),
      breakdownJson: {
        engagementModel: 'TIME_AND_MATERIALS',
        revenue: 5000000,
        cost: 3500000,
        profit: 1500000,
        employees: [
          { employeeId: 'emp-seed-1', name: 'Seeded Employee One', designation: 'Senior Developer', hours: 160, costPerHourPaise: 53125, contributionPaise: 2000000 },
          { employeeId: 'emp-seed-2', name: 'Seeded Employee Two', designation: 'Financial Analyst', hours: 120, costPerHourPaise: 41667, contributionPaise: 1500000 },
        ],
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  // activeTmProject: REVENUE_CONTRIBUTION and EMPLOYEE_COST (Story 8.5 — project detail financials)
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: activeTmProject.id,
      figureType: 'REVENUE_CONTRIBUTION',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(5000000),
      breakdownJson: {},
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: activeTmProject.id,
      figureType: 'EMPLOYEE_COST',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(3500000),
      breakdownJson: {},
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  // activeFcProject: margin 15% (at-risk), revenue 8M, cost 6.8M, profit 1.2M
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: activeFcProject.id,
      figureType: 'MARGIN_PERCENT',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(1500),
      breakdownJson: {
        engagementModel: 'FIXED_COST',
        revenue: 8000000,
        cost: 6800000,
        profit: 1200000,
        employees: [],
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  // dm2Project: margin -5% (loss), revenue 2M, cost 2.1M, profit -100K
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: dm2Project.id,
      figureType: 'MARGIN_PERCENT',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(-500),
      breakdownJson: {
        engagementModel: 'TIME_AND_MATERIALS',
        revenue: 2000000,
        cost: 2100000,
        profit: -100000,
        employees: [
          { employeeId: 'emp-seed-4', name: 'Seeded Employee Four', designation: 'QA Engineer', hours: 100, costPerHourPaise: 37500, contributionPaise: 1200000 },
          { employeeId: 'emp-seed-5', name: 'Seeded Employee Five', designation: 'Project Manager', hours: 80, costPerHourPaise: 45833, contributionPaise: 900000 },
        ],
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  // ── Story 6.4: Infra SIMPLE and DETAILED projects for Ledger Drawer tests ──

  const infraSimpleProject = await prisma.project.create({
    data: {
      name: 'Seeded Infra Simple Project',
      client: 'CloudBasic Corp',
      vertical: 'Cloud Services',
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'SIMPLE',
      vendorCostPaise: BigInt(5000000),
      manpowerCostPaise: BigInt(3000000),
      status: 'ACTIVE',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  // Infra SIMPLE: margin 20%, revenue 10M, cost 8M, profit 2M
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: infraSimpleProject.id,
      figureType: 'MARGIN_PERCENT',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(2000),
      breakdownJson: {
        engagementModel: 'INFRASTRUCTURE',
        infraCostMode: 'SIMPLE',
        revenue: 10000000,
        cost: 8000000,
        profit: 2000000,
        vendorCostPaise: 5000000,
        manpowerCostPaise: 3000000,
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  const infraDetailedProject = await prisma.project.create({
    data: {
      name: 'Seeded Infra Detailed Project',
      client: 'CloudPro Corp',
      vertical: 'Cloud Services',
      engagementModel: 'INFRASTRUCTURE',
      infraCostMode: 'DETAILED',
      vendorCostPaise: BigInt(4000000),
      status: 'ACTIVE',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  // Infra DETAILED: margin 10%, revenue 10M, cost 9M, profit 1M
  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id,
      entityType: 'PROJECT',
      entityId: infraDetailedProject.id,
      figureType: 'MARGIN_PERCENT',
      periodMonth: 2,
      periodYear: 2026,
      valuePaise: BigInt(1000),
      breakdownJson: {
        engagementModel: 'INFRASTRUCTURE',
        infraCostMode: 'DETAILED',
        revenue: 10000000,
        cost: 9000000,
        profit: 1000000,
        vendorCostPaise: 4000000,
        employees: [
          { employeeId: 'emp-infra-1', name: 'Infra Ops Lead', designation: 'DevOps Lead', hours: 120, costPerHourPaise: 62500, contributionPaise: 5000000 },
        ],
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

  // ── Duplicate PROJECT snapshots for current month (so ledger-drawer tests survive after bulk-upload creates a new upload event) ──
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-based
  const currentYear = now.getFullYear();
  if (currentMonth !== 2 || currentYear !== 2026) {
    // Only duplicate if current month differs from seeded Feb 2026
    const feb2026Snapshots = await prisma.calculationSnapshot.findMany({
      where: { entityType: 'PROJECT', periodMonth: 2, periodYear: 2026 },
    });
    for (const snap of feb2026Snapshots) {
      await prisma.calculationSnapshot.create({
        data: {
          recalculationRunId: snap.recalculationRunId,
          entityType: snap.entityType,
          entityId: snap.entityId,
          figureType: snap.figureType,
          periodMonth: currentMonth,
          periodYear: currentYear,
          valuePaise: snap.valuePaise,
          breakdownJson: snap.breakdownJson ?? undefined,
          engineVersion: snap.engineVersion,
          calculatedAt: snap.calculatedAt,
        },
      });
    }
  }

  // ── Story 6.2: Executive/Practice/Department/Company dashboard snapshots ──

  // Helper to seed entity-level snapshots (3 rows per entity: MARGIN_PERCENT, EMPLOYEE_COST, REVENUE_CONTRIBUTION)
  async function seedEntitySnaps(entityType: string, entityId: string, revenue: number, cost: number, marginBp: number, breakdown: object = {}) {
    const base = { recalculationRunId: dashRun.id, entityType, entityId, periodMonth: 2, periodYear: 2026, engineVersion: '1.0.0', calculatedAt: new Date() };
    await prisma.calculationSnapshot.createMany({
      data: [
        { ...base, figureType: 'MARGIN_PERCENT', valuePaise: BigInt(marginBp), breakdownJson: {} },
        { ...base, figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(revenue), breakdownJson: {} },
        { ...base, figureType: 'EMPLOYEE_COST', valuePaise: BigInt(cost), breakdownJson: breakdown },
      ],
    });
  }

  // COMPANY snapshot — total: revenue 15M, cost 12.4M, margin 17.3%
  await seedEntitySnaps('COMPANY', 'COMPANY', 15000000, 12400000, 1733);

  // DEPARTMENT snapshots — Delivery and Engineering
  await seedEntitySnaps('DEPARTMENT', delivery.id, 13000000, 10300000, 2077);
  await seedEntitySnaps('DEPARTMENT', engineering.id, 2000000, 2100000, -500);

  // PRACTICE snapshots — Senior Developer and QA Engineer designations
  await seedEntitySnaps('PRACTICE', 'Senior Developer', 8000000, 5000000, 3750);
  await seedEntitySnaps('PRACTICE', 'QA Engineer', 4000000, 3000000, 2500);
  await seedEntitySnaps('PRACTICE', 'Financial Analyst', 3000000, 4400000, -4667);

  // ── Story 6.5: Varied EMPLOYEE snapshots for Employee Dashboard tests ──
  // Different revenue/cost/hours per employee to test under-utilisation, loss-row, and ranking
  const allActiveEmps = await prisma.employee.findMany({
    where: { isResigned: false },
    orderBy: { employeeCode: 'asc' },
  });
  const empByCode: Record<string, string> = {};
  for (const e of allActiveEmps) empByCode[e.employeeCode] = e.id;

  // EMP001 (Engineering, Senior Developer): Highest revenue, high utilisation → rank 1
  await seedEntitySnaps('EMPLOYEE', empByCode['EMP001'], 5000000, 3000000, 0, {
    totalHours: 160, billableHours: 140, availableHours: 176,
  });

  // EMP002 (Finance, Financial Analyst): Medium revenue → rank 2
  await seedEntitySnaps('EMPLOYEE', empByCode['EMP002'], 3000000, 2000000, 0, {
    totalHours: 160, billableHours: 120, availableHours: 176,
  });

  // EMP003 (HR, HR Coordinator): Low revenue, LOSS (cost>revenue), UNDER-UTILISED (<50%) → rank 5
  await seedEntitySnaps('EMPLOYEE', empByCode['EMP003'], 500000, 2000000, 0, {
    totalHours: 160, billableHours: 40, availableHours: 176,
  });

  // EMP004 (Engineering, QA Engineer): Medium revenue → rank 3
  await seedEntitySnaps('EMPLOYEE', empByCode['EMP004'], 2000000, 1500000, 0, {
    totalHours: 160, billableHours: 100, availableHours: 176,
  });

  // EMP005 (Delivery, Project Manager): Lower revenue, LOSS, UNDER-UTILISED → rank 4
  await seedEntitySnaps('EMPLOYEE', empByCode['EMP005'], 1500000, 1800000, 0, {
    totalHours: 160, billableHours: 60, availableHours: 176,
  });

  console.log('E2E seed complete');
}

main()
  .catch((e) => {
    console.error('E2E seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

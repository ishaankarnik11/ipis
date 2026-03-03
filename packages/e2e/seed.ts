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
        role: 'Developer',
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
        employees: [],
      },
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
        employees: [],
      },
      engineVersion: '1.0.0',
      calculatedAt: new Date(),
    },
  });

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

  // EMPLOYEE snapshots (with breakdownJson containing hours for utilisation calc)
  const seededEmployees = await prisma.employee.findMany({ where: { isResigned: false } });
  for (const emp of seededEmployees) {
    await seedEntitySnaps('EMPLOYEE', emp.id, 3000000, 2000000, 0, {
      totalHours: 160,
      billableHours: 120,
      availableHours: 176,
    });
  }

  console.log('E2E seed complete');
}

main()
  .catch((e) => {
    console.error('E2E seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

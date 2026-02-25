import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test1234!';
const TEMP_PASSWORD = 'Temp1234!';

async function main() {
  console.log('Seeding E2E test database...');

  // Clean all existing data (order matters for foreign keys)
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
  await prisma.project.create({
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

  console.log('E2E seed complete');
}

main()
  .catch((e) => {
    console.error('E2E seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

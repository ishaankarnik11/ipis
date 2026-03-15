import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  await prisma.designation.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.invitationToken.deleteMany();
  await prisma.sharedReportToken.deleteMany();
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

  // Create test users — OTP-based auth, no passwords
  await prisma.user.create({
    data: { email: 'admin@e2e.test', name: 'E2E Admin', role: 'ADMIN', status: 'ACTIVE' },
  });

  await prisma.user.create({
    data: { email: 'hr@e2e.test', name: 'E2E HR Manager', role: 'HR', departmentId: hr.id, status: 'ACTIVE' },
  });

  await prisma.user.create({
    data: { email: 'finance@e2e.test', name: 'E2E Finance User', role: 'FINANCE', departmentId: finance.id, status: 'ACTIVE' },
  });

  const dmUser = await prisma.user.create({
    data: { email: 'dm@e2e.test', name: 'E2E Delivery Manager', role: 'DELIVERY_MANAGER', departmentId: delivery.id, status: 'ACTIVE' },
  });

  const dm2User = await prisma.user.create({
    data: { email: 'dm2@e2e.test', name: 'E2E Delivery Manager 2', role: 'DELIVERY_MANAGER', departmentId: engineering.id, status: 'ACTIVE' },
  });

  await prisma.user.create({
    data: { email: 'depthead@e2e.test', name: 'E2E Dept Head', role: 'DEPT_HEAD', departmentId: engineering.id, status: 'ACTIVE' },
  });

  // Seed employees
  const emp1 = await prisma.employee.create({
    data: { employeeCode: 'EMP001', name: 'Seeded Employee One', departmentId: engineering.id, designation: 'Senior Developer', annualCtcPaise: BigInt(120000000), isBillable: true },
  });

  await prisma.employee.create({
    data: { employeeCode: 'EMP002', name: 'Seeded Employee Two', departmentId: finance.id, designation: 'Financial Analyst', annualCtcPaise: BigInt(100000000), isBillable: true },
  });

  await prisma.employee.create({
    data: { employeeCode: 'EMP003', name: 'Seeded Employee Three', departmentId: hr.id, designation: 'HR Coordinator', annualCtcPaise: BigInt(80000000), isBillable: false },
  });

  await prisma.employee.create({
    data: { employeeCode: 'EMP004', name: 'Seeded Employee Four', departmentId: engineering.id, designation: 'QA Engineer', annualCtcPaise: BigInt(90000000), isBillable: true },
  });

  await prisma.employee.create({
    data: { employeeCode: 'EMP005', name: 'Seeded Employee Five', departmentId: delivery.id, designation: 'Project Manager', annualCtcPaise: BigInt(110000000), isBillable: true },
  });

  await prisma.employee.create({
    data: { employeeCode: 'EMP006', name: 'Seeded Resigned Employee', departmentId: engineering.id, designation: 'Junior Developer', annualCtcPaise: BigInt(60000000), isBillable: true, isResigned: true },
  });

  // System Config
  await prisma.systemConfig.create({
    data: { id: 'default', standardMonthlyHours: 176, healthyMarginThreshold: 0.2, atRiskMarginThreshold: 0.05 },
  });

  // Designations
  const developerRole = await prisma.designation.create({ data: { name: 'Developer' } });
  await prisma.designation.create({ data: { name: 'Tech Lead' } });
  await prisma.designation.create({ data: { name: 'QA Engineer' } });
  await prisma.designation.create({ data: { name: 'Architect' } });
  await prisma.designation.create({ data: { name: 'Scrum Master' } });
  await prisma.designation.create({ data: { name: 'Deprecated Role', isActive: false } });

  // Projects
  await prisma.project.create({
    data: { name: 'Seeded Pending Project', client: 'Acme Corp', vertical: 'IT Services', engagementModel: 'TIME_AND_MATERIALS', status: 'PENDING_APPROVAL', deliveryManagerId: dmUser.id, startDate: new Date('2026-03-01'), endDate: new Date('2026-12-31') },
  });

  await prisma.project.create({
    data: { name: 'Seeded Rejected Project', client: 'Beta Inc', vertical: 'Healthcare', engagementModel: 'FIXED_COST', status: 'REJECTED', contractValuePaise: BigInt(50000000), deliveryManagerId: dmUser.id, rejectionComment: 'Budget exceeds approval threshold.', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31') },
  });

  const activeTmProject = await prisma.project.create({
    data: { name: 'Seeded Active TM Project', client: 'Gamma Solutions', vertical: 'FinTech', engagementModel: 'TIME_AND_MATERIALS', status: 'ACTIVE', deliveryManagerId: dmUser.id, startDate: new Date('2026-02-01'), endDate: new Date('2026-11-30') },
  });

  await prisma.project.create({
    data: { name: 'Seeded Active FC Project', client: 'Delta Corp', vertical: 'Healthcare', engagementModel: 'FIXED_COST', status: 'ACTIVE', contractValuePaise: BigInt(80000000), completionPercent: 0.35, deliveryManagerId: dmUser.id, startDate: new Date('2026-01-15'), endDate: new Date('2026-09-30') },
  });

  await prisma.project.create({
    data: { name: 'Seeded Pending Approve Target', client: 'Epsilon Ltd', vertical: 'Manufacturing', engagementModel: 'FIXED_COST', status: 'PENDING_APPROVAL', contractValuePaise: BigInt(30000000), deliveryManagerId: dmUser.id, startDate: new Date('2026-05-01'), endDate: new Date('2027-04-30') },
  });

  await prisma.project.create({
    data: { name: 'Seeded Pending Reject Target', client: 'Zeta Corp', vertical: 'Consulting', engagementModel: 'AMC', status: 'PENDING_APPROVAL', contractValuePaise: BigInt(20000000), deliveryManagerId: dmUser.id, startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31') },
  });

  // Team member assignment
  await prisma.employeeProject.create({
    data: { projectId: activeTmProject.id, employeeId: emp1.id, designationId: developerRole.id, billingRatePaise: BigInt(500000) },
  });

  // DM2 project
  await prisma.project.create({
    data: { name: 'Seeded DM2 Project', client: 'Omega Corp', vertical: 'IT Services', engagementModel: 'TIME_AND_MATERIALS', status: 'ACTIVE', deliveryManagerId: dm2User.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });

  // Calculation snapshots for dashboard tests
  const dashRun = await prisma.recalculationRun.create({
    data: { uploadEventId: 'seed-placeholder', projectsProcessed: 2, completedAt: new Date() },
  });

  await prisma.calculationSnapshot.create({
    data: {
      recalculationRunId: dashRun.id, entityType: 'PROJECT', entityId: activeTmProject.id,
      figureType: 'MARGIN_PERCENT', periodMonth: 2, periodYear: 2026, valuePaise: BigInt(3000),
      breakdownJson: { engagementModel: 'TIME_AND_MATERIALS', revenue: 5000000, cost: 3500000, profit: 1500000, employees: [] },
      engineVersion: '1.0.0', calculatedAt: new Date(),
    },
  });

  console.log('E2E seed complete. Users created with OTP-based auth (use MASTER_OTP=000000 for login).');
}

main()
  .catch((e) => { console.error('E2E seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

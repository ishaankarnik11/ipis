import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dev database...');

  // ── Clean existing data (order matters for foreign keys) ──
  await prisma.sharedReportToken.deleteMany();
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
  await prisma.employee.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemConfig.deleteMany();

  // ── 1. Departments ──
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const finance = await prisma.department.create({ data: { name: 'Finance' } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } });
  const delivery = await prisma.department.create({ data: { name: 'Delivery' } });
  await prisma.department.create({ data: { name: 'Operations' } });
  console.log('  ✓ 5 departments');

  // ── 2. System Config ──
  await prisma.systemConfig.create({
    data: {
      id: 'default',
      standardMonthlyHours: 160,
      healthyMarginThreshold: 0.2,
      atRiskMarginThreshold: 0.05,
      annualOverheadPerEmployee: BigInt(18000000),
    },
  });
  console.log('  ✓ System config');

  // ── 3. Designations ──
  await prisma.designation.create({ data: { name: 'Senior Developer', departmentId: engineering.id } });
  await prisma.designation.create({ data: { name: 'Developer', departmentId: engineering.id } });
  await prisma.designation.create({ data: { name: 'Tech Lead', departmentId: engineering.id } });
  await prisma.designation.create({ data: { name: 'QA Engineer', departmentId: engineering.id } });
  await prisma.designation.create({ data: { name: 'Architect', departmentId: engineering.id } });
  await prisma.designation.create({ data: { name: 'Project Manager', departmentId: delivery.id } });
  await prisma.designation.create({ data: { name: 'Scrum Master', departmentId: delivery.id } });
  await prisma.designation.create({ data: { name: 'Financial Analyst', departmentId: finance.id } });
  await prisma.designation.create({ data: { name: 'HR Coordinator', departmentId: hr.id } });
  console.log('  ✓ 9 designations');

  // ── 4. Employees ──
  const employees = [];
  const empData = [
    { code: 'EMP001', name: 'Arun Kumar', dept: engineering.id, designation: 'Senior Developer', ctc: 1500000, billable: true },
    { code: 'EMP002', name: 'Deepa Sharma', dept: engineering.id, designation: 'Developer', ctc: 1000000, billable: true },
    { code: 'EMP003', name: 'Ravi Patel', dept: engineering.id, designation: 'Tech Lead', ctc: 1800000, billable: true },
    { code: 'EMP004', name: 'Sneha Gupta', dept: engineering.id, designation: 'QA Engineer', ctc: 900000, billable: true },
    { code: 'EMP005', name: 'Vikram Singh', dept: delivery.id, designation: 'Project Manager', ctc: 1600000, billable: true },
    { code: 'EMP006', name: 'Priya Joshi', dept: finance.id, designation: 'Financial Analyst', ctc: 1200000, billable: false },
    { code: 'EMP007', name: 'Neha Verma', dept: hr.id, designation: 'HR Coordinator', ctc: 800000, billable: false },
    { code: 'EMP008', name: 'Rahul Mehta', dept: engineering.id, designation: 'Developer', ctc: 1100000, billable: true },
    { code: 'EMP009', name: 'Anita Desai', dept: engineering.id, designation: 'Architect', ctc: 2000000, billable: true },
    { code: 'EMP010', name: 'Karan Reddy', dept: delivery.id, designation: 'Scrum Master', ctc: 1300000, billable: true },
  ];

  for (const e of empData) {
    const emp = await prisma.employee.create({
      data: {
        employeeCode: e.code,
        name: e.name,
        departmentId: e.dept,
        designation: e.designation,
        annualCtcPaise: BigInt(e.ctc * 100),
        isBillable: e.billable,
      },
    });
    employees.push(emp);
  }
  console.log(`  ✓ ${employees.length} employees`);

  // ── 5. Projects (no deliveryManagerId — admin assigns DMs after creating users) ──
  const projects = [
    { name: 'Alpha Platform', client: 'TechCorp', vertical: 'IT Services', model: 'TIME_AND_MATERIALS' as const, status: 'ACTIVE' as const },
    { name: 'Beta Analytics', client: 'DataDrive', vertical: 'FinTech', model: 'FIXED_COST' as const, status: 'ACTIVE' as const, contractValue: 80000000 },
    { name: 'Gamma Portal', client: 'HealthFirst', vertical: 'Healthcare', model: 'AMC' as const, status: 'ACTIVE' as const, contractValue: 50000000 },
    { name: 'Delta Infra', client: 'CloudScale', vertical: 'IT Services', model: 'INFRASTRUCTURE' as const, status: 'ACTIVE' as const },
    { name: 'Epsilon Migration', client: 'LegacyCorp', vertical: 'Manufacturing', model: 'FIXED_COST' as const, status: 'COMPLETED' as const, contractValue: 30000000 },
  ];

  for (const p of projects) {
    await prisma.project.create({
      data: {
        name: p.name,
        client: p.client,
        vertical: p.vertical,
        engagementModel: p.model,
        status: p.status,
        contractValuePaise: p.contractValue ? BigInt(p.contractValue) : null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });
  }
  console.log(`  ✓ ${projects.length} projects`);

  // ── Done ──
  console.log('\nSeed complete.');
  console.log('No users created. Start the app with ADMIN_EMAIL set to bootstrap the admin account.');
  console.log('Example: ADMIN_EMAIL=admin@company.com pnpm dev');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

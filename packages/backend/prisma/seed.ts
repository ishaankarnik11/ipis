import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Seeding dev database with comprehensive data...');

  // ── Clean existing data (order matters for foreign keys) ──
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

  // ── 1. Departments ──
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const finance = await prisma.department.create({ data: { name: 'Finance' } });
  const hr = await prisma.department.create({ data: { name: 'Human Resources' } });
  const delivery = await prisma.department.create({ data: { name: 'Delivery' } });
  const operations = await prisma.department.create({ data: { name: 'Operations' } });
  console.log('  ✓ 5 departments');

  // ── 2. System Config ──
  await prisma.systemConfig.create({
    data: {
      id: 'default',
      standardMonthlyHours: 176,
      healthyMarginThreshold: 0.20,
      atRiskMarginThreshold: 0.05,
    },
  });
  console.log('  ✓ System config');

  // ── 3. Users (all password: admin123) ──
  const passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ipis.test',
      passwordHash,
      name: 'Rajesh Kumar',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      email: 'finance@ipis.test',
      passwordHash,
      name: 'Priya Sharma',
      role: 'FINANCE',
      departmentId: finance.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@ipis.test',
      passwordHash,
      name: 'Anita Desai',
      role: 'HR',
      departmentId: hr.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const dm1User = await prisma.user.create({
    data: {
      email: 'dm1@ipis.test',
      passwordHash,
      name: 'Vikram Mehta',
      role: 'DELIVERY_MANAGER',
      departmentId: delivery.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const dm2User = await prisma.user.create({
    data: {
      email: 'dm2@ipis.test',
      passwordHash,
      name: 'Sunita Reddy',
      role: 'DELIVERY_MANAGER',
      departmentId: delivery.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const deptHeadUser = await prisma.user.create({
    data: {
      email: 'depthead@ipis.test',
      passwordHash,
      name: 'Arjun Patel',
      role: 'DEPT_HEAD',
      departmentId: engineering.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: 'deactivated@ipis.test',
      passwordHash,
      name: 'Deactivated User',
      role: 'HR',
      isActive: false,
      mustChangePassword: false,
    },
  });
  console.log('  ✓ 7 users');

  // ── 4. Employees (20 employees across departments) ──
  const employees = await Promise.all([
    // Engineering — 8 employees
    prisma.employee.create({ data: { employeeCode: 'ENG001', name: 'Amit Verma', departmentId: engineering.id, designation: 'Senior Developer', annualCtcPaise: BigInt(1800_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG002', name: 'Neha Gupta', departmentId: engineering.id, designation: 'Senior Developer', annualCtcPaise: BigInt(1650_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG003', name: 'Rahul Singh', departmentId: engineering.id, designation: 'Full Stack Developer', annualCtcPaise: BigInt(1400_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG004', name: 'Kavitha Nair', departmentId: engineering.id, designation: 'QA Engineer', annualCtcPaise: BigInt(1100_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG005', name: 'Deepak Joshi', departmentId: engineering.id, designation: 'DevOps Engineer', annualCtcPaise: BigInt(1500_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG006', name: 'Sneha Patil', departmentId: engineering.id, designation: 'Junior Developer', annualCtcPaise: BigInt(800_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG007', name: 'Ravi Teja', departmentId: engineering.id, designation: 'Tech Lead', annualCtcPaise: BigInt(2200_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'ENG008', name: 'Meera Krishnan', departmentId: engineering.id, designation: 'Senior Developer', annualCtcPaise: BigInt(1700_000_00), isBillable: true, isResigned: true } }),
    // Delivery — 4 employees
    prisma.employee.create({ data: { employeeCode: 'DEL001', name: 'Sanjay Rao', departmentId: delivery.id, designation: 'Project Manager', annualCtcPaise: BigInt(2000_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'DEL002', name: 'Pooja Agarwal', departmentId: delivery.id, designation: 'Business Analyst', annualCtcPaise: BigInt(1300_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'DEL003', name: 'Karthik Iyer', departmentId: delivery.id, designation: 'Scrum Master', annualCtcPaise: BigInt(1500_000_00), isBillable: true } }),
    prisma.employee.create({ data: { employeeCode: 'DEL004', name: 'Divya Saxena', departmentId: delivery.id, designation: 'Project Coordinator', annualCtcPaise: BigInt(900_000_00), isBillable: true } }),
    // Finance — 3 employees
    prisma.employee.create({ data: { employeeCode: 'FIN001', name: 'Manish Tiwari', departmentId: finance.id, designation: 'Financial Analyst', annualCtcPaise: BigInt(1200_000_00), isBillable: false } }),
    prisma.employee.create({ data: { employeeCode: 'FIN002', name: 'Swati Bose', departmentId: finance.id, designation: 'Accounts Manager', annualCtcPaise: BigInt(1400_000_00), isBillable: false } }),
    prisma.employee.create({ data: { employeeCode: 'FIN003', name: 'Rohit Kapoor', departmentId: finance.id, designation: 'Financial Analyst', annualCtcPaise: BigInt(1000_000_00), isBillable: false } }),
    // HR — 2 employees
    prisma.employee.create({ data: { employeeCode: 'HR001', name: 'Lakshmi Menon', departmentId: hr.id, designation: 'HR Coordinator', annualCtcPaise: BigInt(900_000_00), isBillable: false } }),
    prisma.employee.create({ data: { employeeCode: 'HR002', name: 'Arun Pillai', departmentId: hr.id, designation: 'Recruiter', annualCtcPaise: BigInt(800_000_00), isBillable: false } }),
    // Operations — 3 employees
    prisma.employee.create({ data: { employeeCode: 'OPS001', name: 'Gaurav Mishra', departmentId: operations.id, designation: 'IT Support', annualCtcPaise: BigInt(700_000_00), isBillable: false } }),
    prisma.employee.create({ data: { employeeCode: 'OPS002', name: 'Pallavi Shetty', departmentId: operations.id, designation: 'Office Manager', annualCtcPaise: BigInt(850_000_00), isBillable: false } }),
    prisma.employee.create({ data: { employeeCode: 'OPS003', name: 'Nitin Choudhury', departmentId: operations.id, designation: 'Facilities Coordinator', annualCtcPaise: BigInt(650_000_00), isBillable: false } }),
  ]);
  console.log('  ✓ 20 employees');

  // ── 5. Projects (10 projects across statuses & models) ──
  const projAlpha = await prisma.project.create({
    data: {
      name: 'Alpha Platform Migration',
      client: 'TechCorp India',
      vertical: 'IT Services',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'ACTIVE',
      deliveryManagerId: dm1User.id,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-09-30'),
    },
  });

  const projBeta = await prisma.project.create({
    data: {
      name: 'Beta Analytics Dashboard',
      client: 'FinServe Ltd',
      vertical: 'FinTech',
      engagementModel: 'FIXED_COST',
      status: 'ACTIVE',
      contractValuePaise: BigInt(4500_000_00),
      completionPercent: 0.65,
      deliveryManagerId: dm1User.id,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-06-30'),
    },
  });

  const projGamma = await prisma.project.create({
    data: {
      name: 'Gamma Cloud Infrastructure',
      client: 'CloudNine Solutions',
      vertical: 'Cloud Services',
      engagementModel: 'INFRASTRUCTURE',
      status: 'ACTIVE',
      infraCostMode: 'DETAILED',
      vendorCostPaise: BigInt(500_000_00),
      manpowerCostPaise: BigInt(300_000_00),
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  const projDelta = await prisma.project.create({
    data: {
      name: 'Delta Healthcare Portal',
      client: 'MedLife Corp',
      vertical: 'Healthcare',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'ACTIVE',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-11-30'),
    },
  });

  const projEpsilon = await prisma.project.create({
    data: {
      name: 'Epsilon AMC Support',
      client: 'RetailMax',
      vertical: 'Retail',
      engagementModel: 'AMC',
      status: 'ACTIVE',
      contractValuePaise: BigInt(1200_000_00),
      slaDescription: '99.9% uptime, 4h response SLA',
      deliveryManagerId: dm1User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Zeta Mobile App',
      client: 'StartupXYZ',
      vertical: 'Consumer Tech',
      engagementModel: 'FIXED_COST',
      status: 'PENDING_APPROVAL',
      contractValuePaise: BigInt(2500_000_00),
      deliveryManagerId: dm1User.id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-12-31'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Eta ERP Integration',
      client: 'ManufactureCo',
      vertical: 'Manufacturing',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'PENDING_APPROVAL',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2027-04-30'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Theta Data Warehouse',
      client: 'DataDriven Inc',
      vertical: 'Analytics',
      engagementModel: 'FIXED_COST',
      status: 'REJECTED',
      contractValuePaise: BigInt(8000_000_00),
      rejectionComment: 'Budget exceeds Q2 allocation. Resubmit in Q3.',
      deliveryManagerId: dm1User.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Iota Legacy Modernization',
      client: 'OldBank Ltd',
      vertical: 'Banking',
      engagementModel: 'TIME_AND_MATERIALS',
      status: 'COMPLETED',
      deliveryManagerId: dm2User.id,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  await prisma.project.create({
    data: {
      name: 'Kappa CRM Module',
      client: 'SalesForce India',
      vertical: 'SaaS',
      engagementModel: 'FIXED_COST',
      status: 'ON_HOLD',
      contractValuePaise: BigInt(3000_000_00),
      completionPercent: 0.40,
      deliveryManagerId: dm1User.id,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-08-31'),
    },
  });
  console.log('  ✓ 10 projects');

  // ── 5b. Project Roles ──
  const defaultRoleNames = [
    'Developer', 'Senior Developer', 'Tech Lead', 'QA Engineer',
    'Business Analyst', 'Project Manager', 'Designer',
    'DevOps Engineer', 'Architect', 'Support Engineer',
  ];
  const extraRoleNames = [
    'Junior Developer', 'Scrum Master', 'Coordinator',
  ];

  const projectRoles = new Map<string, string>();
  for (const name of [...defaultRoleNames, ...extraRoleNames]) {
    const role = await prisma.projectRole.create({ data: { name } });
    projectRoles.set(name, role.id);
  }
  console.log(`  ✓ ${projectRoles.size} project roles`);

  // ── 6. Employee-Project Assignments ──
  const r = (name: string) => projectRoles.get(name)!;
  // Alpha: 5 team members
  await prisma.employeeProject.createMany({
    data: [
      { projectId: projAlpha.id, employeeId: employees[0].id, roleId: r('Tech Lead'), billingRatePaise: BigInt(8000_00) },
      { projectId: projAlpha.id, employeeId: employees[2].id, roleId: r('Developer'), billingRatePaise: BigInt(6000_00) },
      { projectId: projAlpha.id, employeeId: employees[3].id, roleId: r('QA Engineer'), billingRatePaise: BigInt(5000_00) },
      { projectId: projAlpha.id, employeeId: employees[5].id, roleId: r('Junior Developer'), billingRatePaise: BigInt(3500_00) },
      { projectId: projAlpha.id, employeeId: employees[8].id, roleId: r('Project Manager'), billingRatePaise: BigInt(7500_00) },
    ],
  });
  // Beta: 4 team members
  await prisma.employeeProject.createMany({
    data: [
      { projectId: projBeta.id, employeeId: employees[1].id, roleId: r('Senior Developer'), billingRatePaise: BigInt(7500_00) },
      { projectId: projBeta.id, employeeId: employees[6].id, roleId: r('Tech Lead'), billingRatePaise: BigInt(9000_00) },
      { projectId: projBeta.id, employeeId: employees[9].id, roleId: r('Business Analyst'), billingRatePaise: BigInt(6000_00) },
      { projectId: projBeta.id, employeeId: employees[4].id, roleId: r('DevOps Engineer'), billingRatePaise: BigInt(6500_00) },
    ],
  });
  // Gamma: 3 team members
  await prisma.employeeProject.createMany({
    data: [
      { projectId: projGamma.id, employeeId: employees[4].id, roleId: r('DevOps Engineer'), billingRatePaise: BigInt(7000_00) },
      { projectId: projGamma.id, employeeId: employees[0].id, roleId: r('Architect'), billingRatePaise: BigInt(8500_00) },
      { projectId: projGamma.id, employeeId: employees[10].id, roleId: r('Scrum Master'), billingRatePaise: BigInt(6500_00) },
    ],
  });
  // Delta: 4 team members
  await prisma.employeeProject.createMany({
    data: [
      { projectId: projDelta.id, employeeId: employees[2].id, roleId: r('Developer'), billingRatePaise: BigInt(6000_00) },
      { projectId: projDelta.id, employeeId: employees[1].id, roleId: r('Senior Developer'), billingRatePaise: BigInt(7000_00) },
      { projectId: projDelta.id, employeeId: employees[3].id, roleId: r('QA Engineer'), billingRatePaise: BigInt(5000_00) },
      { projectId: projDelta.id, employeeId: employees[11].id, roleId: r('Coordinator'), billingRatePaise: BigInt(4000_00) },
    ],
  });
  // Epsilon AMC: 2 team members
  await prisma.employeeProject.createMany({
    data: [
      { projectId: projEpsilon.id, employeeId: employees[6].id, roleId: r('Support Engineer'), billingRatePaise: BigInt(8000_00) },
      { projectId: projEpsilon.id, employeeId: employees[5].id, roleId: r('Support Engineer'), billingRatePaise: BigInt(3500_00) },
    ],
  });
  console.log('  ✓ 18 employee-project assignments');

  // ── 7. Upload Events ──
  // 3 months of uploads: Jan, Feb, Mar 2026
  const uploads: Awaited<ReturnType<typeof prisma.uploadEvent.create>>[] = [];
  for (const month of [1, 2, 3]) {
    const tsUpload = await prisma.uploadEvent.create({
      data: {
        type: 'TIMESHEET',
        status: 'SUCCESS',
        uploadedBy: financeUser.id,
        periodMonth: month,
        periodYear: 2026,
        rowCount: 40 + month * 5,
      },
    });
    const billingUpload = await prisma.uploadEvent.create({
      data: {
        type: 'BILLING',
        status: 'SUCCESS',
        uploadedBy: financeUser.id,
        periodMonth: month,
        periodYear: 2026,
        rowCount: 5,
      },
    });
    const salaryUpload = await prisma.uploadEvent.create({
      data: {
        type: 'SALARY',
        status: month === 1 ? 'PARTIAL' : 'SUCCESS',
        uploadedBy: hrUser.id,
        periodMonth: month,
        periodYear: 2026,
        rowCount: 20,
        errorSummary: month === 1 ? [{ row: 5, employeeCode: 'UNKNOWN', error: 'Employee not found' }] : undefined,
      },
    });
    uploads.push(tsUpload, billingUpload, salaryUpload);
  }
  console.log('  ✓ 9 upload events (3 months × 3 types)');

  // ── 8. Timesheet Entries (3 months for active projects) ──
  const activeProjects = [
    { proj: projAlpha, emps: [employees[0], employees[2], employees[3], employees[5], employees[8]] },
    { proj: projBeta, emps: [employees[1], employees[6], employees[9], employees[4]] },
    { proj: projGamma, emps: [employees[4], employees[0], employees[10]] },
    { proj: projDelta, emps: [employees[2], employees[1], employees[3], employees[11]] },
    { proj: projEpsilon, emps: [employees[6], employees[5]] },
  ];

  let tsCount = 0;
  for (const month of [1, 2, 3]) {
    const tsUpload = uploads[(month - 1) * 3]; // timesheet upload for this month
    for (const { proj, emps } of activeProjects) {
      for (const emp of emps) {
        const baseHours = 140 + Math.floor(Math.random() * 40); // 140-180
        await prisma.timesheetEntry.create({
          data: {
            employeeId: emp.id,
            projectId: proj.id,
            hours: baseHours,
            periodMonth: month,
            periodYear: 2026,
            uploadEventId: tsUpload.id,
          },
        });
        tsCount++;
      }
    }
  }
  console.log(`  ✓ ${tsCount} timesheet entries`);

  // ── 9. Billing Records (3 months for active projects) ──
  const billingData = [
    { proj: projAlpha, client: 'TechCorp India', type: 'TIME_AND_MATERIALS', vertical: 'IT Services', amounts: [3200_000_00, 3500_000_00, 3800_000_00] },
    { proj: projBeta, client: 'FinServe Ltd', type: 'FIXED_COST', vertical: 'FinTech', amounts: [1500_000_00, 1500_000_00, 1500_000_00] },
    { proj: projGamma, client: 'CloudNine Solutions', type: 'INFRASTRUCTURE', vertical: 'Cloud Services', amounts: [800_000_00, 850_000_00, 900_000_00] },
    { proj: projDelta, client: 'MedLife Corp', type: 'TIME_AND_MATERIALS', vertical: 'Healthcare', amounts: [2800_000_00, 3000_000_00, 3200_000_00] },
    { proj: projEpsilon, client: 'RetailMax', type: 'AMC', vertical: 'Retail', amounts: [100_000_00, 100_000_00, 100_000_00] },
  ];

  let brCount = 0;
  for (const month of [1, 2, 3]) {
    const billUpload = uploads[(month - 1) * 3 + 1]; // billing upload for this month
    for (const bd of billingData) {
      await prisma.billingRecord.create({
        data: {
          projectId: bd.proj.id,
          clientName: bd.client,
          invoiceAmountPaise: BigInt(bd.amounts[month - 1]),
          invoiceDate: new Date(`2026-${String(month).padStart(2, '0')}-15`),
          projectType: bd.type,
          vertical: bd.vertical,
          periodMonth: month,
          periodYear: 2026,
          uploadEventId: billUpload.id,
        },
      });
      brCount++;
    }
  }
  console.log(`  ✓ ${brCount} billing records`);

  // ── 10. Recalculation Runs + Calculation Snapshots (3 months) ──
  for (const month of [1, 2, 3]) {
    const billUpload = uploads[(month - 1) * 3 + 1];
    const run = await prisma.recalculationRun.create({
      data: {
        uploadEventId: billUpload.id,
        projectsProcessed: 5,
        completedAt: new Date(`2026-${String(month).padStart(2, '0')}-16`),
      },
    });

    const base = { recalculationRunId: run.id, periodMonth: month, periodYear: 2026, engineVersion: '1.0.0', calculatedAt: new Date(`2026-${String(month).padStart(2, '0')}-16`) };

    // Project snapshots
    const projectSnaps = [
      { proj: projAlpha, revenue: 3200_000_00 + month * 300_000_00, cost: 2400_000_00 + month * 150_000_00, marginBp: 2500 + month * 100 },
      { proj: projBeta, revenue: 1500_000_00, cost: 1100_000_00 + month * 50_000_00, marginBp: 2300 - month * 200 },
      { proj: projGamma, revenue: 800_000_00 + month * 50_000_00, cost: 700_000_00 + month * 30_000_00, marginBp: 1250 + month * 50 },
      { proj: projDelta, revenue: 2800_000_00 + month * 200_000_00, cost: 2600_000_00 + month * 250_000_00, marginBp: 700 - month * 200 },
      { proj: projEpsilon, revenue: 100_000_00, cost: 80_000_00, marginBp: 2000 },
    ];

    for (const ps of projectSnaps) {
      const profit = ps.revenue - ps.cost;
      await prisma.calculationSnapshot.create({
        data: {
          ...base,
          entityType: 'PROJECT',
          entityId: ps.proj.id,
          figureType: 'MARGIN_PERCENT',
          valuePaise: BigInt(ps.marginBp),
          breakdownJson: {
            engagementModel: ps.proj === projBeta ? 'FIXED_COST' : ps.proj === projGamma ? 'INFRASTRUCTURE' : ps.proj === projEpsilon ? 'AMC' : 'TIME_AND_MATERIALS',
            revenue: ps.revenue,
            cost: ps.cost,
            profit,
            employees: [],
          },
        },
      });
    }

    // Department snapshots
    const deptSnaps = [
      { dept: engineering, revenue: 6000_000_00 + month * 400_000_00, cost: 4800_000_00 + month * 300_000_00, marginBp: 2000 + month * 50 },
      { dept: delivery, revenue: 3500_000_00 + month * 200_000_00, cost: 2800_000_00 + month * 150_000_00, marginBp: 2000 + month * 30 },
      { dept: finance, revenue: 0, cost: 360_000_00, marginBp: -10000 },
      { dept: hr, revenue: 0, cost: 170_000_00, marginBp: -10000 },
      { dept: operations, revenue: 0, cost: 220_000_00, marginBp: -10000 },
    ];

    for (const ds of deptSnaps) {
      await prisma.calculationSnapshot.createMany({
        data: [
          { ...base, entityType: 'DEPARTMENT', entityId: ds.dept.id, figureType: 'MARGIN_PERCENT', valuePaise: BigInt(ds.marginBp), breakdownJson: {} },
          { ...base, entityType: 'DEPARTMENT', entityId: ds.dept.id, figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(ds.revenue), breakdownJson: {} },
          { ...base, entityType: 'DEPARTMENT', entityId: ds.dept.id, figureType: 'EMPLOYEE_COST', valuePaise: BigInt(ds.cost), breakdownJson: {} },
        ],
      });
    }

    // Practice (designation) snapshots
    const practiceSnaps = [
      { designation: 'Senior Developer', revenue: 3500_000_00, cost: 2200_000_00, marginBp: 3714 },
      { designation: 'Full Stack Developer', revenue: 2000_000_00, cost: 1400_000_00, marginBp: 3000 },
      { designation: 'Tech Lead', revenue: 2500_000_00, cost: 1800_000_00, marginBp: 2800 },
      { designation: 'QA Engineer', revenue: 1200_000_00, cost: 900_000_00, marginBp: 2500 },
      { designation: 'DevOps Engineer', revenue: 1800_000_00, cost: 1300_000_00, marginBp: 2778 },
      { designation: 'Project Manager', revenue: 1500_000_00, cost: 1200_000_00, marginBp: 2000 },
      { designation: 'Business Analyst', revenue: 1000_000_00, cost: 800_000_00, marginBp: 2000 },
    ];

    for (const ps of practiceSnaps) {
      await prisma.calculationSnapshot.createMany({
        data: [
          { ...base, entityType: 'PRACTICE', entityId: ps.designation, figureType: 'MARGIN_PERCENT', valuePaise: BigInt(ps.marginBp), breakdownJson: {} },
          { ...base, entityType: 'PRACTICE', entityId: ps.designation, figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(ps.revenue), breakdownJson: {} },
          { ...base, entityType: 'PRACTICE', entityId: ps.designation, figureType: 'EMPLOYEE_COST', valuePaise: BigInt(ps.cost), breakdownJson: {} },
        ],
      });
    }

    // Company-wide snapshot
    const totalRevenue = 8400_000_00 + month * 550_000_00;
    const totalCost = 6400_000_00 + month * 400_000_00;
    const companyMarginBp = Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000);
    await prisma.calculationSnapshot.createMany({
      data: [
        { ...base, entityType: 'COMPANY', entityId: 'COMPANY', figureType: 'MARGIN_PERCENT', valuePaise: BigInt(companyMarginBp), breakdownJson: {} },
        { ...base, entityType: 'COMPANY', entityId: 'COMPANY', figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(totalRevenue), breakdownJson: {} },
        { ...base, entityType: 'COMPANY', entityId: 'COMPANY', figureType: 'EMPLOYEE_COST', valuePaise: BigInt(totalCost), breakdownJson: {} },
      ],
    });

    // Employee snapshots (billable employees only)
    const billableEmps = employees.filter(e => !['FIN001', 'FIN002', 'FIN003', 'HR001', 'HR002', 'OPS001', 'OPS002', 'OPS003'].includes(e.employeeCode) && !e.isResigned);
    for (const emp of billableEmps) {
      const hours = 140 + Math.floor(Math.random() * 40);
      const billableHours = Math.floor(hours * (0.6 + Math.random() * 0.35));
      await prisma.calculationSnapshot.createMany({
        data: [
          { ...base, entityType: 'EMPLOYEE', entityId: emp.id, figureType: 'MARGIN_PERCENT', valuePaise: BigInt(1500 + Math.floor(Math.random() * 2000)), breakdownJson: { totalHours: hours, billableHours, availableHours: 176 } },
          { ...base, entityType: 'EMPLOYEE', entityId: emp.id, figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(200_000_00 + Math.floor(Math.random() * 300_000_00)), breakdownJson: {} },
          { ...base, entityType: 'EMPLOYEE', entityId: emp.id, figureType: 'EMPLOYEE_COST', valuePaise: BigInt(100_000_00 + Math.floor(Math.random() * 100_000_00)), breakdownJson: {} },
        ],
      });
    }
  }
  console.log('  ✓ 3 recalculation runs with full snapshots');

  // ── 11. Audit Events (sample activity log) ──
  const auditActions = [
    { action: 'USER_LOGIN', entityType: 'USER', actorId: adminUser.id },
    { action: 'USER_CREATE', entityType: 'USER', actorId: adminUser.id, metadata: { email: 'dm1@ipis.test' } },
    { action: 'EMPLOYEE_CREATE', entityType: 'EMPLOYEE', actorId: hrUser.id, metadata: { code: 'ENG001' } },
    { action: 'PROJECT_CREATE', entityType: 'PROJECT', actorId: dm1User.id, metadata: { name: 'Alpha Platform Migration' } },
    { action: 'PROJECT_APPROVE', entityType: 'PROJECT', actorId: adminUser.id, metadata: { name: 'Alpha Platform Migration' } },
    { action: 'DATA_UPLOAD', entityType: 'UPLOAD', actorId: financeUser.id, metadata: { type: 'TIMESHEET', month: 1 } },
    { action: 'DATA_UPLOAD', entityType: 'UPLOAD', actorId: financeUser.id, metadata: { type: 'BILLING', month: 1 } },
    { action: 'DATA_UPLOAD', entityType: 'UPLOAD', actorId: hrUser.id, metadata: { type: 'SALARY', month: 1 } },
    { action: 'RECALCULATION', entityType: 'SYSTEM', actorId: financeUser.id, metadata: { projects: 5 } },
    { action: 'CONFIG_UPDATE', entityType: 'SYSTEM_CONFIG', actorId: adminUser.id, metadata: { field: 'standardMonthlyHours', value: 176 } },
  ];

  for (const ae of auditActions) {
    await prisma.auditEvent.create({
      data: {
        actorId: ae.actorId,
        action: ae.action,
        entityType: ae.entityType,
        metadata: ae.metadata ?? null,
      },
    });
  }
  console.log('  ✓ 10 audit events');

  console.log('\nDev seed complete! All users share password: admin123');
}

main()
  .catch((e) => {
    console.error('Dev seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create departments for testing
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  });

  const finance = await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: { name: 'Finance' },
  });

  await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  });

  await prisma.department.upsert({
    where: { name: 'Delivery' },
    update: {},
    create: { name: 'Delivery' },
  });

  await prisma.department.upsert({
    where: { name: 'Operations' },
    update: {},
    create: { name: 'Operations' },
  });

  // Create active admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ipis.test' },
    update: {},
    create: {
      email: 'admin@ipis.test',
      passwordHash: adminHash,
      name: 'Test Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Create active finance user with department
  const financeHash = await bcrypt.hash('finance123', 10);
  await prisma.user.upsert({
    where: { email: 'finance@ipis.test' },
    update: {},
    create: {
      email: 'finance@ipis.test',
      passwordHash: financeHash,
      name: 'Test Finance',
      role: 'FINANCE',
      departmentId: finance.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Create department head user linked to Engineering
  const deptHeadHash = await bcrypt.hash('depthead123', 10);
  await prisma.user.upsert({
    where: { email: 'depthead@ipis.test' },
    update: {},
    create: {
      email: 'depthead@ipis.test',
      passwordHash: deptHeadHash,
      name: 'Engineering Head',
      role: 'DEPT_HEAD',
      departmentId: engineering.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Create deactivated user
  const deactivatedHash = await bcrypt.hash('deactivated123', 10);
  await prisma.user.upsert({
    where: { email: 'deactivated@ipis.test' },
    update: {},
    create: {
      email: 'deactivated@ipis.test',
      passwordHash: deactivatedHash,
      name: 'Deactivated User',
      role: 'HR',
      isActive: false,
      mustChangePassword: false,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

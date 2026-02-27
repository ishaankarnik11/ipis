import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import type { UserRole } from '@prisma/client';

const TEST_BCRYPT_ROUNDS = 4;

/**
 * Truncates all tables in dependency order using CASCADE.
 * Call in beforeEach() to guarantee a clean slate for every test.
 */
export async function cleanDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      calculation_snapshots,
      recalculation_runs,
      employee_projects,
      employees,
      password_reset_tokens,
      audit_events,
      system_config,
      projects,
      users,
      departments
    CASCADE
  `);
}

const STANDARD_DEPARTMENTS = [
  'Delivery',
  'Engineering',
  'Finance',
  'HR',
  'Operations',
] as const;

/**
 * Seeds the 5 standard departments and returns a map of name → id.
 */
export async function seedTestDepartments(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const name of STANDARD_DEPARTMENTS) {
    const dept = await prisma.department.create({ data: { name } });
    map.set(name, dept.id);
  }

  return map;
}

/**
 * Creates a test user with a bcrypt-hashed password (fast salt rounds).
 * Returns the created user record plus the plain-text password.
 */
export async function createTestUser(
  role: UserRole,
  overrides: {
    email?: string;
    name?: string;
    password?: string;
    departmentId?: string;
    isActive?: boolean;
    mustChangePassword?: boolean;
  } = {},
) {
  const password = overrides.password ?? 'test-password-123';
  const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}-${Date.now()}@test.com`,
      name: overrides.name ?? `Test ${role}`,
      role,
      passwordHash,
      departmentId: overrides.departmentId ?? null,
      isActive: overrides.isActive ?? true,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });

  return { ...user, password };
}

/**
 * Disconnects the Prisma client. Call in afterAll().
 */
export async function disconnectTestDb() {
  await prisma.$disconnect();
}

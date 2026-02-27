import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import * as userService from './user.service.js';

describe('user.service', () => {
  let departments: Map<string, string>;

  beforeEach(async () => {
    await cleanDb();
    departments = await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createUser', () => {
    it('should create a user with hashed password and mustChangePassword true', async () => {
      const result = await userService.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'FINANCE',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('temporaryPassword');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.role).toBe('FINANCE');
      expect(result.isActive).toBe(true);
      expect(result.departmentName).toBeNull();

      // Verify the DB record has a real bcrypt hash
      const dbUser = await prisma.user.findUnique({ where: { email: 'jane@example.com' } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash).toMatch(/^\$2[aby]?\$/);
      expect(dbUser!.mustChangePassword).toBe(true);
      expect(dbUser!.isActive).toBe(true);
    });

    it('should throw ConflictError when email already exists', async () => {
      await createTestUser('ADMIN', { email: 'jane@example.com' });

      await expect(
        userService.createUser({
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'ADMIN',
        }),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should pass departmentId when provided', async () => {
      const engDeptId = departments.get('Engineering')!;

      const result = await userService.createUser({
        name: 'John',
        email: 'john@example.com',
        role: 'DEPT_HEAD',
        departmentId: engDeptId,
      });

      expect(result.departmentName).toBe('Engineering');

      const dbUser = await prisma.user.findUnique({ where: { email: 'john@example.com' } });
      expect(dbUser!.departmentId).toBe(engDeptId);
    });

    it('should return temporaryPassword in the result', async () => {
      const result = await userService.createUser({
        name: 'Test',
        email: 'test@example.com',
        role: 'HR',
      });

      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
    });
  });

  describe('getAll', () => {
    it('should return all users with correct fields including departmentName', async () => {
      await createTestUser('ADMIN', { email: 'a@test.com', name: 'A' });
      const engDeptId = departments.get('Engineering')!;
      await createTestUser('HR', { email: 'b@test.com', name: 'B', departmentId: engDeptId, isActive: false });

      const result = await userService.getAll();

      expect(result).toHaveLength(2);

      const userA = result.find((u) => u.email === 'a@test.com')!;
      expect(userA.departmentName).toBeNull();
      expect(userA.isActive).toBe(true);

      const userB = result.find((u) => u.email === 'b@test.com')!;
      expect(userB.departmentName).toBe('Engineering');
      expect(userB.isActive).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update only provided fields', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com', name: 'Original' });

      const result = await userService.updateUser(user.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.departmentName).toBeNull();
    });

    it('should handle deactivation via isActive: false', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });

      const result = await userService.updateUser(user.id, { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should update role and departmentId together', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });
      const finDeptId = departments.get('Finance')!;

      const result = await userService.updateUser(user.id, { role: 'DEPT_HEAD', departmentId: finDeptId });

      expect(result.departmentName).toBe('Finance');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      await expect(
        userService.updateUser('00000000-0000-4000-8000-000000000001', { name: 'X' }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getAllDepartments', () => {
    it('should return all departments sorted by name', async () => {
      const result = await userService.getAllDepartments();

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Delivery');
      expect(result[4].name).toBe('Operations');

      for (const dept of result) {
        expect(dept).toHaveProperty('id');
        expect(dept).toHaveProperty('name');
      }
    });
  });
});

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
    it('should create a user with status INVITED (no password)', async () => {
      const result = await userService.createUser({
        email: 'jane@example.com',
        role: 'FINANCE',
        name: 'Jane Doe',
      });

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.role).toBe('FINANCE');
      expect(result.status).toBe('INVITED');
      expect(result.departmentName).toBeNull();

      // Verify the DB record
      const dbUser = await prisma.user.findUnique({ where: { email: 'jane@example.com' } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.status).toBe('INVITED');
    });

    it('should throw ConflictError when email already exists', async () => {
      await createTestUser('ADMIN', { email: 'jane@example.com' });

      await expect(
        userService.createUser({
          email: 'jane@example.com',
          role: 'ADMIN',
          name: 'Jane Doe',
        }),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should pass departmentId when provided', async () => {
      const engDeptId = departments.get('Engineering')!;

      const result = await userService.createUser({
        email: 'john@example.com',
        role: 'DEPT_HEAD',
        name: 'John',
        departmentId: engDeptId,
      });

      expect(result.departmentName).toBe('Engineering');

      const dbUser = await prisma.user.findUnique({ where: { email: 'john@example.com' } });
      expect(dbUser!.departmentId).toBe(engDeptId);
    });
  });

  describe('getAll', () => {
    it('should return all users with correct fields including departmentName and status', async () => {
      await createTestUser('ADMIN', { email: 'a@test.com', name: 'A' });
      const engDeptId = departments.get('Engineering')!;
      await createTestUser('HR', { email: 'b@test.com', name: 'B', departmentId: engDeptId, status: 'DEACTIVATED' });

      const result = await userService.getAll();

      expect(result).toHaveLength(2);

      const userA = result.find((u) => u.email === 'a@test.com')!;
      expect(userA.departmentName).toBeNull();
      expect(userA.status).toBe('ACTIVE');

      const userB = result.find((u) => u.email === 'b@test.com')!;
      expect(userB.departmentName).toBe('Engineering');
      expect(userB.status).toBe('DEACTIVATED');
    });
  });

  describe('updateUser', () => {
    it('should update only provided fields', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com', name: 'Original' });

      const result = await userService.updateUser(user.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.departmentName).toBeNull();
    });

    it('should handle deactivation via status: DEACTIVATED', async () => {
      // Create two admins so the last-admin guard doesn't block
      await createTestUser('ADMIN', { email: 'other-admin@test.com' });
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });

      const result = await userService.updateUser(user.id, { status: 'DEACTIVATED' });

      expect(result.status).toBe('DEACTIVATED');
    });

    it('should prevent self-deactivation', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });

      await expect(
        userService.updateUser(user.id, { status: 'DEACTIVATED' }, user.id),
      ).rejects.toThrow('You cannot deactivate your own account');
    });

    it('should prevent deactivating the last active admin', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });
      const otherUser = await createTestUser('FINANCE', { email: 'other@test.com' });

      await expect(
        userService.updateUser(user.id, { status: 'DEACTIVATED' }, otherUser.id),
      ).rejects.toThrow('Cannot deactivate the last active admin user');
    });

    it('should allow deactivating an admin when another active admin exists', async () => {
      await createTestUser('ADMIN', { email: 'admin2@test.com' });
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });
      const actor = await createTestUser('ADMIN', { email: 'actor@test.com' });

      const result = await userService.updateUser(user.id, { status: 'DEACTIVATED' }, actor.id);

      expect(result.status).toBe('DEACTIVATED');
    });

    it('should update role and departmentId together', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });
      // Create a second admin so the last-admin guard doesn't block
      await createTestUser('ADMIN', { email: 'admin2@test.com' });
      const finDeptId = departments.get('Finance')!;

      const result = await userService.updateUser(user.id, { role: 'DEPT_HEAD', departmentId: finDeptId });

      expect(result.departmentName).toBe('Finance');
    });

    it('should prevent changing the role of the last active admin', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });

      await expect(
        userService.updateUser(user.id, { role: 'FINANCE' }),
      ).rejects.toThrow('Cannot change the role of the last active admin user');
    });

    it('should allow changing admin role when another active admin exists', async () => {
      const user = await createTestUser('ADMIN', { email: 'a@test.com' });
      await createTestUser('ADMIN', { email: 'admin2@test.com' });

      const result = await userService.updateUser(user.id, { role: 'FINANCE' });
      expect(result.role).toBe('FINANCE');
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

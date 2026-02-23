import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';
import * as userService from './user.service.js';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockCreate = prisma.user.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.user.update as ReturnType<typeof vi.fn>;

const mockDeptFindMany = (prisma.department as { findMany: ReturnType<typeof vi.fn> }).findMany;

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with hashed password and mustChangePassword true', async () => {
      mockFindUnique.mockResolvedValue(null); // no duplicate
      mockCreate.mockResolvedValue({
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'FINANCE',
        isActive: true,
        mustChangePassword: true,
        departmentId: null,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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

      // Verify Prisma was called with hashed password
      expect(mockCreate).toHaveBeenCalledOnce();
      const createArg = mockCreate.mock.calls[0][0];
      expect(createArg.data.passwordHash).toBeDefined();
      expect(createArg.data.passwordHash).not.toBe(''); // should be bcrypt hash
      expect(createArg.data.mustChangePassword).toBe(true);
      expect(createArg.data.isActive).toBe(true);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockFindUnique.mockResolvedValue({ id: 'existing', email: 'jane@example.com' });

      await expect(
        userService.createUser({
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'ADMIN',
        }),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should pass departmentId when provided', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'user-2',
        name: 'John',
        email: 'john@example.com',
        role: 'DEPT_HEAD',
        isActive: true,
        mustChangePassword: true,
        departmentId: 'dept-1',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userService.createUser({
        name: 'John',
        email: 'john@example.com',
        role: 'DEPT_HEAD',
        departmentId: 'dept-1',
      });

      const createArg = mockCreate.mock.calls[0][0];
      expect(createArg.data.departmentId).toBe('dept-1');
    });

    it('should return temporaryPassword in the result', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'user-3',
        name: 'Test',
        email: 'test@example.com',
        role: 'HR',
        isActive: true,
        mustChangePassword: true,
        departmentId: null,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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
    it('should return all users with correct fields', async () => {
      const users = [
        { id: 'u1', name: 'A', email: 'a@test.com', role: 'ADMIN', departmentId: null, isActive: true },
        { id: 'u2', name: 'B', email: 'b@test.com', role: 'HR', departmentId: 'dept-1', isActive: false },
      ];
      mockFindMany.mockResolvedValue(users);

      const result = await userService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'u1',
        name: 'A',
        email: 'a@test.com',
        role: 'ADMIN',
        departmentId: null,
        isActive: true,
      });
      expect(mockFindMany).toHaveBeenCalledOnce();
    });
  });

  describe('updateUser', () => {
    it('should update only provided fields', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        email: 'a@test.com',
        role: 'ADMIN',
        departmentId: null,
        isActive: true,
      });

      const result = await userService.updateUser('u1', { name: 'Updated Name' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'Updated Name' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          isActive: true,
        },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should handle deactivation via isActive: false', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@test.com',
        role: 'ADMIN',
        departmentId: null,
        isActive: false,
      });

      const result = await userService.updateUser('u1', { isActive: false });

      expect(result.isActive).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: false },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          isActive: true,
        },
      });
    });

    it('should update role and departmentId together', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@test.com',
        role: 'DEPT_HEAD',
        departmentId: 'dept-2',
        isActive: true,
      });

      await userService.updateUser('u1', { role: 'DEPT_HEAD', departmentId: 'dept-2' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: 'DEPT_HEAD', departmentId: 'dept-2' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          isActive: true,
        },
      });
    });
  });

  describe('getAllDepartments', () => {
    it('should return all departments sorted by name', async () => {
      const departments = [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Finance' },
      ];
      mockDeptFindMany.mockResolvedValue(departments);

      const result = await userService.getAllDepartments();

      expect(result).toEqual(departments);
      expect(mockDeptFindMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    });
  });
});

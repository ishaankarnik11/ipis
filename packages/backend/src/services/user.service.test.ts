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

class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, meta: { code: string }) {
    super(message);
    this.code = meta.code;
  }
}

import { prisma } from '../lib/prisma.js';
import * as userService from './user.service.js';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockCreate = prisma.user.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.user.update as ReturnType<typeof vi.fn>;

const mockDeptFindMany = (prisma.department as unknown as { findMany: ReturnType<typeof vi.fn> }).findMany;

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
        department: null,
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
      expect(result.departmentName).toBeNull();

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
        department: { name: 'Engineering' },
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
        department: null,
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
    it('should return all users with correct fields including departmentName', async () => {
      const users = [
        { id: 'u1', name: 'A', email: 'a@test.com', role: 'ADMIN', departmentId: null, department: null, isActive: true },
        { id: 'u2', name: 'B', email: 'b@test.com', role: 'HR', departmentId: 'dept-1', department: { name: 'Engineering' }, isActive: false },
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
        departmentName: null,
        isActive: true,
      });
      expect(result[1].departmentName).toBe('Engineering');
      expect(mockFindMany).toHaveBeenCalledOnce();
    });
  });

  describe('updateUser', () => {
    const USER_SELECT_WITH_DEPT = {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      isActive: true,
      department: { select: { name: true } },
    };

    it('should update only provided fields', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        email: 'a@test.com',
        role: 'ADMIN',
        departmentId: null,
        department: null,
        isActive: true,
      });

      const result = await userService.updateUser('u1', { name: 'Updated Name' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'Updated Name', role: undefined },
        select: USER_SELECT_WITH_DEPT,
      });
      expect(result.name).toBe('Updated Name');
      expect(result.departmentName).toBeNull();
    });

    it('should handle deactivation via isActive: false', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@test.com',
        role: 'ADMIN',
        departmentId: null,
        department: null,
        isActive: false,
      });

      const result = await userService.updateUser('u1', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should update role and departmentId together', async () => {
      mockUpdate.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@test.com',
        role: 'DEPT_HEAD',
        departmentId: 'dept-2',
        department: { name: 'Finance' },
        isActive: true,
      });

      const result = await userService.updateUser('u1', { role: 'DEPT_HEAD', departmentId: 'dept-2' });

      expect(result.departmentName).toBe('Finance');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      const prismaError = new PrismaClientKnownRequestError('Record not found', { code: 'P2025' });
      mockUpdate.mockRejectedValue(prismaError);

      await expect(
        userService.updateUser('nonexistent-id', { name: 'X' }),
      ).rejects.toThrow('User not found');
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, getCurrentUser, hashPassword } from './auth.service.js';
import { UnauthorizedError } from '../lib/errors.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockHash = bcrypt.hash as ReturnType<typeof vi.fn>;

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    const activeUser = {
      id: 'user-1',
      email: 'test@test.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      role: 'ADMIN',
      isActive: true,
      departmentId: null,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user data on valid credentials', async () => {
      mockFindUnique.mockResolvedValue(activeUser);
      mockCompare.mockResolvedValue(true);

      const result = await login('test@test.com', 'password123');
      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
      });
    });

    it('should throw UnauthorizedError for non-existent email', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(login('nonexistent@test.com', 'password')).rejects.toThrow(UnauthorizedError);
      await expect(login('nonexistent@test.com', 'password')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      mockFindUnique.mockResolvedValue(activeUser);
      mockCompare.mockResolvedValue(false);

      await expect(login('test@test.com', 'wrong-password')).rejects.toThrow(UnauthorizedError);
      await expect(login('test@test.com', 'wrong-password')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw UnauthorizedError for deactivated user', async () => {
      mockFindUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(login('test@test.com', 'password123')).rejects.toThrow(UnauthorizedError);
    });

    it('should return same error message for both wrong email and wrong password (no enumeration)', async () => {
      // Wrong email
      mockFindUnique.mockResolvedValue(null);
      try {
        await login('wrong@test.com', 'password');
      } catch (e) {
        expect((e as UnauthorizedError).message).toBe('Invalid email or password');
      }

      // Wrong password
      mockFindUnique.mockResolvedValue(activeUser);
      mockCompare.mockResolvedValue(false);
      try {
        await login('test@test.com', 'wrong');
      } catch (e) {
        expect((e as UnauthorizedError).message).toBe('Invalid email or password');
      }
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data with departmentId', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: 'dept-1',
        isActive: true,
      });

      const result = await getCurrentUser('user-1');
      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: 'dept-1',
      });
    });

    it('should return null departmentId when not set', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: undefined,
        isActive: true,
      });

      const result = await getCurrentUser('user-1');
      expect(result.departmentId).toBeNull();
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(getCurrentUser('nonexistent')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for deactivated user', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        isActive: false,
      });

      await expect(getCurrentUser('user-1')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('hashPassword', () => {
    it('should return a hashed password', async () => {
      mockHash.mockResolvedValue('hashed-result');

      const result = await hashPassword('plain-password');
      expect(result).toBe('hashed-result');
      expect(mockHash).toHaveBeenCalledWith('plain-password', 10);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, getCurrentUser, hashPassword, requestPasswordReset, validateResetToken, resetPassword, changePassword } from './auth.service.js';
import { UnauthorizedError } from '../lib/errors.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock config
vi.mock('../lib/config.js', () => ({
  config: {
    frontendUrl: 'http://localhost:5173',
  },
}));

// Mock email service
vi.mock('./email.service.js', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { sendPasswordResetEmail } from './email.service.js';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockHash = bcrypt.hash as ReturnType<typeof vi.fn>;
const mockTokenCreate = prisma.passwordResetToken.create as ReturnType<typeof vi.fn>;
const mockTokenFindFirst = prisma.passwordResetToken.findFirst as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockSendEmail = sendPasswordResetEmail as ReturnType<typeof vi.fn>;

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
    it('should return user data with departmentId and mustChangePassword', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: 'dept-1',
        isActive: true,
        mustChangePassword: false,
      });

      const result = await getCurrentUser('user-1');
      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: 'dept-1',
        mustChangePassword: false,
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
        mustChangePassword: false,
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

  describe('requestPasswordReset', () => {
    it('should create token and send email for active user', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        isActive: true,
      });
      mockTokenCreate.mockResolvedValue({});

      await requestPasswordReset('user@test.com');

      expect(mockTokenCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
      expect(mockSendEmail).toHaveBeenCalledWith(
        'user@test.com',
        expect.stringContaining('http://localhost:5173/reset-password?token='),
      );
    });

    it('should silently return for non-existent email (no enumeration)', async () => {
      mockFindUnique.mockResolvedValue(null);

      await requestPasswordReset('nonexistent@test.com');

      expect(mockTokenCreate).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should silently return for inactive user', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        isActive: false,
      });

      await requestPasswordReset('user@test.com');

      expect(mockTokenCreate).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should store SHA-256 hash of token, not plaintext', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        isActive: true,
      });
      mockTokenCreate.mockResolvedValue({});

      await requestPasswordReset('user@test.com');

      const createCall = mockTokenCreate.mock.calls[0][0];
      const storedHash = createCall.data.tokenHash;
      // SHA-256 hashes are 64 hex characters
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateResetToken', () => {
    it('should return true for valid, unused, unexpired token', async () => {
      mockTokenFindFirst.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'some-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await validateResetToken('some-uuid-token');
      expect(result).toBe(true);
    });

    it('should return false when no matching token found', async () => {
      mockTokenFindFirst.mockResolvedValue(null);

      const result = await validateResetToken('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should update password and mark token as used in a transaction', async () => {
      mockTokenFindFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'some-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockHash.mockResolvedValue('new-hashed-password');
      mockTransaction.mockResolvedValue([]);

      await resetPassword('some-uuid-token', 'newpassword123');

      expect(mockHash).toHaveBeenCalledWith('newpassword123', 10);
      // $transaction is called with an array of Prisma client promises
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      const transactionArg = mockTransaction.mock.calls[0][0];
      expect(Array.isArray(transactionArg)).toBe(true);
      expect(transactionArg).toHaveLength(2);
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      mockTokenFindFirst.mockResolvedValue(null);

      await expect(resetPassword('bad-token', 'newpassword123')).rejects.toThrow(UnauthorizedError);
      await expect(resetPassword('bad-token', 'newpassword123')).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });
  });

  describe('changePassword', () => {
    it('should update password and set mustChangePassword to false', async () => {
      mockHash.mockResolvedValue('new-hashed-password');
      mockUserUpdate.mockResolvedValue({});

      await changePassword('user-1', 'newpassword123');

      expect(mockHash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordHash: 'new-hashed-password',
          mustChangePassword: false,
        },
      });
    });
  });
});

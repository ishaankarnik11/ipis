import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { UnauthorizedError } from '../lib/errors.js';
import { getCurrentUser } from './auth.service.js';

describe('auth.service', () => {
  beforeEach(async () => {
    await cleanDb();
    await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('getCurrentUser', () => {
    it('should return user data with departmentId and status', async () => {
      const user = await createTestUser('ADMIN', {
        email: 'test@test.com',
        name: 'Test User',
      });

      const result = await getCurrentUser(user.id);

      expect(result).toEqual({
        id: user.id,
        name: 'Test User',
        role: 'ADMIN',
        email: 'test@test.com',
        departmentId: null,
        status: 'ACTIVE',
      });
    });

    it('should return null departmentId when not set', async () => {
      const user = await createTestUser('ADMIN', { email: 'test@test.com' });

      const result = await getCurrentUser(user.id);
      expect(result.departmentId).toBeNull();
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      await expect(getCurrentUser('00000000-0000-4000-8000-000000000001')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('should throw UnauthorizedError for deactivated user', async () => {
      const user = await createTestUser('ADMIN', { email: 'test@test.com', status: 'DEACTIVATED' });

      await expect(getCurrentUser(user.id)).rejects.toThrow(UnauthorizedError);
    });
  });
});

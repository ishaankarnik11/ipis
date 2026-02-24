import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/config.js', () => ({
  config: {
    port: 3000,
    databaseUrl: 'mock://db',
    get jwtSecret() {
      return 'test-secret-key-that-is-long-enough-for-hs256';
    },
    logLevel: 'silent',
    nodeEnv: 'test',
    frontendUrl: 'http://localhost:5173',
  },
}));

import { prisma } from '../lib/prisma.js';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockDeptFindMany = prisma.department.findMany as ReturnType<typeof vi.fn>;

describe('Department Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('correct-password', 10);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loginAs(role: string) {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: `${role.toLowerCase()}@test.com`,
      passwordHash: hashedPassword,
      name: `Test ${role}`,
      role,
      isActive: true,
      departmentId: 'dept-1',
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `${role.toLowerCase()}@test.com`, password: 'correct-password' });

    return res.headers['set-cookie'];
  }

  describe('GET /api/v1/departments', () => {
    it('should return 200 with array of departments for authenticated ADMIN user', async () => {
      const cookies = await loginAs('ADMIN');

      const mockDepartments = [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Finance' },
      ];
      mockDeptFindMany.mockResolvedValue(mockDepartments);

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockDepartments);
      expect(mockDeptFindMany).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/departments');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for non-ADMIN authenticated users', async () => {
      const cookies = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/departments')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

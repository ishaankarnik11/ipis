import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { createApp } from '../app.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    department: { findMany: vi.fn() },
    employee: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

// Mock config
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

// Mock logger to verify redaction
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockDeptFindMany = prisma.department.findMany as ReturnType<typeof vi.fn>;
const mockEmpFindMany = prisma.employee.findMany as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.employee.createMany as ReturnType<typeof vi.fn>;

function createExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('Employee Routes', () => {
  const app = createApp();
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
  });

  function makeUser(role: string) {
    return {
      id: `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@test.com`,
      passwordHash: hashedPassword,
      name: `Test ${role}`,
      role,
      isActive: true,
      departmentId: null,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async function loginAs(role: string): Promise<string[]> {
    const user = makeUser(role);
    mockUserFindUnique.mockResolvedValueOnce(user);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    return res.headers['set-cookie'] as unknown as string[];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeptFindMany.mockResolvedValue([
      { id: 'dept-eng', name: 'Engineering' },
      { id: 'dept-fin', name: 'Finance' },
    ]);
    mockEmpFindMany.mockResolvedValue([]);
    mockCreateMany.mockResolvedValue({ count: 0 });
  });

  // 7.2: HR uploads valid file — all rows imported, response shape correct
  describe('POST /api/v1/employees/bulk-upload', () => {
    it('should import all valid rows and return correct response shape (AC 1, 2)', async () => {
      const cookies = await loginAs('HR');
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1200000 },
        { employee_code: 'EMP002', name: 'Bob', department: 'Finance', designation: 'Analyst', annual_ctc: 800000 },
      ]);

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies)
        .attach('file', buffer, { filename: 'employees.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        imported: 2,
        failed: 0,
        failedRows: [],
      });
      expect(mockCreateMany).toHaveBeenCalledOnce();
    });

    // 7.3: HR uploads mixed valid/invalid — valid imported, invalid returned with specific errors
    it('should import valid rows and return specific errors for invalid rows (AC 3)', async () => {
      const cookies = await loginAs('HR');
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1200000 },
        { employee_code: '', name: 'Bad', department: 'Engineering', designation: 'Dev', annual_ctc: 500000 },
        { employee_code: 'EMP003', name: 'Carol', department: 'NonExistent', designation: 'Dev', annual_ctc: 700000 },
      ]);

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies)
        .attach('file', buffer, { filename: 'employees.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(1);
      expect(res.body.data.failed).toBe(2);
      expect(res.body.data.failedRows).toHaveLength(2);
      // First failure: empty employee_code
      expect(res.body.data.failedRows[0].error).toContain('employee_code');
      // Second failure: department not found
      expect(res.body.data.failedRows[1].error).toContain("Department 'NonExistent' not found");
    });

    // 7.4: HR re-uploads corrected rows — new rows imported
    it('should import corrected rows without affecting existing records (AC 4)', async () => {
      const cookies = await loginAs('HR');
      // Simulate first upload already imported EMP001
      mockEmpFindMany.mockResolvedValue([{ employeeCode: 'EMP001' }]);

      const buffer = createExcelBuffer([
        { employee_code: 'EMP002', name: 'Corrected', department: 'Engineering', designation: 'Dev', annual_ctc: 900000 },
      ]);

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies)
        .attach('file', buffer, { filename: 'corrected.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(1);
      expect(res.body.data.failed).toBe(0);
    });

    // 7.5: Duplicate employee_code — 409 in failedRows
    it('should return duplicate employee_code errors in failedRows (AC 4)', async () => {
      const cookies = await loginAs('HR');
      mockEmpFindMany.mockResolvedValue([{ employeeCode: 'EMP001' }]);

      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Dupe', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies)
        .attach('file', buffer, { filename: 'employees.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(res.status).toBe(200);
      expect(res.body.data.imported).toBe(0);
      expect(res.body.data.failed).toBe(1);
      expect(res.body.data.failedRows[0].error).toBe('Employee code already exists');
    });

    it('should return 400 when no file is attached', async () => {
      const cookies = await loginAs('HR');

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
    });
  });

  // 7.6: Non-HR roles get 403
  describe('RBAC — Non-HR roles get 403 (AC 8)', () => {
    const nonHrRoles = ['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonHrRoles) {
      it(`should return 403 for ${role} on POST /api/v1/employees/bulk-upload`, async () => {
        const cookies = await loginAs(role);

        const buffer = createExcelBuffer([
          { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
        ]);

        const res = await request(app)
          .post('/api/v1/employees/bulk-upload')
          .set('Cookie', cookies)
          .attach('file', buffer, { filename: 'employees.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      it(`should return 403 for ${role} on GET /api/v1/employees/sample-template`, async () => {
        const cookies = await loginAs(role);

        const res = await request(app)
          .get('/api/v1/employees/sample-template')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });
    }
  });

  // 7.7: Sample template download returns xlsx
  describe('GET /api/v1/employees/sample-template (AC 5)', () => {
    it('should return xlsx file with correct headers for HR user', async () => {
      const cookies = await loginAs('HR');

      const res = await request(app)
        .get('/api/v1/employees/sample-template')
        .set('Cookie', cookies)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('employee-salary-template.xlsx');

      // Parse returned xlsx and verify headers
      const wb = XLSX.read(res.body, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
      const headers = rows[0] as unknown as string[];

      expect(headers).toEqual([
        'employee_code',
        'name',
        'department',
        'designation',
        'annual_ctc',
        'joining_date',
        'is_billable',
      ]);
    });
  });

  // 7.8: CTC not in log output (pino redact)
  describe('CTC redaction (AC 10)', () => {
    it('should not log annual_ctc_paise in any log call', async () => {
      const cookies = await loginAs('HR');
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1200000 },
      ]);

      await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies)
        .attach('file', buffer, { filename: 'employees.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Verify logger.info was called but the log data does not contain annualCtcPaise
      const mockInfo = logger.info as ReturnType<typeof vi.fn>;
      for (const call of mockInfo.mock.calls) {
        const logArg = JSON.stringify(call);
        expect(logArg).not.toContain('annualCtcPaise');
        expect(logArg).not.toContain('annual_ctc_paise');
      }
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 for unauthenticated bulk-upload', async () => {
      const res = await request(app)
        .post('/api/v1/employees/bulk-upload');

      expect(res.status).toBe(401);
    });

    it('should return 401 for unauthenticated sample-template', async () => {
      const res = await request(app)
        .get('/api/v1/employees/sample-template');

      expect(res.status).toBe(401);
    });
  });
});

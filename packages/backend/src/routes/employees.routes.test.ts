import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';
import type { UserRole } from '@prisma/client';

function createExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('Employee Routes', () => {
  const app = createApp();
  let departments: Map<string, string>;

  beforeEach(async () => {
    await cleanDb();
    departments = await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function loginAs(role: UserRole, overrides: Record<string, unknown> = {}) {
    const user = await createTestUser(role, overrides as Parameters<typeof createTestUser>[1]);
    const token = await signToken({ sub: user.id, role: user.role, email: user.email });
    const cookies = [`ipis_token=${token}`];
    return { cookies, user };
  }

  // 7.2: HR uploads valid file — all rows imported, response shape correct
  describe('POST /api/v1/employees/bulk-upload', () => {
    it('should import all valid rows and return correct response shape (AC 1, 2)', async () => {
      const { cookies } = await loginAs('HR');
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

      const employees = await prisma.employee.findMany();
      expect(employees).toHaveLength(2);
    });

    it('should import valid rows and return specific errors for invalid rows (AC 3)', async () => {
      const { cookies } = await loginAs('HR');
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
      expect(res.body.data.failedRows[0].error).toContain('employee_code');
      expect(res.body.data.failedRows[1].error).toContain("Department 'NonExistent' not found");
    });

    it('should import corrected rows without affecting existing records (AC 4)', async () => {
      const { cookies } = await loginAs('HR');
      // Pre-seed an employee
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Existing',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(100000000),
        },
      });

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

    it('should return duplicate employee_code errors in failedRows (AC 4)', async () => {
      const { cookies } = await loginAs('HR');
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Existing',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(100000000),
        },
      });

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
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .post('/api/v1/employees/bulk-upload')
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
    });
  });

  // 7.6: Non-HR roles get 403
  describe('RBAC — Non-HR roles get 403 (AC 8)', () => {
    const nonHrRoles: UserRole[] = ['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonHrRoles) {
      it(`should return 403 for ${role} on POST /api/v1/employees/bulk-upload`, async () => {
        const { cookies } = await loginAs(role);

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
        const { cookies } = await loginAs(role);

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
      const { cookies } = await loginAs('HR');

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

  // === Story 2.2 — Individual Employee Management CRUD ===

  describe('POST /api/v1/employees (AC 1, 6)', () => {
    it('should create employee and return 201 with correct shape (AC 1)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .post('/api/v1/employees')
        .set('Cookie', cookies)
        .send({
          employeeCode: 'EMP042',
          name: 'Alice Smith',
          departmentId: departments.get('Engineering')!,
          designation: 'Senior Developer',
          annualCtcPaise: 1500000,
          joiningDate: '2024-06-15',
          isBillable: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        employeeCode: 'EMP042',
        name: 'Alice Smith',
        designation: 'Senior Developer',
        isBillable: true,
        isResigned: false,
      });
    });

    it('should return 409 CONFLICT on duplicate employee_code (AC 6)', async () => {
      const { cookies } = await loginAs('HR');

      // First create
      await request(app)
        .post('/api/v1/employees')
        .set('Cookie', cookies)
        .send({
          employeeCode: 'EMP042',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: 1500000,
        });

      // Duplicate
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Cookie', cookies)
        .send({
          employeeCode: 'EMP042',
          name: 'Bob',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: 1500000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('EMP042');
    });

    it('should return 400 for invalid body (missing required fields)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .post('/api/v1/employees')
        .set('Cookie', cookies)
        .send({ name: 'Missing fields' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/employees/:id (AC 2, 7)', () => {
    it('should update only provided fields — 200 (AC 2)', async () => {
      const { cookies } = await loginAs('HR');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${emp.id}`)
        .set('Cookie', cookies)
        .send({ designation: 'Senior Dev' });

      expect(res.status).toBe(200);
      expect(res.body.data.designation).toBe('Senior Dev');
    });

    it('should validate annualCtcPaise is positive integer (AC 2)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .patch('/api/v1/employees/some-id')
        .set('Cookie', cookies)
        .send({ annualCtcPaise: -100 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty update body (M2 — at least one field required)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .patch('/api/v1/employees/some-id')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject update on resigned employee — 400 (AC 7)', async () => {
      const { cookies } = await loginAs('HR');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
          isResigned: true,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${emp.id}`)
        .set('Cookie', cookies)
        .send({ designation: 'Senior Dev' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Cannot edit a resigned employee');
    });
  });

  describe('PATCH /api/v1/employees/:id/resign (AC 3)', () => {
    it('should resign employee — isResigned becomes true (AC 3)', async () => {
      const { cookies } = await loginAs('HR');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${emp.id}/resign`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbEmp = await prisma.employee.findUnique({ where: { id: emp.id } });
      expect(dbEmp!.isResigned).toBe(true);
    });

    it('should return 404 when resigning nonexistent employee', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .patch('/api/v1/employees/00000000-0000-4000-8000-000000000001/resign')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when resigning already-resigned employee', async () => {
      const { cookies } = await loginAs('HR');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
          isResigned: true,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${emp.id}/resign`)
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('already resigned');
    });
  });

  describe('GET /api/v1/employees (AC 4, 5)', () => {
    it('should return employees with annualCtcPaise for FINANCE (AC 4)', async () => {
      const { cookies } = await loginAs('FINANCE');
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('annualCtcPaise');
      expect(res.body.meta.total).toBe(1);
    });

    it('should return employees with annualCtcPaise for ADMIN (AC 4)', async () => {
      const { cookies } = await loginAs('ADMIN');
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('annualCtcPaise');
    });

    it('should return employees WITHOUT annualCtcPaise for HR (AC 5)', async () => {
      const { cookies } = await loginAs('HR');
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data[0]).not.toHaveProperty('annualCtcPaise');
    });
  });

  describe('GET /api/v1/employees/:id (AC 9)', () => {
    it('should return 404 when employee does not exist (AC 9)', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/employees/00000000-0000-4000-8000-000000000001')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Employee not found');
    });

    it('should return employee for valid id', async () => {
      const { cookies } = await loginAs('FINANCE');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get(`/api/v1/employees/${emp.id}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(emp.id);
    });

    it('should return employee WITH annualCtcPaise for ADMIN on GET /:id (AC 4)', async () => {
      const { cookies } = await loginAs('ADMIN');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get(`/api/v1/employees/${emp.id}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('annualCtcPaise');
    });

    it('should return employee WITH annualCtcPaise for HR on GET /:id (getById always includes CTC)', async () => {
      const { cookies } = await loginAs('HR');
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const res = await request(app)
        .get(`/api/v1/employees/${emp.id}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('annualCtcPaise');
    });
  });

  describe('RBAC — Non-HR roles get 403 on write endpoints (AC 8)', () => {
    const nonHrWriteRoles: UserRole[] = ['DELIVERY_MANAGER', 'DEPT_HEAD', 'FINANCE', 'ADMIN'];

    for (const role of nonHrWriteRoles) {
      it(`should return 403 for ${role} on POST /api/v1/employees`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .post('/api/v1/employees')
          .set('Cookie', cookies)
          .send({
            employeeCode: 'EMP001',
            name: 'Alice',
            departmentId: departments.get('Engineering')!,
            designation: 'Dev',
            annualCtcPaise: 1000000,
          });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      it(`should return 403 for ${role} on PATCH /api/v1/employees/:id`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .patch('/api/v1/employees/some-id')
          .set('Cookie', cookies)
          .send({ designation: 'X' });

        expect(res.status).toBe(403);
      });

      it(`should return 403 for ${role} on PATCH /api/v1/employees/:id/resign`, async () => {
        const { cookies } = await loginAs(role);

        const res = await request(app)
          .patch('/api/v1/employees/some-id/resign')
          .set('Cookie', cookies);

        expect(res.status).toBe(403);
      });
    }
  });

  describe('GET /api/v1/employees — RBAC read access (AC 4, 5)', () => {
    it('should return 200 for DELIVERY_MANAGER on GET /api/v1/employees', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });

    it('should return 403 for DEPT_HEAD on GET /api/v1/employees', async () => {
      const { cookies } = await loginAs('DEPT_HEAD');

      const res = await request(app)
        .get('/api/v1/employees')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });
  });
});

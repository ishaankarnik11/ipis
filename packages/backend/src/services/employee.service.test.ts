import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import * as employeeService from './employee.service.js';

function createExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('employee.service', () => {
  let departments: Map<string, string>;

  beforeEach(async () => {
    await cleanDb();
    departments = await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('bulkUpload', () => {
    it('should import all valid rows', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1200000 },
        { employee_code: 'EMP002', name: 'Bob', department: 'Finance', designation: 'Analyst', annual_ctc: 800000 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.failedRows).toHaveLength(0);

      // Verify in DB
      const employees = await prisma.employee.findMany();
      expect(employees).toHaveLength(2);
      expect(employees.find((e) => e.employeeCode === 'EMP001')!.annualCtcPaise).toBe(BigInt(120000000));
    });

    it('should handle mixed valid and invalid rows', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1200000 },
        { employee_code: '', name: 'Bad', department: 'Engineering', designation: 'Dev', annual_ctc: 500000 },
        { employee_code: 'EMP003', name: 'Carol', department: 'NonExistent', designation: 'Dev', annual_ctc: 700000 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.failedRows).toHaveLength(2);
      expect(result.failedRows[0]!.row).toBe(3);
      expect(result.failedRows[0]!.error).toContain('employee_code');
      expect(result.failedRows[1]!.row).toBe(4);
      expect(result.failedRows[1]!.error).toContain("Department 'NonExistent' not found");
    });

    it('should detect duplicate employee codes against existing records', async () => {
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
        { employee_code: 'EMP001', name: 'Dupe', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
        { employee_code: 'EMP002', name: 'New', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failedRows[0]!.employeeCode).toBe('EMP001');
      expect(result.failedRows[0]!.error).toBe('Employee code already exists');
    });

    it('should detect duplicate employee codes within the same batch', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'First', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
        { employee_code: 'EMP001', name: 'Second', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failedRows[0]!.error).toBe('Duplicate employee code in upload');
    });

    it('should not insert when no valid rows exist', async () => {
      const buffer = createExcelBuffer([
        { employee_code: '', name: '', department: '', designation: '', annual_ctc: -1 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);

      const employees = await prisma.employee.findMany();
      expect(employees).toHaveLength(0);
    });

    it('should handle missing required fields with specific error messages', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: '', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.failed).toBe(1);
      expect(result.failedRows[0]!.error).toContain('name');
    });

    it('should convert annual_ctc to paise (multiply by 100)', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1500000 },
      ]);

      await employeeService.bulkUpload(buffer);

      const emp = await prisma.employee.findUnique({ where: { employeeCode: 'EMP001' } });
      expect(emp!.annualCtcPaise).toBe(BigInt(150000000));
    });

    it('should handle optional fields with defaults', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      await employeeService.bulkUpload(buffer);

      const emp = await prisma.employee.findUnique({ where: { employeeCode: 'EMP001' } });
      expect(emp!.isBillable).toBe(true);
      expect(emp!.joiningDate).toBeNull();
    });

    it('should handle joining_date parsing', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000, joining_date: '2024-06-15' },
      ]);

      await employeeService.bulkUpload(buffer);

      const emp = await prisma.employee.findUnique({ where: { employeeCode: 'EMP001' } });
      expect(emp!.joiningDate).toBeInstanceOf(Date);
    });
  });

  describe('createEmployee', () => {
    const makeValidInput = (deptId: string) => ({
      employeeCode: 'EMP001',
      name: 'Alice Smith',
      departmentId: deptId,
      designation: 'Senior Developer',
      annualCtcPaise: 1500000,
      joiningDate: '2024-06-15',
      isBillable: true,
    });

    it('should create an employee and return data', async () => {
      const result = await employeeService.createEmployee(
        makeValidInput(departments.get('Engineering')!),
      );

      expect(result).toMatchObject({
        employeeCode: 'EMP001',
        name: 'Alice Smith',
        designation: 'Senior Developer',
        isBillable: true,
        isResigned: false,
      });
      expect(result.id).toBeDefined();
    });

    it('should throw ConflictError on duplicate employee_code', async () => {
      await employeeService.createEmployee(makeValidInput(departments.get('Engineering')!));

      await expect(
        employeeService.createEmployee(makeValidInput(departments.get('Engineering')!)),
      ).rejects.toThrow('Employee code EMP001 already exists');
    });

    it('should throw ValidationError on non-existent departmentId (P2003)', async () => {
      await expect(
        employeeService.createEmployee(
          makeValidInput('00000000-0000-4000-8000-000000000001'),
        ),
      ).rejects.toThrow('Department not found');
    });

    it('should handle joiningDate as null when not provided', async () => {
      const input = { ...makeValidInput(departments.get('Engineering')!), joiningDate: undefined };

      const result = await employeeService.createEmployee(input);

      const emp = await prisma.employee.findUnique({ where: { id: result.id } });
      expect(emp!.joiningDate).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return employees with annualCtcPaise for FINANCE role', async () => {
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.getAll({ id: 'u1', role: 'FINANCE', email: 'f@t.com' });

      expect(result[0]).toHaveProperty('annualCtcPaise');
    });

    it('should return employees with annualCtcPaise for ADMIN role', async () => {
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.getAll({ id: 'u1', role: 'ADMIN', email: 'a@t.com' });

      expect(result[0]).toHaveProperty('annualCtcPaise');
    });

    it('should return employees WITHOUT annualCtcPaise for HR role', async () => {
      await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.getAll({ id: 'u1', role: 'HR', email: 'h@t.com' });

      expect(result[0]).not.toHaveProperty('annualCtcPaise');
    });
  });

  describe('getById', () => {
    it('should return employee by id for FINANCE role', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.getById(emp.id, { id: 'u1', role: 'FINANCE', email: 'f@t.com' });

      expect(result).toHaveProperty('annualCtcPaise');
      expect(result.id).toBe(emp.id);
    });

    it('should return employee WITH annualCtcPaise for HR role (getById always includes CTC)', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.getById(emp.id, { id: 'u1', role: 'HR', email: 'h@t.com' });

      expect(result).toHaveProperty('annualCtcPaise');
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      await expect(
        employeeService.getById('00000000-0000-4000-8000-000000000001', {
          id: 'u1',
          role: 'FINANCE',
          email: 'f@t.com',
        }),
      ).rejects.toThrow('Employee not found');
    });
  });

  describe('updateEmployee', () => {
    it('should update only provided fields', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      const result = await employeeService.updateEmployee(emp.id, { designation: 'Senior Dev' });

      expect(result.designation).toBe('Senior Dev');
    });

    it('should reject update on resigned employee', async () => {
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

      await expect(
        employeeService.updateEmployee(emp.id, { designation: 'Senior Dev' }),
      ).rejects.toThrow('Cannot edit a resigned employee');
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      await expect(
        employeeService.updateEmployee('00000000-0000-4000-8000-000000000001', {
          designation: 'X',
        }),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError on non-existent departmentId (P2003)', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      await expect(
        employeeService.updateEmployee(emp.id, {
          departmentId: '00000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow('Department not found');
    });
  });

  describe('resignEmployee', () => {
    it('should set isResigned to true', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Alice',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
        },
      });

      await employeeService.resignEmployee(emp.id);

      const dbEmp = await prisma.employee.findUnique({ where: { id: emp.id } });
      expect(dbEmp!.isResigned).toBe(true);
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      await expect(
        employeeService.resignEmployee('00000000-0000-4000-8000-000000000001'),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError when employee is already resigned', async () => {
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

      await expect(employeeService.resignEmployee(emp.id)).rejects.toThrow(
        'Employee is already resigned',
      );
    });
  });
});

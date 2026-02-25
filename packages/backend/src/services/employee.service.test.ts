import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma: Record<string, unknown> = {
    department: { findMany: vi.fn() },
    employee: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  mockPrisma.$transaction = vi.fn((fn: Function) => fn(mockPrisma));
  return { prisma: mockPrisma };
});

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import * as employeeService from './employee.service.js';

const mockDeptFindMany = prisma.department.findMany as ReturnType<typeof vi.fn>;
const mockEmpFindMany = prisma.employee.findMany as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.employee.createMany as ReturnType<typeof vi.fn>;
const mockCreate = prisma.employee.create as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.employee.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.employee.update as ReturnType<typeof vi.fn>;

function createExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('employee.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeptFindMany.mockResolvedValue([
      { id: 'dept-eng', name: 'Engineering' },
      { id: 'dept-fin', name: 'Finance' },
    ]);
    mockEmpFindMany.mockResolvedValue([]);
    mockCreateMany.mockImplementation((args: { data: unknown[] }) =>
      Promise.resolve({ count: args.data.length }),
    );
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
      expect(mockCreateMany).toHaveBeenCalledOnce();
      const createArg = mockCreateMany.mock.calls[0][0];
      expect(createArg.data).toHaveLength(2);
      expect(createArg.data[0].employeeCode).toBe('EMP001');
      expect(createArg.data[0].annualCtcPaise).toBe(BigInt(120000000));
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
      expect(result.failedRows[0]!.row).toBe(3); // row 3 (empty employee_code)
      expect(result.failedRows[0]!.error).toContain('employee_code');
      expect(result.failedRows[1]!.row).toBe(4); // row 4 (bad department)
      expect(result.failedRows[1]!.error).toContain("Department 'NonExistent' not found");
    });

    it('should detect duplicate employee codes against existing records', async () => {
      mockEmpFindMany.mockResolvedValue([{ employeeCode: 'EMP001' }]);

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

    it('should not call createMany when no valid rows exist', async () => {
      const buffer = createExcelBuffer([
        { employee_code: '', name: '', department: '', designation: '', annual_ctc: -1 },
      ]);

      const result = await employeeService.bulkUpload(buffer);

      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockCreateMany).not.toHaveBeenCalled();
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

      const data = mockCreateMany.mock.calls[0][0].data;
      expect(data[0].annualCtcPaise).toBe(BigInt(150000000));
    });

    it('should handle optional fields with defaults', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000 },
      ]);

      await employeeService.bulkUpload(buffer);

      const data = mockCreateMany.mock.calls[0][0].data;
      expect(data[0].isBillable).toBe(true);
      expect(data[0].joiningDate).toBeNull();
    });

    it('should handle joining_date parsing', async () => {
      const buffer = createExcelBuffer([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Dev', annual_ctc: 1000000, joining_date: '2024-06-15' },
      ]);

      await employeeService.bulkUpload(buffer);

      const data = mockCreateMany.mock.calls[0][0].data;
      expect(data[0].joiningDate).toBeInstanceOf(Date);
    });
  });

  describe('createEmployee', () => {
    const validInput = {
      employeeCode: 'EMP001',
      name: 'Alice Smith',
      departmentId: 'dept-eng',
      designation: 'Senior Developer',
      annualCtcPaise: 1500000,
      joiningDate: '2024-06-15',
      isBillable: true,
    };

    const createdEmployee = {
      id: 'emp-uuid-1',
      employeeCode: 'EMP001',
      name: 'Alice Smith',
      departmentId: 'dept-eng',
      designation: 'Senior Developer',
      annualCtcPaise: BigInt(1500000),
      joiningDate: new Date('2024-06-15'),
      isBillable: true,
      isResigned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create an employee and return data', async () => {
      mockCreate.mockResolvedValue(createdEmployee);

      const result = await employeeService.createEmployee(validInput);

      expect(result).toMatchObject({
        id: 'emp-uuid-1',
        employeeCode: 'EMP001',
        name: 'Alice Smith',
        designation: 'Senior Developer',
        isBillable: true,
        isResigned: false,
      });
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('should throw ConflictError on duplicate employee_code', async () => {
      const prismaError = new Error('Unique constraint failed');
      Object.assign(prismaError, { code: 'P2002', meta: { target: ['employee_code'] } });
      mockCreate.mockRejectedValue(prismaError);

      await expect(employeeService.createEmployee(validInput)).rejects.toThrow(
        'Employee code EMP001 already exists',
      );
    });

    it('should throw ValidationError on non-existent departmentId (P2003)', async () => {
      const prismaError = new Error('Foreign key constraint failed');
      Object.assign(prismaError, { code: 'P2003', meta: { field_name: 'department_id' } });
      mockCreate.mockRejectedValue(prismaError);

      await expect(employeeService.createEmployee(validInput)).rejects.toThrow(
        'Department not found',
      );
    });

    it('should handle joiningDate as null when not provided', async () => {
      const inputNoDate = { ...validInput, joiningDate: undefined };
      mockCreate.mockResolvedValue({ ...createdEmployee, joiningDate: null });

      await employeeService.createEmployee(inputNoDate);

      const createCall = mockCreate.mock.calls[0]![0];
      expect(createCall.data.joiningDate).toBeNull();
    });
  });

  describe('getAll', () => {
    const employees = [
      {
        id: 'emp-1',
        employeeCode: 'EMP001',
        name: 'Alice',
        designation: 'Dev',
        departmentId: 'dept-eng',
        annualCtcPaise: BigInt(1500000),
        isBillable: true,
        isResigned: false,
      },
    ];

    it('should return employees with annualCtcPaise for FINANCE role', async () => {
      mockEmpFindMany.mockResolvedValue(employees);

      const result = await employeeService.getAll({ id: 'u1', role: 'FINANCE', email: 'f@t.com' });

      expect(result[0]).toHaveProperty('annualCtcPaise');
    });

    it('should return employees with annualCtcPaise for ADMIN role', async () => {
      mockEmpFindMany.mockResolvedValue(employees);

      const result = await employeeService.getAll({ id: 'u1', role: 'ADMIN', email: 'a@t.com' });

      expect(result[0]).toHaveProperty('annualCtcPaise');
    });

    it('should return employees WITHOUT annualCtcPaise for HR role', async () => {
      // For HR, service should use a select that omits annualCtcPaise
      mockEmpFindMany.mockResolvedValue(
        employees.map(({ annualCtcPaise: _ctc, ...rest }) => rest),
      );

      const result = await employeeService.getAll({ id: 'u1', role: 'HR', email: 'h@t.com' });

      expect(result[0]).not.toHaveProperty('annualCtcPaise');
    });
  });

  describe('getById', () => {
    const employee = {
      id: 'emp-1',
      employeeCode: 'EMP001',
      name: 'Alice',
      designation: 'Dev',
      departmentId: 'dept-eng',
      annualCtcPaise: BigInt(1500000),
      isBillable: true,
      isResigned: false,
    };

    it('should return employee by id for FINANCE role', async () => {
      mockFindUnique.mockResolvedValue(employee);

      const result = await employeeService.getById('emp-1', { id: 'u1', role: 'FINANCE', email: 'f@t.com' });

      expect(result).toHaveProperty('annualCtcPaise');
      expect(result.id).toBe('emp-1');
    });

    it('should return employee WITH annualCtcPaise for HR role (getById always includes CTC)', async () => {
      mockFindUnique.mockResolvedValue(employee);

      const result = await employeeService.getById('emp-1', { id: 'u1', role: 'HR', email: 'h@t.com' });

      expect(result).toHaveProperty('annualCtcPaise');
      expect(result.id).toBe('emp-1');
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        employeeService.getById('nonexistent', { id: 'u1', role: 'FINANCE', email: 'f@t.com' }),
      ).rejects.toThrow('Employee not found');
    });
  });

  describe('updateEmployee', () => {
    const existingEmployee = {
      id: 'emp-1',
      employeeCode: 'EMP001',
      name: 'Alice',
      designation: 'Dev',
      departmentId: 'dept-eng',
      annualCtcPaise: BigInt(1500000),
      isBillable: true,
      isResigned: false,
    };

    it('should update only provided fields', async () => {
      mockFindUnique.mockResolvedValue(existingEmployee);
      mockUpdate.mockResolvedValue({ ...existingEmployee, designation: 'Senior Dev' });

      const result = await employeeService.updateEmployee('emp-1', { designation: 'Senior Dev' });

      expect(result.designation).toBe('Senior Dev');
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('should reject update on resigned employee', async () => {
      mockFindUnique.mockResolvedValue({ ...existingEmployee, isResigned: true });

      await expect(
        employeeService.updateEmployee('emp-1', { designation: 'Senior Dev' }),
      ).rejects.toThrow('Cannot edit a resigned employee');
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        employeeService.updateEmployee('nonexistent', { designation: 'X' }),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError on non-existent departmentId (P2003)', async () => {
      mockFindUnique.mockResolvedValue(existingEmployee);
      const prismaError = new Error('Foreign key constraint failed');
      Object.assign(prismaError, { code: 'P2003' });
      mockUpdate.mockRejectedValue(prismaError);

      await expect(
        employeeService.updateEmployee('emp-1', { departmentId: 'nonexistent-uuid' }),
      ).rejects.toThrow('Department not found');
    });
  });

  describe('resignEmployee', () => {
    const existingEmployee = {
      id: 'emp-1',
      employeeCode: 'EMP001',
      name: 'Alice',
      isResigned: false,
    };

    it('should set isResigned to true', async () => {
      mockFindUnique.mockResolvedValue(existingEmployee);
      mockUpdate.mockResolvedValue({ ...existingEmployee, isResigned: true });

      await employeeService.resignEmployee('emp-1');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { isResigned: true },
      });
    });

    it('should throw NotFoundError when employee does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(employeeService.resignEmployee('nonexistent')).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError when employee is already resigned', async () => {
      mockFindUnique.mockResolvedValue({ id: 'emp-1', isResigned: true });

      await expect(employeeService.resignEmployee('emp-1')).rejects.toThrow(
        'Employee is already resigned',
      );
    });
  });
});

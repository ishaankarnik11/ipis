import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    department: { findMany: vi.fn() },
    employee: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import * as employeeService from './employee.service.js';

const mockDeptFindMany = prisma.department.findMany as ReturnType<typeof vi.fn>;
const mockEmpFindMany = prisma.employee.findMany as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.employee.createMany as ReturnType<typeof vi.fn>;

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
    mockCreateMany.mockResolvedValue({ count: 0 });
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
});

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelToRows, generateSampleTemplate } from './excel.js';

function createTestExcel(rows: Record<string, unknown>[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

describe('excel utilities', () => {
  describe('parseExcelToRows', () => {
    it('should parse valid Excel buffer into rows', () => {
      const buffer = createTestExcel([
        { employee_code: 'EMP001', name: 'Alice', department: 'Engineering', designation: 'Developer', annual_ctc: 1200000 },
        { employee_code: 'EMP002', name: 'Bob', department: 'Finance', designation: 'Analyst', annual_ctc: 800000 },
      ]);

      const rows = parseExcelToRows(buffer);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        employee_code: 'EMP001',
        name: 'Alice',
        department: 'Engineering',
        designation: 'Developer',
        annual_ctc: 1200000,
      });
      expect(rows[1]).toMatchObject({
        employee_code: 'EMP002',
        name: 'Bob',
      });
    });

    it('should return empty array for empty sheet', () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([['employee_code', 'name']]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

      const rows = parseExcelToRows(buffer);
      expect(rows).toHaveLength(0);
    });

    it('should handle boolean and date fields', () => {
      const buffer = createTestExcel([
        { employee_code: 'EMP003', name: 'Carol', department: 'HR', designation: 'Manager', annual_ctc: 1500000, is_billable: false, joining_date: '2024-01-15' },
      ]);

      const rows = parseExcelToRows(buffer);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.is_billable).toBe(false);
      expect(rows[0]!.joining_date).toBe('2024-01-15');
    });
  });

  describe('generateSampleTemplate', () => {
    it('should generate a valid xlsx buffer', () => {
      const buffer = generateSampleTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should contain correct column headers', () => {
      const buffer = generateSampleTemplate();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
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

    it('should have no data rows (header only)', () => {
      const buffer = generateSampleTemplate();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      const rows = XLSX.utils.sheet_to_json(sheet);

      expect(rows).toHaveLength(0);
    });
  });
});

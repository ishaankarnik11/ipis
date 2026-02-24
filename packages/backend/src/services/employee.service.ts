import { employeeRowSchema } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { parseExcelToRows } from '../lib/excel.js';
import { logger } from '../lib/logger.js';

interface FailedRow {
  row: number;
  employeeCode: string;
  error: string;
}

export async function bulkUpload(buffer: Buffer) {
  const rows = parseExcelToRows(buffer);

  // Load all departments for name → id lookup
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));

  // Load existing employee codes for duplicate detection
  const existingCodes = new Set(
    (await prisma.employee.findMany({ select: { employeeCode: true } })).map((e) => e.employeeCode),
  );

  const validRows: Array<{
    employeeCode: string;
    name: string;
    departmentId: string;
    designation: string;
    annualCtcPaise: bigint;
    joiningDate: Date | null;
    isBillable: boolean;
  }> = [];
  const failedRows: FailedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 for 1-indexed + header row
    const raw = rows[i]!;

    // Coerce is_billable from string/number to boolean if needed
    let isBillableValue = raw.is_billable;
    if (typeof isBillableValue === 'string') {
      isBillableValue = isBillableValue.toLowerCase() === 'true' || isBillableValue === '1';
    } else if (typeof isBillableValue === 'number') {
      isBillableValue = isBillableValue === 1;
    }

    // Coerce annual_ctc to number if string
    let annualCtcValue = raw.annual_ctc;
    if (typeof annualCtcValue === 'string') {
      annualCtcValue = Number(annualCtcValue);
    }

    const parsed = employeeRowSchema.safeParse({
      ...raw,
      annual_ctc: annualCtcValue,
      is_billable: isBillableValue,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!;
      failedRows.push({
        row: rowNum,
        employeeCode: String(raw.employee_code ?? ''),
        error: firstIssue.message,
      });
      continue;
    }

    const data = parsed.data;

    // Check department exists
    const deptId = deptMap.get(data.department.toLowerCase());
    if (!deptId) {
      failedRows.push({
        row: rowNum,
        employeeCode: data.employee_code,
        error: `Department '${data.department}' not found`,
      });
      continue;
    }

    // Check duplicate employee code
    if (existingCodes.has(data.employee_code)) {
      failedRows.push({
        row: rowNum,
        employeeCode: data.employee_code,
        error: 'Employee code already exists',
      });
      continue;
    }

    // Check duplicate within the same upload batch
    if (validRows.some((r) => r.employeeCode === data.employee_code)) {
      failedRows.push({
        row: rowNum,
        employeeCode: data.employee_code,
        error: 'Duplicate employee code in upload',
      });
      continue;
    }

    validRows.push({
      employeeCode: data.employee_code,
      name: data.name,
      departmentId: deptId,
      designation: data.designation,
      annualCtcPaise: BigInt(Math.round(data.annual_ctc * 100)),
      joiningDate: data.joining_date ? new Date(data.joining_date) : null,
      isBillable: data.is_billable,
    });
  }

  if (validRows.length > 0) {
    await prisma.employee.createMany({ data: validRows });
  }

  logger.info({ imported: validRows.length, failed: failedRows.length }, 'Bulk upload completed');

  return {
    imported: validRows.length,
    failed: failedRows.length,
    failedRows,
  };
}

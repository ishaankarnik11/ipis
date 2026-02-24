import { employeeRowSchema, type CreateEmployeeInput, type UpdateEmployeeInput } from '@ipis/shared';
import type { UserRole } from '@ipis/shared';
import { prisma } from '../lib/prisma.js';
import { parseExcelToRows } from '../lib/excel.js';
import { logger } from '../lib/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}

/** Convert BigInt fields to Number for JSON serialization. Preserves input type shape. */
function serializeEmployee<T extends Record<string, unknown>>(emp: T): T {
  const result = { ...emp };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'bigint') {
      (result as Record<string, unknown>)[key] = Number(result[key]);
    }
  }
  return result;
}

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

  let importedCount = 0;
  if (validRows.length > 0) {
    const { count } = await prisma.employee.createMany({
      data: validRows,
      skipDuplicates: true,
    });
    importedCount = count;
  }

  const skipped = validRows.length - importedCount;
  logger.info({ imported: importedCount, failed: failedRows.length, skipped }, 'Bulk upload completed');

  return {
    imported: importedCount,
    failed: failedRows.length + skipped,
    failedRows,
  };
}

const baseSelect = {
  id: true,
  employeeCode: true,
  name: true,
  designation: true,
  departmentId: true,
  isBillable: true,
  isResigned: true,
} as const;

const selectWithCtc = {
  ...baseSelect,
  annualCtcPaise: true,
  joiningDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

const selectWithoutCtc = {
  ...baseSelect,
  joiningDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

function selectForRole(role: UserRole) {
  return role === 'HR' ? selectWithoutCtc : selectWithCtc;
}

export async function createEmployee(input: CreateEmployeeInput) {
  try {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: input.employeeCode,
        name: input.name,
        departmentId: input.departmentId,
        designation: input.designation,
        annualCtcPaise: BigInt(input.annualCtcPaise),
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
        isBillable: input.isBillable,
      },
    });

    return serializeEmployee({
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      designation: employee.designation,
      annualCtcPaise: employee.annualCtcPaise,
      isBillable: employee.isBillable,
      isResigned: employee.isResigned,
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const prismaErr = err as { code: string };
      if (prismaErr.code === 'P2002') {
        throw new ConflictError(`Employee code ${input.employeeCode} already exists`);
      }
      if (prismaErr.code === 'P2003') {
        throw new ValidationError('Department not found');
      }
    }
    throw err;
  }
}

export async function getAll(user: AuthUser) {
  const employees = await prisma.employee.findMany({
    select: selectForRole(user.role),
    orderBy: { employeeCode: 'asc' },
  });
  return employees.map(serializeEmployee);
}

export async function getById(id: string, user: AuthUser) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: selectForRole(user.role),
  });

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  return serializeEmployee(employee);
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id },
      select: { id: true, isResigned: true },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.isResigned) {
      throw new ValidationError('Cannot edit a resigned employee');
    }

    const updateData: Record<string, unknown> = {};
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.annualCtcPaise !== undefined) updateData.annualCtcPaise = BigInt(data.annualCtcPaise);
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.isBillable !== undefined) updateData.isBillable = data.isBillable;

    try {
      const updated = await tx.employee.update({
        where: { id },
        data: updateData,
      });
      return serializeEmployee(updated);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2003') {
        throw new ValidationError('Department not found');
      }
      throw err;
    }
  });
}

export async function resignEmployee(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id },
      select: { id: true, isResigned: true },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.isResigned) {
      throw new ValidationError('Employee is already resigned');
    }

    await tx.employee.update({
      where: { id },
      data: { isResigned: true },
    });
  });
}

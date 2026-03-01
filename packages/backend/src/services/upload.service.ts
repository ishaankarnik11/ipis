import { prisma } from '../lib/prisma.js';
import { parseExcelToRows, type ParsedRow } from '../lib/excel.js';
import { logger } from '../lib/logger.js';
import { UploadRejectedError, ValidationError } from '../lib/errors.js';
import { timesheetRowSchema, type TimesheetRowInput, billingRowSchema, type BillingRowInput } from './upload.schemas.js';
import { employeeRowSchema } from '@ipis/shared';
import {
  calculateCostPerHour,
  calculateFixedCost,
  calculateAmc,
  calculateInfrastructure,
} from './calculation-engine/index.js';
import { persistSnapshots, type ProjectResult, type EmployeeSnapshotData } from './snapshot.service.js';
import { emitUploadEvent } from '../lib/sse.js';

interface AuthUser {
  id: string;
  role: string;
  email: string;
}

interface TimesheetUploadResult {
  status: 'SUCCESS';
  rowCount: number;
  periodMonth: number;
  periodYear: number;
  replacedRowsCount: number | null;
  uploadEventId: string;
}

export async function processTimesheetUpload(
  buffer: Buffer,
  user: AuthUser,
): Promise<TimesheetUploadResult> {
  // 1. Parse Excel file
  const rows = parseExcelToRows(buffer);
  if (rows.length === 0) {
    throw new ValidationError('File contains no data rows');
  }

  // 2. Validate row shapes with Zod (collects all errors before rejecting)
  const validatedRows = validateRowShapes(rows);

  // 3. Validate all rows share the same period
  const periodMonth = validatedRows[0]!.period_month;
  const periodYear = validatedRows[0]!.period_year;

  const mixedPeriod = validatedRows.some(
    (r) => r.period_month !== periodMonth || r.period_year !== periodYear,
  );
  if (mixedPeriod) {
    throw new ValidationError('All rows must have the same period_month and period_year');
  }

  // 4. Extract unique employee IDs and project names for batch lookups
  const uniqueEmployeeIds = [...new Set(validatedRows.map((r) => r.employee_id))];
  const uniqueProjectNames = [...new Set(validatedRows.map((r) => r.project_name))];

  // 5. Batch lookup employees — WHERE id IN (...) (AC1: not row-by-row)
  const employees = await prisma.employee.findMany({
    where: { id: { in: uniqueEmployeeIds } },
    select: { id: true },
  });
  const foundEmployeeIds = new Set(employees.map((e) => e.id));

  // 6. Batch lookup projects by name WHERE status = 'ACTIVE' (AC1, AC3)
  const projects = await prisma.project.findMany({
    where: { name: { in: uniqueProjectNames }, status: 'ACTIVE' },
    select: { id: true, name: true },
  });
  const projectNameToId = new Map(projects.map((p) => [p.name, p.id]));

  // 7. Collect ALL validation errors before rejecting (AC2, AC3)
  const errors: Array<{ field?: string; message: string }> = [];

  const missingEmployeeIds = uniqueEmployeeIds.filter((id) => !foundEmployeeIds.has(id));
  for (const empId of missingEmployeeIds) {
    errors.push({
      field: 'employee_id',
      message: `Employee ID '${empId}' not found in employee master`,
    });
  }

  const missingProjectNames = uniqueProjectNames.filter((name) => !projectNameToId.has(name));
  for (const projName of missingProjectNames) {
    errors.push({
      field: 'project_name',
      message: `Project '${projName}' not found or not in ACTIVE status`,
    });
  }

  // 8. If ANY errors, reject the ENTIRE file (AC2, AC3: atomic model)
  if (errors.length > 0) {
    throw new UploadRejectedError('Upload rejected: validation failed', errors);
  }

  // 9. Atomic transaction: delete old + insert new (AC4, AC5, AC6)
  const result = await prisma.$transaction(async (tx) => {
    // Count existing rows for same period (for replacedRowsCount — AC6)
    const existingCount = await tx.timesheetEntry.count({
      where: { periodMonth, periodYear },
    });

    // Delete existing timesheet entries for same period (AC6: atomic replacement)
    if (existingCount > 0) {
      await tx.timesheetEntry.deleteMany({
        where: { periodMonth, periodYear },
      });
    }

    // Create upload event record
    const uploadEvent = await tx.uploadEvent.create({
      data: {
        type: 'TIMESHEET',
        status: 'SUCCESS',
        uploadedBy: user.id,
        periodMonth,
        periodYear,
        rowCount: validatedRows.length,
        replacedRowsCount: existingCount > 0 ? existingCount : null,
      },
    });

    // Create all timesheet entries atomically
    await tx.timesheetEntry.createMany({
      data: validatedRows.map((row) => ({
        employeeId: row.employee_id,
        projectId: projectNameToId.get(row.project_name)!,
        hours: row.hours,
        periodMonth: row.period_month,
        periodYear: row.period_year,
        uploadEventId: uploadEvent.id,
      })),
    });

    return {
      status: 'SUCCESS' as const,
      rowCount: validatedRows.length,
      periodMonth,
      periodYear,
      replacedRowsCount: existingCount > 0 ? existingCount : null,
      uploadEventId: uploadEvent.id,
    };
  });

  logger.info(
    {
      uploadEventId: result.uploadEventId,
      rowCount: result.rowCount,
      replacedRowsCount: result.replacedRowsCount,
    },
    'Timesheet upload processed successfully',
  );

  return result;
}

/**
 * Validates each parsed row against the Zod schema and returns typed results.
 * Collects all validation errors and rejects atomically.
 */
function validateRowShapes(rows: ParsedRow[]): TimesheetRowInput[] {
  const validated: TimesheetRowInput[] = [];
  const errors: Array<{ field?: string; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +2 for 1-indexed + header row
    const raw = rows[i]!;
    const parsed = timesheetRowSchema.safeParse(raw);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          field: `row_${rowNum}.${issue.path.join('.')}`,
          message: `Row ${rowNum}: ${issue.message}`,
        });
      }
    } else {
      validated.push(parsed.data);
    }
  }

  if (errors.length > 0) {
    throw new UploadRejectedError('Upload rejected: row validation failed', errors);
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Billing Upload (Atomic pattern — same as timesheets)
// ---------------------------------------------------------------------------

interface BillingUploadResult {
  status: 'SUCCESS';
  rowCount: number;
  periodMonth: number;
  periodYear: number;
  replacedRowsCount: number | null;
  uploadEventId: string;
  recalculation: {
    status: 'COMPLETE' | 'FAILED';
    runId?: string;
    projectsProcessed?: number;
    error?: string;
  };
}

export async function processBillingUpload(
  buffer: Buffer,
  user: AuthUser,
): Promise<BillingUploadResult> {
  // 1. Parse Excel file
  const rows = parseExcelToRows(buffer);
  if (rows.length === 0) {
    throw new ValidationError('File contains no data rows');
  }

  // 2. Validate row shapes with Zod (collects all errors before rejecting)
  const validatedRows = validateBillingRowShapes(rows);

  // 3. Validate all rows share the same period
  const periodMonth = validatedRows[0]!.period_month;
  const periodYear = validatedRows[0]!.period_year;

  const mixedPeriod = validatedRows.some(
    (r) => r.period_month !== periodMonth || r.period_year !== periodYear,
  );
  if (mixedPeriod) {
    throw new ValidationError('All rows must have the same period_month and period_year');
  }

  // 4. Batch lookup projects by ID WHERE status = 'ACTIVE'
  const uniqueProjectIds = [...new Set(validatedRows.map((r) => r.project_id))];
  const projects = await prisma.project.findMany({
    where: { id: { in: uniqueProjectIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  const foundProjectIds = new Set(projects.map((p) => p.id));

  // 5. Collect ALL validation errors before rejecting
  const errors: Array<{ field?: string; message: string }> = [];
  const missingProjectIds = uniqueProjectIds.filter((id) => !foundProjectIds.has(id));
  for (const projId of missingProjectIds) {
    errors.push({
      field: 'project_id',
      message: `Project ID '${projId}' not found or not in ACTIVE status`,
    });
  }

  // 6. If ANY errors, reject the ENTIRE file (atomic model)
  if (errors.length > 0) {
    throw new UploadRejectedError('Upload rejected: validation failed', errors);
  }

  // 7. Atomic transaction: delete old period billing_records + insert new
  const result = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.billingRecord.count({
      where: { periodMonth, periodYear },
    });

    if (existingCount > 0) {
      await tx.billingRecord.deleteMany({
        where: { periodMonth, periodYear },
      });
    }

    const uploadEvent = await tx.uploadEvent.create({
      data: {
        type: 'BILLING',
        status: 'SUCCESS',
        uploadedBy: user.id,
        periodMonth,
        periodYear,
        rowCount: validatedRows.length,
        replacedRowsCount: existingCount > 0 ? existingCount : null,
      },
    });

    await tx.billingRecord.createMany({
      data: validatedRows.map((row) => ({
        projectId: row.project_id,
        clientName: row.client_name,
        invoiceAmountPaise: BigInt(row.invoice_amount_paise),
        invoiceDate: new Date(row.invoice_date),
        projectType: row.project_type,
        vertical: row.vertical,
        periodMonth: row.period_month,
        periodYear: row.period_year,
        uploadEventId: uploadEvent.id,
      })),
    });

    return {
      uploadEventId: uploadEvent.id,
      rowCount: validatedRows.length,
      periodMonth,
      periodYear,
      replacedRowsCount: existingCount > 0 ? existingCount : null,
    };
  });

  logger.info(
    {
      uploadEventId: result.uploadEventId,
      rowCount: result.rowCount,
      replacedRowsCount: result.replacedRowsCount,
    },
    'Billing upload processed successfully',
  );

  // 8. Trigger recalculation AFTER transaction commits (AC2: never inside transaction)
  const recalcResult = await triggerRecalculation(result.uploadEventId, periodMonth, periodYear);

  return {
    status: 'SUCCESS',
    ...result,
    recalculation: recalcResult,
  };
}

/**
 * Validates each parsed billing row against billingRowSchema.
 * Collects all validation errors and rejects atomically.
 */
function validateBillingRowShapes(rows: ParsedRow[]): BillingRowInput[] {
  const validated: BillingRowInput[] = [];
  const errors: Array<{ field?: string; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const raw = rows[i]!;
    const parsed = billingRowSchema.safeParse(raw);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          field: `row_${rowNum}.${issue.path.join('.')}`,
          message: `Row ${rowNum}: ${issue.message}`,
        });
      }
    } else {
      validated.push(parsed.data);
    }
  }

  if (errors.length > 0) {
    throw new UploadRejectedError('Upload rejected: row validation failed', errors);
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Recalculation Engine Orchestration
// ---------------------------------------------------------------------------

interface RecalcResult {
  status: 'COMPLETE' | 'FAILED';
  runId?: string;
  projectsProcessed?: number;
  error?: string;
}

/**
 * Fetches all ACTIVE projects for the period, runs the appropriate calculator
 * per engagement model, and persists snapshots. Emits SSE events on completion
 * or failure. Never throws — error isolation per AC4.
 */
export async function triggerRecalculation(
  uploadEventId: string,
  periodMonth: number,
  periodYear: number,
): Promise<RecalcResult> {
  try {
    // 1. Fetch all ACTIVE projects with employee assignments and timesheet data
    const activeProjects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        employeeProjects: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                designation: true,
                departmentId: true,
                annualCtcPaise: true,
                overheadPaise: true,
                isBillable: true,
              },
            },
          },
        },
        timesheetEntries: {
          where: { periodMonth, periodYear },
        },
      },
    });

    // 2. Fetch system config for standardMonthlyHours
    const config = await prisma.systemConfig.findFirst();
    const standardMonthlyHours = config?.standardMonthlyHours ?? 160;

    // 3. Calculate profitability per project
    const projectResults: ProjectResult[] = [];

    for (const project of activeProjects) {
      // Aggregate timesheet hours by employee
      const hoursByEmployee = new Map<string, number>();
      for (const entry of project.timesheetEntries) {
        hoursByEmployee.set(
          entry.employeeId,
          (hoursByEmployee.get(entry.employeeId) ?? 0) + entry.hours,
        );
      }

      // Build cost per hour map and employee cost entries
      const employeeCosts: Array<{ hours: number; costPerHourPaise: number }> = [];
      const employeeSnapshots: EmployeeSnapshotData[] = [];

      for (const ep of project.employeeProjects) {
        const empHours = hoursByEmployee.get(ep.employeeId) ?? 0;
        const costPerHour = calculateCostPerHour({
          annualCtcPaise: Number(ep.employee.annualCtcPaise),
          overheadPaise: Number(ep.employee.overheadPaise),
          standardMonthlyHours,
        });

        employeeCosts.push({ hours: empHours, costPerHourPaise: costPerHour });

        employeeSnapshots.push({
          employeeId: ep.employeeId,
          name: ep.employee.name,
          designation: ep.employee.designation,
          departmentId: ep.employee.departmentId,
          hours: empHours,
          costPerHourPaise: costPerHour,
          contributionPaise: Math.round(empHours * costPerHour),
          billingRatePaise: ep.billingRatePaise ? Number(ep.billingRatePaise) : null,
          billableHours: ep.employee.isBillable ? empHours : 0,
          availableHours: standardMonthlyHours,
        });
      }

      // Call appropriate calculator based on engagement model
      let revenuePaise: number;
      let costPaise: number;
      let profitPaise: number;
      let marginPercent: number;

      switch (project.engagementModel) {
        case 'TIME_AND_MATERIALS': {
          // T&M: revenue = SUM(emp.hours * emp.billingRate) for per-employee rates
          revenuePaise = 0;
          for (const ep of project.employeeProjects) {
            const empHours = hoursByEmployee.get(ep.employeeId) ?? 0;
            revenuePaise += Math.round(empHours * Number(ep.billingRatePaise ?? 0));
          }
          costPaise = employeeCosts.reduce(
            (sum, e) => sum + Math.round(e.hours * e.costPerHourPaise),
            0,
          );
          profitPaise = revenuePaise - costPaise;
          marginPercent = revenuePaise === 0 ? 0 : profitPaise / revenuePaise;
          break;
        }
        case 'FIXED_COST': {
          const fcResult = calculateFixedCost({
            contractValuePaise: Number(project.contractValuePaise ?? 0),
            employeeCosts,
            completionPercent: project.completionPercent
              ? Number(project.completionPercent)
              : null,
          });
          revenuePaise = fcResult.revenuePaise;
          costPaise = fcResult.costPaise;
          profitPaise = fcResult.profitPaise;
          marginPercent = fcResult.marginPercent;
          break;
        }
        case 'AMC': {
          const amcResult = calculateAmc({
            contractValuePaise: Number(project.contractValuePaise ?? 0),
            employeeCosts,
          });
          revenuePaise = amcResult.revenuePaise;
          costPaise = amcResult.costPaise;
          profitPaise = amcResult.profitPaise;
          marginPercent = amcResult.marginPercent;
          break;
        }
        case 'INFRASTRUCTURE': {
          const mode = project.infraCostMode ?? 'SIMPLE';
          if (mode === 'SIMPLE') {
            const infraResult = calculateInfrastructure({
              mode: 'SIMPLE',
              infraInvoicePaise: Number(project.contractValuePaise ?? 0),
              vendorCostPaise: Number(project.vendorCostPaise ?? 0),
              manpowerCostPaise: Number(project.manpowerCostPaise ?? 0),
            });
            revenuePaise = infraResult.revenuePaise;
            costPaise = infraResult.costPaise;
            profitPaise = infraResult.profitPaise;
            marginPercent = infraResult.marginPercent;
          } else {
            const infraResult = calculateInfrastructure({
              mode: 'DETAILED',
              infraInvoicePaise: Number(project.contractValuePaise ?? 0),
              vendorCostPaise: Number(project.vendorCostPaise ?? 0),
              employeeCosts,
            });
            revenuePaise = infraResult.revenuePaise;
            costPaise = infraResult.costPaise;
            profitPaise = infraResult.profitPaise;
            marginPercent = infraResult.marginPercent;
          }
          break;
        }
      }

      projectResults.push({
        projectId: project.id,
        engagementModel: project.engagementModel,
        infraCostMode: project.infraCostMode ?? null,
        revenuePaise,
        costPaise,
        profitPaise,
        marginPercent,
        vendorCostPaise: project.vendorCostPaise ? Number(project.vendorCostPaise) : undefined,
        manpowerCostPaise: project.manpowerCostPaise
          ? Number(project.manpowerCostPaise)
          : undefined,
        projectDepartmentId: undefined,
        employees: employeeSnapshots,
      });
    }

    // 4. Create RecalculationRun record
    const recalcRun = await prisma.recalculationRun.create({
      data: {
        uploadEventId,
        projectsProcessed: projectResults.length,
        completedAt: new Date(),
      },
    });

    // 5. Persist snapshots (atomic transaction inside persistSnapshots)
    await persistSnapshots({
      recalculationRunId: recalcRun.id,
      periodMonth,
      periodYear,
      projectResults,
    });

    // 6. Emit SSE success event
    emitUploadEvent(uploadEventId, {
      type: 'RECALC_COMPLETE',
      runId: recalcRun.id,
      projectsProcessed: projectResults.length,
      snapshotsWritten: projectResults.length, // one snapshot set per project
    });

    logger.info(
      { uploadEventId, runId: recalcRun.id, projectsProcessed: projectResults.length },
      'Recalculation completed successfully',
    );

    return {
      status: 'COMPLETE',
      runId: recalcRun.id,
      projectsProcessed: projectResults.length,
    };
  } catch (error) {
    // Error isolation (AC4): never throw — billing upload rows remain committed
    logger.error({ err: error, uploadEventId }, 'Recalculation failed');
    emitUploadEvent(uploadEventId, {
      type: 'RECALC_FAILED',
      error: error instanceof Error ? error.message : 'Unknown recalculation error',
    });
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown recalculation error',
    };
  }
}

// ---------------------------------------------------------------------------
// Salary Upload (Row-level pattern — partial import)
// ---------------------------------------------------------------------------

interface SalaryUploadResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  imported: number;
  failed: number;
  uploadEventId: string;
  failedRows: Array<{ row: number; employeeCode: string; error: string }>;
}

export async function processSalaryUpload(
  buffer: Buffer,
  user: AuthUser,
  mode: 'full' | 'correction' = 'full',
): Promise<SalaryUploadResult> {
  // 1. Parse Excel file
  const rows = parseExcelToRows(buffer);
  if (rows.length === 0) {
    throw new ValidationError('File contains no data rows');
  }

  // 2. Load lookup data
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));

  const existingEmployees = await prisma.employee.findMany({
    select: { employeeCode: true, id: true },
  });
  const existingCodeSet = new Set(existingEmployees.map((e) => e.employeeCode));

  // 3. Validate each row individually
  const validRows: Array<{
    employeeCode: string;
    name: string;
    departmentId: string;
    designation: string;
    annualCtcPaise: bigint;
    joiningDate: Date | null;
    isBillable: boolean;
  }> = [];
  const failedRows: Array<{ row: number; employeeCode: string; error: string }> = [];

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

    if (mode === 'full') {
      // Check duplicate employee code in DB
      if (existingCodeSet.has(data.employee_code)) {
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
    } else {
      // correction mode: employee must already exist
      if (!existingCodeSet.has(data.employee_code)) {
        failedRows.push({
          row: rowNum,
          employeeCode: data.employee_code,
          error: 'Employee code not found — cannot correct non-existent employee',
        });
        continue;
      }
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

  // 4. Insert or upsert valid rows + create upload event in a single transaction
  const now = new Date();
  const { importedCount, uploadEvent } = await prisma.$transaction(async (tx) => {
    let imported = 0;

    if (validRows.length > 0) {
      if (mode === 'full') {
        const { count } = await tx.employee.createMany({
          data: validRows,
          skipDuplicates: true,
        });
        imported = count;
      } else {
        // correction mode: upsert by employee code
        for (const row of validRows) {
          await tx.employee.update({
            where: { employeeCode: row.employeeCode },
            data: {
              name: row.name,
              departmentId: row.departmentId,
              designation: row.designation,
              annualCtcPaise: row.annualCtcPaise,
              joiningDate: row.joiningDate,
              isBillable: row.isBillable,
            },
          });
          imported++;
        }
      }
    }

    // 5. Determine upload status
    const uploadStatus =
      failedRows.length === 0
        ? ('SUCCESS' as const)
        : imported > 0
          ? ('PARTIAL' as const)
          : ('FAILED' as const);

    // 6. Create upload event within the same transaction
    const event = await tx.uploadEvent.create({
      data: {
        type: 'SALARY',
        status: uploadStatus,
        uploadedBy: user.id,
        periodMonth: now.getMonth() + 1,
        periodYear: now.getFullYear(),
        rowCount: imported,
        errorSummary: failedRows.length > 0 ? failedRows : undefined,
      },
    });

    return { importedCount: imported, uploadEvent: event };
  });

  // Determine upload status for return value
  const uploadStatus =
    failedRows.length === 0
      ? ('SUCCESS' as const)
      : importedCount > 0
        ? ('PARTIAL' as const)
        : ('FAILED' as const);

  logger.info(
    { uploadEventId: uploadEvent.id, imported: importedCount, failed: failedRows.length, mode },
    'Salary upload processed',
  );

  return {
    status: uploadStatus,
    imported: importedCount,
    failed: failedRows.length,
    uploadEventId: uploadEvent.id,
    failedRows,
  };
}

import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | number | boolean | undefined;
}

const TEMPLATE_HEADERS = [
  'employee_code',
  'name',
  'department',
  'designation',
  'annual_ctc',
  'joining_date',
  'is_billable',
];

export function parseExcelToRows(buffer: Buffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName]!;
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: undefined });
}

export function generateSampleTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

// ── Upload template definitions ─────────────────────────────────────────────

export type TemplateType = 'employee-master' | 'timesheet' | 'revenue';

interface TemplateDefinition {
  headers: string[];
  sampleRow: (string | number | boolean)[];
  sheetName: string;
  filename: string;
}

export const UPLOAD_TEMPLATES: Record<TemplateType, TemplateDefinition> = {
  'employee-master': {
    headers: ['employee_code', 'name', 'department', 'designation', 'annual_ctc', 'joining_date', 'is_billable'],
    sampleRow: ['EMP001', 'Ravi Kumar', 'Engineering', 'Senior Developer', 1200000, '2023-06-15', true],
    sheetName: 'Employee Master',
    filename: 'employee-master-template.xlsx',
  },
  timesheet: {
    headers: ['employee_id', 'project_name', 'hours', 'period_month', 'period_year'],
    sampleRow: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Project Alpha', 160, 3, 2026],
    sheetName: 'Timesheet',
    filename: 'monthly-timesheet-template.xlsx',
  },
  revenue: {
    headers: ['project_id', 'client_name', 'invoice_amount_paise', 'invoice_date', 'project_type', 'vertical', 'period_month', 'period_year'],
    sampleRow: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Acme Corp', 50000000, '2026-03-01', 'T&M', 'Technology', 3, 2026],
    sheetName: 'Revenue',
    filename: 'revenue-billing-template.xlsx',
  },
};

export function generateUploadTemplate(type: TemplateType): Buffer {
  const def = UPLOAD_TEMPLATES[type];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([def.headers, def.sampleRow]);
  XLSX.utils.book_append_sheet(workbook, worksheet, def.sheetName);
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generate an XLSX error report from failed upload rows.
 * Used by salary upload to provide downloadable error reports.
 */
export function generateErrorReport(
  failedRows: Array<{ row: number; employeeCode: string; error: string }>,
): Buffer {
  const ws = XLSX.utils.json_to_sheet(failedRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Errors');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generate an XLSX file from an array of record objects.
 * Used by upload record detail download.
 */
export function generateRecordsExport(
  records: Record<string, unknown>[],
  sheetName: string = 'Records',
): Buffer {
  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

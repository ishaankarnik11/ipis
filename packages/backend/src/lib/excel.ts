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

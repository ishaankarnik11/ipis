import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { E2E_DB_URL } from './helpers/constants.js';

export default async function globalSetup() {
  const e2eDir = process.cwd();
  const backendSchemaPath = path.resolve(e2eDir, '..', 'backend', 'prisma', 'schema.prisma');
  const localPrismaDir = path.resolve(e2eDir, 'prisma');
  const localSchemaPath = path.resolve(localPrismaDir, 'schema.prisma');
  const env = { ...process.env, DATABASE_URL: E2E_DB_URL };

  // Copy Prisma schema so the generated client lives in e2e/node_modules
  fs.mkdirSync(localPrismaDir, { recursive: true });
  fs.copyFileSync(backendSchemaPath, localSchemaPath);

  // Push schema to test DB (creates DB + tables if needed, generates Prisma client)
  execSync('npx prisma db push --accept-data-loss', {
    cwd: e2eDir,
    env,
    stdio: 'inherit',
  });

  // Run E2E seed
  execSync('npx tsx seed.ts', {
    cwd: e2eDir,
    env,
    stdio: 'inherit',
  });

  // Create test fixture files
  createFixtures(e2eDir);
}

function createFixtures(e2eDir: string) {
  const fixturesDir = path.resolve(e2eDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  // valid-employees.xlsx — 3 valid rows
  const validData = [
    { employee_code: 'E2E001', name: 'Valid Employee One', department: 'Engineering', designation: 'Developer', annual_ctc: 1200000, joining_date: '2024-01-15', is_billable: true },
    { employee_code: 'E2E002', name: 'Valid Employee Two', department: 'Finance', designation: 'Analyst', annual_ctc: 1000000, joining_date: '2024-03-01', is_billable: true },
    { employee_code: 'E2E003', name: 'Valid Employee Three', department: 'Human Resources', designation: 'Coordinator', annual_ctc: 800000, is_billable: false },
  ];
  writeXlsx(path.join(fixturesDir, 'valid-employees.xlsx'), validData);

  // mixed-employees.xlsx — 2 valid + 2 invalid rows
  const mixedData = [
    { employee_code: 'E2E004', name: 'Mixed Valid One', department: 'Engineering', designation: 'Tester', annual_ctc: 900000, is_billable: true },
    { employee_code: 'E2E005', name: 'Mixed Valid Two', department: 'Delivery', designation: 'Manager', annual_ctc: 1500000, is_billable: true },
    { employee_code: '', name: 'Missing Code', department: 'Engineering', designation: 'Dev', annual_ctc: 800000 },
    { employee_code: 'E2E006', name: 'Bad Department', department: 'NonExistentDept', designation: 'Dev', annual_ctc: 800000 },
  ];
  writeXlsx(path.join(fixturesDir, 'mixed-employees.xlsx'), mixedData);

  // invalid-file.txt — wrong file type
  fs.writeFileSync(path.join(fixturesDir, 'invalid-file.txt'), 'This is not an xlsx file');

  // uc-valid-employees.xlsx — 3 valid rows with unique codes for upload-center tests
  const ucValidData = [
    { employee_code: 'UC001', name: 'UC Valid Employee One', department: 'Engineering', designation: 'Developer', annual_ctc: 1200000, joining_date: '2024-01-15', is_billable: true },
    { employee_code: 'UC002', name: 'UC Valid Employee Two', department: 'Finance', designation: 'Analyst', annual_ctc: 1000000, joining_date: '2024-03-01', is_billable: true },
    { employee_code: 'UC003', name: 'UC Valid Employee Three', department: 'Human Resources', designation: 'Coordinator', annual_ctc: 800000, is_billable: false },
  ];
  writeXlsx(path.join(fixturesDir, 'uc-valid-employees.xlsx'), ucValidData);

  // uc-mixed-employees.xlsx — 2 valid + 2 invalid rows with unique codes for upload-center tests
  const ucMixedData = [
    { employee_code: 'UC004', name: 'UC Mixed Valid One', department: 'Engineering', designation: 'Tester', annual_ctc: 900000, is_billable: true },
    { employee_code: 'UC005', name: 'UC Mixed Valid Two', department: 'Delivery', designation: 'Manager', annual_ctc: 1500000, is_billable: true },
    { employee_code: '', name: 'Missing Code', department: 'Engineering', designation: 'Dev', annual_ctc: 800000 },
    { employee_code: 'UC006', name: 'Bad Department', department: 'NonExistentDept', designation: 'Dev', annual_ctc: 800000 },
  ];
  writeXlsx(path.join(fixturesDir, 'uc-mixed-employees.xlsx'), ucMixedData);

  // invalid-timesheets.xlsx — references employee IDs that don't exist
  const invalidTimesheetData = [
    { employee_id: 'NONEXISTENT001', project_name: 'Seeded Active TM Project', hours: 40, period_month: 3, period_year: 2026 },
    { employee_id: 'NONEXISTENT002', project_name: 'FakeProject', hours: 20, period_month: 3, period_year: 2026 },
  ];
  writeXlsx(path.join(fixturesDir, 'invalid-timesheets.xlsx'), invalidTimesheetData);
}

function writeXlsx(filePath: string, data: Record<string, unknown>[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, filePath);
}

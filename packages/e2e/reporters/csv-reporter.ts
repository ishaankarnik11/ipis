import fs from 'fs';
import path from 'path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as XLSX from 'xlsx';

interface TestRecord {
  testName: string;
  specFile: string;
  frontendStatus: string;
  backendStatus: string;
  dbVerified: string;
  overallStatus: string;
  durationMs: number;
  errorMessage: string;
  retryNumber: number;
}

export default class CsvReporter implements Reporter {
  private records: TestRecord[] = [];
  private timestamp: string;
  private reportDir: string;

  constructor(options: { timestamp: string }) {
    this.timestamp = options.timestamp;
    // Reports go to project root / e2e-report / {timestamp}
    this.reportDir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'e2e-report',
      this.timestamp,
    );
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    fs.mkdirSync(this.reportDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const specFile = path.relative(
      path.resolve(__dirname, '..', 'tests'),
      test.location.file,
    );

    // Detect DB verification by scanning the spec source for getDb usage
    const dbVerified = this.detectDbUsage(test.location.file);

    // Determine frontend/backend status heuristics from test title
    const title = test.title.toLowerCase();
    const isBackendFocused =
      title.includes('api') ||
      title.includes('backend') ||
      title.includes('database') ||
      title.includes('seed');
    const isFrontendFocused =
      title.includes('ui') ||
      title.includes('page') ||
      title.includes('click') ||
      title.includes('form') ||
      title.includes('navigate') ||
      title.includes('display') ||
      title.includes('show') ||
      title.includes('redirect') ||
      title.includes('modal');

    // E2E tests typically exercise both layers; use overall status as baseline
    const status = result.status;
    const frontendStatus =
      isFrontendFocused || !isBackendFocused ? status : 'n/a';
    const backendStatus =
      isBackendFocused || dbVerified === 'yes' ? status : 'n/a';

    const errorMessage =
      result.errors
        .map((e) => e.message ?? e.toString())
        .join('; ')
        .replace(/[\r\n]+/g, ' ')
        .substring(0, 500) || '';

    this.records.push({
      testName: test.title,
      specFile,
      frontendStatus,
      backendStatus,
      dbVerified,
      overallStatus: status,
      durationMs: result.duration,
      errorMessage,
      retryNumber: result.retry,
    });
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (this.records.length === 0) return;

    // Write CSV
    const csvHeader =
      'Test Name,Spec File,Frontend Status,Backend Status,DB Verified,Overall Status,Duration (ms),Error Message,Retry #';
    const csvRows = this.records.map(
      (r) =>
        `${this.escapeCsv(r.testName)},${this.escapeCsv(r.specFile)},${r.frontendStatus},${r.backendStatus},${r.dbVerified},${r.overallStatus},${r.durationMs},${this.escapeCsv(r.errorMessage)},${r.retryNumber}`,
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const csvPath = path.join(this.reportDir, 'summary.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    // Write XLSX
    const xlsxData = this.records.map((r) => ({
      'Test Name': r.testName,
      'Spec File': r.specFile,
      'Frontend Status': r.frontendStatus,
      'Backend Status': r.backendStatus,
      'DB Verified': r.dbVerified,
      'Overall Status': r.overallStatus,
      'Duration (ms)': r.durationMs,
      'Error Message': r.errorMessage,
      'Retry #': r.retryNumber,
    }));
    const worksheet = XLSX.utils.json_to_sheet(xlsxData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'E2E Results');
    const xlsxPath = path.join(this.reportDir, 'summary.xlsx');
    XLSX.writeFile(workbook, xlsxPath);

    // Create "latest" junction/symlink pointing to this run
    const latestPath = path.join(this.reportDir, '..', 'latest');
    try {
      // Remove existing symlink/junction if present
      if (
        fs.existsSync(latestPath) ||
        fs.lstatSync(latestPath).isSymbolicLink()
      ) {
        fs.rmSync(latestPath, { recursive: true, force: true });
      }
    } catch {
      // lstatSync throws if path doesn't exist at all — that's fine
    }
    try {
      // Use junction on Windows (works without admin), symlink on Unix
      fs.symlinkSync(
        this.reportDir,
        latestPath,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } catch {
      // Symlink creation can fail in some environments; non-critical
    }
  }

  private detectDbUsage(specFilePath: string): string {
    try {
      const source = fs.readFileSync(specFilePath, 'utf-8');
      return source.includes('getDb') ? 'yes' : 'no';
    } catch {
      return 'unknown';
    }
  }

  private escapeCsv(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

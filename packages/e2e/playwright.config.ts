import { defineConfig } from '@playwright/test';
import path from 'path';
import { E2E_DB_URL } from './helpers/constants.js';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [
    // Console output: shows pass/fail with test names during run
    ['list'],
    // HTML report: full interactive report with screenshots, traces, and error details
    // Open after run: pnpm --filter @ipis/e2e exec playwright show-report
    ['html', { open: 'never', outputFolder: '../../../e2e-report/html' }],
    // JSON report: machine-readable for CI pipelines or custom tooling
    ['json', { outputFile: '../../../e2e-report/results.json' }],
  ],
  globalSetup: './global-setup.ts',
  // Output directory for screenshots, videos, and traces from failed tests
  outputDir: '../../../e2e-report/test-artifacts',
  use: {
    baseURL: 'http://localhost:5173',
    // Screenshots: capture on every failure so devs can see what the page looked like
    screenshot: 'only-on-failure',
    // Trace: capture on failure (not just retry) — includes DOM snapshot, network, console logs
    trace: 'retain-on-failure',
    // Video: record on failure — shows exact user interaction sequence that led to the bug
    video: 'retain-on-failure',
    headless: !!process.env['CI'],
    launchOptions: { slowMo: process.env['CI'] ? 0 : 300 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ipis/backend dev',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: !process.env['CI'],
      env: {
        DATABASE_URL: E2E_DB_URL,
        JWT_SECRET: 'e2e-test-secret',
      },
      cwd: path.resolve('..', '..'),
    },
    {
      command: 'pnpm --filter @ipis/frontend dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
      cwd: path.resolve('..', '..'),
    },
  ],
});

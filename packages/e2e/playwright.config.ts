import { defineConfig } from '@playwright/test';
import path from 'path';

const E2E_DB_URL = 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_e2e';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
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

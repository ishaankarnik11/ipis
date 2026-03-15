import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.integration.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_backend',
      JWT_SECRET: 'test-secret-key-that-is-long-enough-for-hs256',
      INTERNAL_SERVICE_SECRET: 'test-internal-secret-key-long-enough-for-hs256',
      FRONTEND_URL: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
    },
    testTimeout: 60000, // PDF generation can be slow
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: './src/test-utils/global-setup.ts',
  },
});

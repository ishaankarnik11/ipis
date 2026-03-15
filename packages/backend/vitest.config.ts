import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    env: {
      DATABASE_URL: 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_backend',
      JWT_SECRET: 'test-secret-key-that-is-long-enough-for-hs256',
      INTERNAL_SERVICE_SECRET: 'test-internal-secret-key-long-enough-for-hs256',
      LOG_LEVEL: 'silent',
      NODE_ENV: 'test',
    },
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: './src/test-utils/global-setup.ts',
  },
});

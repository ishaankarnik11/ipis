import { execSync } from 'node:child_process';
import path from 'node:path';

export default function globalSetup() {
  const backendRoot = path.resolve(import.meta.dirname, '../..');
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_backend',
    },
    stdio: 'pipe',
  });
}

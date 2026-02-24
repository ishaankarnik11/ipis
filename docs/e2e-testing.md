# E2E Testing Guide

End-to-end tests use [Playwright](https://playwright.dev/) to verify frontend features against the real application stack (real browser, real API, real database).

## Prerequisites

- PostgreSQL running locally with a user `ipis` that can create databases
- Node.js >= 20
- pnpm installed
- Playwright browsers installed: `pnpm --filter @ipis/e2e exec playwright install chromium`

## Quick Start

```bash
# From the project root
pnpm test:e2e
```

This command:
1. Runs the **global setup** which pushes the Prisma schema to the test database (`ipis_test_e2e`), seeds test data, and creates fixture files
2. Starts the **backend** (port 3000) and **frontend** (port 5173) dev servers with the test database
3. Runs all Playwright tests in Chromium

If the dev servers are already running, Playwright reuses them (`reuseExistingServer: true` in local mode). Make sure your running backend points to the E2E test database if you do this.

## Test Database

E2E tests use a separate PostgreSQL database: `ipis_test_e2e`

- **Connection:** `postgresql://ipis:ipis_dev@localhost:5432/ipis_test_e2e`
- **Schema sync:** `prisma db push` is run automatically by the global setup
- **Seed data:** The global setup runs `seed.ts` which clears all data and creates deterministic test records

The test database is created automatically by `prisma db push` if it doesn't exist.

## Seed Data

### Test Users

| Email | Password | Role | Department |
|---|---|---|---|
| admin@e2e.test | Test1234! | ADMIN | — |
| hr@e2e.test | Test1234! | HR | Human Resources |
| finance@e2e.test | Test1234! | FINANCE | Finance |
| dm@e2e.test | Test1234! | DELIVERY_MANAGER | Delivery |
| depthead@e2e.test | Test1234! | DEPT_HEAD | Engineering |
| newuser@e2e.test | Temp1234! | HR (mustChangePassword) | Human Resources |

### Test Departments

Engineering, Finance, Human Resources, Delivery, Operations

### Test Employees

| Code | Name | Department | Designation |
|---|---|---|---|
| EMP001 | Seeded Employee One | Engineering | Senior Developer |
| EMP002 | Seeded Employee Two | Finance | Financial Analyst |
| EMP003 | Seeded Employee Three | Human Resources | HR Coordinator |

## Fixture Files

Generated automatically by the global setup in `packages/e2e/fixtures/`:

- `valid-employees.xlsx` — 3 valid employee rows for bulk upload
- `mixed-employees.xlsx` — 2 valid + 2 invalid rows (missing code, bad department)
- `invalid-file.txt` — non-xlsx file for type rejection tests

## Adding New Tests

1. Create a new spec file in `packages/e2e/tests/` (e.g., `projects.spec.ts`)
2. Use the `login()` helper for authentication:
   ```ts
   import { login } from '../helpers/index.js';

   test.beforeEach(async ({ page }) => {
     await login(page, 'ADMIN');
   });
   ```
3. Use Playwright's recommended selectors: `getByRole`, `getByText`, `getByLabel`, `getByTestId`
4. Avoid `page.waitForTimeout()` — use Playwright auto-waiting and assertions instead
5. Run your test in isolation: `pnpm --filter @ipis/e2e test -- --grep "your test name"`

### DB Helpers for Test Setup

For tests that need to manipulate the database directly (e.g., inserting tokens):

```ts
import { getDb, closeDb } from '../helpers/index.js';

test.beforeAll(async () => {
  const db = getDb();
  // Insert test data...
});

test.afterAll(async () => {
  await closeDb();
});
```

## Going-Forward Rule

Every UI story **must** include an `## E2E Test Scenarios` section with both positive and negative scenarios. This is mandatory from Epic 3 onwards.

### Story Author Responsibilities

1. Add an `## E2E Test Scenarios` section to the story file (see story template)
2. List **positive scenarios** (happy-path user journeys) as `E2E-P1`, `E2E-P2`, etc.
3. List **negative scenarios** (error paths, unauthorized access, validation failures, edge cases) as `E2E-N1`, `E2E-N2`, etc.
4. Every scenario must be specific enough to map directly to a Playwright test case

### Negative Scenario Categories (cover at minimum)

- **Validation:** required fields empty, invalid input formats, boundary values
- **Authorization:** unauthorized role attempts to access the page/action → redirected
- **API errors:** server returns 4xx/5xx → user sees appropriate error message
- **Duplicate actions:** double-submit prevention, re-click guards

### Developer Responsibilities

1. Create a corresponding `.spec.ts` file in `packages/e2e/tests/`
2. Each `E2E-P*` and `E2E-N*` scenario maps to one Playwright `test()` case
3. Update `seed.ts` if new test users or data are needed
4. Update fixtures if new file uploads are required
5. All E2E tests must pass before marking the story as `review`

## Running Options

All local runs open a **visible browser window** (headed mode) with 300ms slow-motion by default. CI runs are headless with no slow-mo. This is configured in `playwright.config.ts` — no extra flags needed.

```bash
# Run all E2E tests (headed locally, headless in CI)
pnpm test:e2e

# Run with Playwright UI (interactive runner with timeline)
pnpm --filter @ipis/e2e test:ui

# Run with debug mode (step-by-step Playwright Inspector)
pnpm --filter @ipis/e2e test:debug

# Run a specific test file
pnpm --filter @ipis/e2e exec playwright test tests/auth.spec.ts

# Run tests matching a pattern
pnpm --filter @ipis/e2e exec playwright test --grep "login"

# Force headless locally (override config)
pnpm --filter @ipis/e2e exec playwright test --headed=false

# View the HTML report after a run
pnpm --filter @ipis/e2e exec playwright show-report
```

## Troubleshooting

- **Tests fail with "database does not exist":** Ensure PostgreSQL is running and the `ipis` user has `CREATEDB` permission
- **WebServer fails to start:** Check that ports 3000 and 5173 are free (or stop your local dev servers)
- **Prisma client errors:** Delete `packages/e2e/prisma/` and `packages/e2e/node_modules/.prisma/` then re-run
- **Stale seed data:** The global setup clears and re-seeds on every run, so this shouldn't happen

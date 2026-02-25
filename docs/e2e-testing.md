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
| resetuser@e2e.test | Test1234! | ADMIN | — |

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

## Persist-and-Verify Pattern (MANDATORY)

Every E2E test that creates or updates data **MUST** verify that the data was actually persisted to the database. UI-only assertions (success notifications, page redirects, table rows appearing) are **insufficient** — they prove the UI works, not that the system works.

### The Pattern

```typescript
import { getDb, closeDb } from '../helpers/index.js';

test('DM creates an AMC project with SLA description', async ({ page }) => {
  // 1. ARRANGE — login and navigate
  await login(page, 'DELIVERY_MANAGER');
  await page.goto('/projects/new');

  // 2. ACT — fill form and submit
  await page.getByLabel('Name').fill('Test AMC Project');
  await page.getByLabel('Client').fill('Acme Corp');
  await page.getByLabel('SLA Description').fill('24/7 support with 4hr response');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 3. ASSERT UI — verify user-facing feedback
  await expect(page.getByText('Pending Approval')).toBeVisible();

  // 4. ASSERT DB (MANDATORY) — verify data persisted correctly
  const db = getDb();
  const project = await db.project.findFirst({
    where: { name: 'Test AMC Project' },
  });
  expect(project).not.toBeNull();
  expect(project!.client).toBe('Acme Corp');
  expect(project!.slaDescription).toBe('24/7 support with 4hr response');
  expect(project!.status).toBe('PENDING_APPROVAL');
});
```

### Why This Matters

In Epic 3, the project creation form collected model-specific fields (SLA Description, Vendor Costs, Budget, Manpower Allocation) from users — but the backend schema had no columns for them. The data was **silently discarded** on every submission. UI-only E2E tests passed because the success notification appeared. A single DB query would have caught this immediately.

### Rules

1. **Every form submission test** must query the DB afterward and assert that submitted values match
2. **Every API mutation test** (if tested via E2E) must verify the DB state changed as expected
3. **The Data Contract table** in each story lists exactly which fields need DB assertions — use it as your checklist
4. **If you can't write the DB assertion**, that means either the Prisma column doesn't exist or the data isn't being saved — both are bugs, not test limitations

### Cleanup

Always clean up test data in `afterAll` to prevent cross-test pollution:

```typescript
test.afterAll(async () => {
  const db = getDb();
  await db.project.deleteMany({ where: { name: { startsWith: 'Test ' } } });
  await closeDb();
});
```

---

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

## Test Reports & Failure Artifacts

After every E2E run, Playwright generates reports and failure evidence at the **project root** in `e2e-report/`:

```
e2e-report/
├── html/                   # Interactive HTML report — open in browser
│   └── index.html
├── results.json            # Machine-readable results for CI/tooling
└── test-artifacts/         # Failure evidence (only populated when tests fail)
    ├── <test-name>/
    │   ├── screenshot.png  # Screenshot of the page at moment of failure
    │   ├── video.webm      # Full video recording of the test run
    │   └── trace.zip       # Playwright trace (DOM, network, console, timeline)
```

### Viewing the HTML Report

```bash
# Open the interactive report in your browser
pnpm --filter @ipis/e2e exec playwright show-report ../../e2e-report/html
```

The HTML report shows for each test:
- **Test name** (the scenario description from the spec file)
- **Pass/Fail status** with duration
- **Error message** and stack trace for failures
- **Screenshots** embedded inline for failed tests
- **Trace viewer** link — click to see step-by-step DOM snapshots, network requests, and console logs
- **Video playback** — watch the exact browser interaction that failed

### Debugging Failures

1. **Screenshot** (`e2e-report/test-artifacts/<test>/screenshot.png`): Shows what the page looked like at the exact moment of failure. Check for missing elements, wrong text, or unexpected UI state.

2. **Trace** (`e2e-report/test-artifacts/<test>/trace.zip`): Open with `pnpm --filter @ipis/e2e exec playwright show-trace <path-to-trace.zip>`. Shows a timeline of every action, network request, DOM mutation, and console log. This is the most powerful debugging tool.

3. **Video** (`e2e-report/test-artifacts/<test>/video.webm`): Watch the entire test execution. Useful for timing issues, race conditions, and animations that block interactions.

### When Are Artifacts Captured?

| Artifact | When Captured |
|---|---|
| Screenshot | On test failure only |
| Trace | On test failure only |
| Video | On test failure only |
| HTML report | Every run (pass or fail) |
| JSON results | Every run (pass or fail) |

This means passing tests produce no large files — only failures generate evidence for debugging.

---

## Running Options

All local runs open a **visible browser window** (headed mode) with 300ms slow-motion by default. CI runs are headless with no slow-mo. This is configured in `playwright.config.ts` — no extra flags needed.

```bash
# Run all E2E tests (headed locally, headless in CI)
pnpm test:e2e

# Run with Playwright UI (interactive runner with timeline)
pnpm --filter @ipis/e2e test:ui

# Run with debug mode (step-by-step Playwright Inspector)
pnpm --filter @ipis/e2e test:debug

# Run a specific test file (PREFERRED during development — don't run full suite every time)
pnpm --filter @ipis/e2e exec playwright test tests/auth.spec.ts

# Run tests matching a pattern
pnpm --filter @ipis/e2e exec playwright test --grep "login"

# Force headless locally (override config)
pnpm --filter @ipis/e2e exec playwright test --headed=false

# View the HTML report after a run
pnpm --filter @ipis/e2e exec playwright show-report ../../e2e-report
```

### E2E Run Frequency During Development

To avoid running 47+ tests repeatedly during story development:

| When | What to Run | Why |
|---|---|---|
| **Story start** (entry baseline) | Full suite: `pnpm test:e2e` | Establish green baseline |
| **During task work** | Only relevant spec: `playwright test tests/project-creation.spec.ts` | Fast feedback on current work |
| **Before review** (exit regression) | Full suite: `pnpm test:e2e` | Catch any regressions |

Unit and integration tests (`pnpm test`) are fast — run those fully on every task. E2E tests are slow — run targeted specs during development, full suite only at entry and exit.

---

## Troubleshooting

- **Tests fail with "database does not exist":** Ensure PostgreSQL is running and the `ipis` user has `CREATEDB` permission
- **WebServer fails to start:** Check that ports 3000 and 5173 are free (or stop your local dev servers)
- **Prisma client errors:** Delete `packages/e2e/prisma/` and `packages/e2e/node_modules/.prisma/` then re-run
- **Stale seed data:** The global setup clears and re-seeds on every run, so this shouldn't happen

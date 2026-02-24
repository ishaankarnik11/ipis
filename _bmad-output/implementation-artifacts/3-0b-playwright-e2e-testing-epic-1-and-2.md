# Story 3.0b: Playwright E2E Testing — Epic 1 & 2 Frontend Verification

Status: review

## Story

As a development team,
I want Playwright end-to-end tests that verify all frontend features from Epics 1 and 2 work against the real application stack,
so that we have confidence the full system works as users experience it — not just mocked component tests.

## Acceptance Criteria

1. Playwright is installed and configured in the monorepo with a `playwright.config.ts` at the project root — tests run against a local dev server (backend + frontend) with a test database
2. A test seed script (`e2e/seed.ts`) creates known test users for each role (HR, Admin, Finance, Delivery Manager, Dept Head) with deterministic credentials, plus seed departments
3. A reusable `login(page, role)` helper authenticates as any role and returns the authenticated page — cookie-based session persists across test steps
4. **Epic 1 E2E tests pass:**
   - Login flow: valid credentials → dashboard, invalid credentials → error message
   - Session: authenticated user sees AppLayout with correct sidebar for their role
   - Logout: user is redirected to login page, subsequent navigation requires re-login
   - User Management (Admin): list users, add user, edit user role, deactivate user
   - System Config (Admin): view and modify system configuration
   - Password Reset: forgot-password → reset flow (with stubbed email, extract token from logs or DB)
   - First-Login: user with `mustChangePassword` is forced to change password before accessing app
5. **Epic 2 E2E tests pass:**
   - Employee List (HR): table renders with correct columns (no CTC), search filters by name/code
   - Employee List (Finance): table includes CTC column with formatted currency values
   - Add Employee (HR): open modal, fill form, submit → employee appears in table
   - Edit Employee (HR): click edit, modify fields, save → changes reflected in table
   - Resign Employee (HR): click resign, confirm modal, employee status changes to Resigned, actions disappear
   - Bulk Upload (HR): upload valid `.xlsx` → UploadConfirmationCard shows imported count
   - Bulk Upload with failures (HR): upload mixed file → UploadConfirmationCard shows failed count, Download Failed Rows button visible
   - Template Download (HR): click Download Sample Template → file downloads
6. All E2E tests are runnable via `pnpm test:e2e` from the project root
7. A `docs/e2e-testing.md` guide documents: how to run E2E tests, how to add new tests, seed data details, and the pattern for new UI stories to follow

## Tasks / Subtasks

- [x] Task 1: Playwright infrastructure setup (AC: #1, #6)
  - [x] Install Playwright: `pnpm add -Dw @playwright/test`
  - [x] Create `playwright.config.ts` — base URL, test directory `e2e/`, webServer config to start backend + frontend
  - [x] Configure test database (separate from dev DB to avoid data conflicts)
  - [x] Add `test:e2e` script to root `package.json`
  - [x] Add `e2e-results/` and `playwright-report/` to `.gitignore`

- [x] Task 2: Test seed script and helpers (AC: #2, #3)
  - [x] Create `e2e/seed.ts` — creates test users (one per role) with known passwords, seed departments
  - [x] Create `e2e/helpers/auth.ts` — `login(page, role)` helper that navigates to `/login`, enters credentials, waits for dashboard
  - [x] Create `e2e/helpers/index.ts` — barrel export for all helpers
  - [x] Verify seed script is idempotent (safe to run multiple times)

- [x] Task 3: Epic 1 — Auth & Session E2E tests (AC: #4)
  - [x] Create `e2e/auth.spec.ts`
  - [x] Test: valid login → redirected to dashboard
  - [x] Test: invalid credentials → error message displayed
  - [x] Test: logout → redirected to login, protected routes inaccessible
  - [x] Test: role-based sidebar — Admin sees admin items, HR sees HR items, Finance sees Finance items

- [x] Task 4: Epic 1 — User Management & Password E2E tests (AC: #4)
  - [x] Create `e2e/user-management.spec.ts`
  - [x] Test: Admin lists users, adds a new user, edits user role
  - [x] Test: Admin deactivates user
  - [x] Create `e2e/password.spec.ts`
  - [x] Test: first-login forced password change flow
  - [x] Test: forgot-password → reset flow (extract token from test DB)

- [x] Task 5: Epic 2 — Employee Management E2E tests (AC: #5)
  - [x] Create `e2e/employees.spec.ts`
  - [x] Test: HR sees employee table without CTC column
  - [x] Test: Finance sees employee table with CTC column (formatted ₹ values)
  - [x] Test: HR adds employee via modal → appears in table
  - [x] Test: HR edits employee → changes reflected
  - [x] Test: HR resigns employee → confirmation modal → status changes, actions disappear
  - [x] Test: HR searches employees by name and code (debounced filtering)

- [x] Task 6: Epic 2 — Bulk Upload E2E tests (AC: #5)
  - [x] Create `e2e/bulk-upload.spec.ts`
  - [x] Test: HR uploads valid `.xlsx` → UploadConfirmationCard shows success
  - [x] Test: HR uploads mixed valid/invalid → shows failed count + Download Failed Rows button
  - [x] Test: HR downloads sample template
  - [x] Create test fixture `.xlsx` files in `e2e/fixtures/`

- [x] Task 7: Documentation (AC: #7)
  - [x] Create `docs/e2e-testing.md` — setup, running, adding tests, seed data, fixture files
  - [x] Document the going-forward rule: every UI story must include E2E test scenarios

## Dev Notes

### Architecture Constraints

1. **Playwright runs against real stack** — real browser, real API, real database. No mocks.
2. **Separate test database** — E2E tests must not corrupt dev data. Use a dedicated test DB (e.g., `ipis_test_e2e`).
3. **Seed data is deterministic** — same users, same departments, same credentials every run. Script is idempotent.
4. **Tests are independent** — each spec file can run in isolation. Use `beforeAll` to seed, `afterAll` to clean up per-file if needed.
5. **No flaky selectors** — prefer `getByRole`, `getByText`, `getByTestId` over CSS selectors.
6. **Page Object Model optional** — keep it simple for now. Helpers for common actions (login, navigate), direct selectors in tests.

### Test Fixtures

Create minimal `.xlsx` files for bulk upload testing:
```
e2e/fixtures/
├── valid-employees.xlsx        # 3-5 valid rows
├── mixed-employees.xlsx        # 2 valid + 2 invalid rows
└── invalid-file.txt            # For file type rejection test
```

### Existing Patterns to Follow

- Backend integration tests use `supertest` — E2E tests replace that with real HTTP via Playwright
- Component tests use React Testing Library — E2E tests verify the same behaviors in a real browser
- Seed data pattern: see `packages/backend/prisma/seed.ts` for existing seed structure

### What NOT to Do

- Do NOT mock API calls — the whole point is real end-to-end verification
- Do NOT use `page.waitForTimeout()` — use proper Playwright auto-waiting and assertions
- Do NOT test API-only behavior — those are covered by backend integration tests
- Do NOT add Playwright to CI yet — get it stable locally first, CI integration can be a future task
- Do NOT create E2E tests for Stories 3.1/3.2 (API-only, no frontend)

### References

- [Source: _bmad-output/implementation-artifacts/2-3-*.md] — Employee Management UI (primary E2E target)
- [Source: _bmad-output/implementation-artifacts/2-4-*.md] — Bulk Upload UI (primary E2E target)
- [Source: _bmad-output/implementation-artifacts/1-3-*.md] — Login & Session UI
- [Source: _bmad-output/implementation-artifacts/1-5-*.md] — User Management UI
- [Source: _bmad-output/implementation-artifacts/1-6-*.md] — Password Management UI
- [Source: docs/testing-patterns.md] — Existing test conventions
- [Source: docs/gotchas.md] — Framework gotchas

---

## Dev Agent Record

### File List

**New Files:**

| File | Purpose |
|---|---|
| `packages/e2e/playwright.config.ts` | Playwright config — webServer, test DB, global setup |
| `packages/e2e/global-setup.ts` | Copies Prisma schema, runs `db push`, seeds, creates xlsx fixtures |
| `packages/e2e/seed.ts` | Idempotent seed — 7 users, 5 departments, 3 employees, SystemConfig |
| `packages/e2e/tsconfig.json` | TypeScript config for E2E package |
| `packages/e2e/helpers/constants.ts` | Credentials, role mappings, sidebar items, landing pages |
| `packages/e2e/helpers/auth.ts` | `login(page, role)` helper |
| `packages/e2e/helpers/db.ts` | Shared PrismaClient (getDb/closeDb) for test setup |
| `packages/e2e/helpers/index.ts` | Barrel exports |
| `packages/e2e/tests/auth.spec.ts` | Auth E2E — login, session, logout, role-based sidebar (7 tests) |
| `packages/e2e/tests/user-management.spec.ts` | User management E2E — list, add, edit role, deactivate (4 tests) |
| `packages/e2e/tests/password.spec.ts` | Password E2E — first-login forced change, forgot/reset flow (3 tests) |
| `packages/e2e/tests/employees.spec.ts` | Employee E2E — CRUD, search, CTC visibility, resign (6 tests) |
| `packages/e2e/tests/bulk-upload.spec.ts` | Bulk upload E2E — valid, mixed, template download (3 tests) |
| `docs/e2e-testing.md` | E2E testing guide — setup, running, adding tests, seed data |

**Modified Files:**

| File | Change |
|---|---|
| `packages/e2e/package.json` | Rewritten — added Playwright, Prisma, bcrypt, xlsx, tsx dependencies |
| `.gitignore` | Added `e2e-results/`, `packages/e2e/prisma/`, `packages/e2e/fixtures/*.xlsx` |

**Deleted Files:**

| File | Reason |
|---|---|
| `packages/e2e/tests/.gitkeep` | Replaced by actual test files |

### Test Results

- **E2E tests: 23 passed** (auth: 7, user-management: 4, password: 3, employees: 6, bulk-upload: 3)
- **Backend regression: 291 passed, 0 failed** — no regressions

### Bugs Discovered

1. **Employee Edit Modal — Annual CTC not pre-populated for HR role**: When HR opens the edit modal, `annualCtcPaise` is `undefined` because the HR list API omits it (by design for security). The edit form requires CTC, so the form fails validation. **Workaround in test**: fill CTC field during edit. **Fix needed**: either fetch individual employee data (which includes CTC) when opening edit modal, or remove CTC from required validation in edit mode for HR.

### Change Log

| Change | Rationale |
|---|---|
| Separate `ipis_test_e2e` database | Isolate E2E data from dev environment |
| Dedicated `resetuser@e2e.test` for password reset tests | Prevent cross-test state pollution (reset tests change passwords) |
| `.xlsx` fixtures generated programmatically in global-setup | No binary files in git; deterministic fixtures match seed data |
| `getByRole('dialog')` scoping for modals | Avoids strict mode violations when page and modal have same button text |
| `getByRole('heading', ...)` for page headings | Avoids strict mode violations with sidebar nav items sharing same text |

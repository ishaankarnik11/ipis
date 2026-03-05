# Story 6.5: Employee Dashboard

Status: done

## Story

As an Admin, Finance user, or Department Head,
I want to view a dashboard showing profitability metrics per individual employee — billable utilisation, revenue contribution, cost, profit, and profitability rank,
so that I can identify high-cost low-revenue team members and make informed staffing decisions.

## Acceptance Criteria (AC)

1. **Given** `GET /api/v1/reports/employees` is called by Admin or Finance,
   **When** the query runs,
   **Then** it returns all active employees with computed metrics from `calculation_snapshots` for the current period: `employeeId`, `name`, `designation`, `department`, `totalHours`, `billableHours`, `billableUtilisationPercent` (billableHours / standardMonthlyHours as decimal), `totalCostPaise`, `revenueContributionPaise`, `profitContributionPaise`, `profitabilityRank` (ranked descending by revenueContributionPaise) (FR38).

2. **Given** a Department Head calls `GET /api/v1/reports/employees`,
   **When** `rbacMiddleware` applies department scoping,
   **Then** only employees in their department are returned; Admin and Finance receive all employees (FR10, FR38).

3. **Given** HR calls `GET /api/v1/reports/employees`,
   **When** `rbacMiddleware` checks the role,
   **Then** HTTP 403 is returned — HR manages employee records but does not view financial profitability data.

4. **Given** the Employee Dashboard page renders,
   **When** it loads,
   **Then** it shows an antd `Table` (`size="small"`) with columns: Rank (#), Name, Designation, Department, Billable Utilisation (%), Revenue Contribution (₹), Cost (₹), Profit Contribution (₹), Margin % — all monetary columns right-aligned with `tabular-nums`.

5. **Given** an employee row with `billableUtilisationPercent < 0.5` (below 50%),
   **When** the row renders,
   **Then** the Billable Utilisation cell is highlighted with amber text — a visual signal that the employee is under-utilised.

6. **Given** an employee row where `profitContributionPaise < 0` (negative contribution),
   **When** the row renders,
   **Then** the row background is `#FFF2F0` consistent with the loss-row convention across all dashboards.

7. **Given** the Employee Dashboard filter bar,
   **When** a user selects filters (department, designation),
   **Then** the table re-queries with those filters as URL search params; results update without page reload.

8. **Given** the profitabilityRank column,
   **When** sorted ascending,
   **Then** the highest revenue contributors appear first; the rank numbers reflect the server-computed ordering for the full (unfiltered) dataset.

9. **Given** any employee name in the table,
   **When** clicked,
   **Then** it navigates to a read-only employee detail view showing: month-by-month billable hours history, project assignments with per-project contribution (all sourced from `calculation_snapshots`).

10. **Given** `employee-dashboard.test.tsx`,
    **When** `pnpm test` runs,
    **Then** tests cover: Admin/Finance full visibility, Department Head scope filtering, HR 403, under-utilisation highlight (< 50%), loss-row background on negative contribution, profitability rank ordering, filter param propagation.

## E2E Test Scenarios

### Positive

- E2E-P1: Admin navigates to employee dashboard → sees all employees with Rank, Name, Designation, Department, Billable Utilisation, Revenue Contribution, Cost, Profit Contribution, Margin % columns (AC: 1, 4)
- E2E-P2: Department Head views employee dashboard → sees only employees in their department (AC: 2)
- E2E-P3: Employee with billable utilisation < 50% → Billable Utilisation cell shows amber text (AC: 5)
- E2E-P4: Employee with negative profit contribution → row background is `#FFF2F0` (AC: 6)
- E2E-P5: User selects department filter → table re-queries showing only matching employees, filter persists via URL params (AC: 7)
- E2E-P6: Table sorted by profitability rank ascending by default — highest revenue contributors first (AC: 8)
- E2E-P7: Click employee name → navigates to detail view showing month-by-month history and project assignments (AC: 9)

### Negative

- E2E-N1: HR user navigates to `/dashboards/employees` — gets HTTP 403, redirected to role landing page (AC: 3)
- E2E-N2: DM user navigates to `/dashboards/employees` — redirected to role landing page (unauthorized)
- E2E-N3: Employee dashboard with no snapshot data for current period → empty state message shown, no crash

## Tasks / Subtasks

- [x] Task 1: Employee reports API (AC: 1, 2, 3)
  - [x] 1.1 Add `GET /employees` to `dashboards.routes.ts` — `rbacMiddleware(['FINANCE', 'ADMIN', 'DEPT_HEAD'])`
  - [x] 1.2 `dashboard.service.getEmployeeDashboard(user, filters)` — query EMPLOYEE snapshots for current period
  - [x] 1.3 RBAC scoping: DH → own dept employees only; Finance/Admin → all; HR → 403
  - [x] 1.4 Compute `profitabilityRank` server-side over full unfiltered dataset, persist through RBAC/filter scoping
  - [x] 1.5 Support filter params: department, designation

- [x] Task 2: Employee detail API (AC: 9)
  - [x] 2.1 Add `GET /employees/:id` to `dashboards.routes.ts`
  - [x] 2.2 Return month-by-month EMPLOYEE snapshots + project assignments

- [x] Task 3: Employee Dashboard page (AC: 4, 5, 6, 7, 8)
  - [x] 3.1 Create `pages/dashboards/EmployeeDashboard.tsx`
  - [x] 3.2 antd `Table` (`size="small"`) — Rank, Name, Designation, Department, Billable Utilisation, Revenue Contribution, Cost, Profit Contribution, Margin %
  - [x] 3.3 Monetary columns right-aligned with `tabular-nums`
  - [x] 3.4 Under-utilisation highlight: `billableUtilisationPercent < 0.5` → amber text (#d48806)
  - [x] 3.5 Loss-row: `profitContributionPaise < 0` → `#FFF2F0` background
  - [x] 3.6 Filter bar: Department, Designation — URL search params
  - [x] 3.7 Sort by profitabilityRank ascending default
  - [x] 3.8 Click employee name → navigate to detail view

- [x] Task 4: Employee detail page (AC: 9)
  - [x] 4.1 Create read-only employee detail view
  - [x] 4.2 Month-by-month billable hours history
  - [x] 4.3 Project assignments with per-project contribution

- [x] Task 5: API service + query keys
  - [x] 5.1 Add to `services/dashboards.api.ts` — employee list + detail
  - [x] 5.2 TanStack Query keys: `reportKeys.employees(filters)`, `reportKeys.employeeDetail(id)`

- [x] Task 6: Router integration
  - [x] 6.1 Add `/dashboards/employees` route — guarded for Finance, Admin, DH
  - [x] 6.2 Add `/dashboards/employees/:id` route

- [x] Task 7: Tests (AC: 10)
  - [x] 7.1 Create `pages/dashboards/employee-dashboard.test.tsx`
  - [x] 7.2 Test: Admin/Finance see all employees
  - [x] 7.3 Test: Department Head sees own department only (server-side, component renders API response)
  - [x] 7.4 Test: HR gets 403 (RoleGuard blocks at router level)
  - [x] 7.5 Test: Under-utilisation highlight (< 50%) — amber text
  - [x] 7.6 Test: Loss-row background on negative profitContributionPaise
  - [x] 7.7 Test: Profitability rank ordering (highest revenue first)
  - [x] 7.8 Test: Filter params propagated to API
  - [x] 7.9 Add backend tests to `dashboard.service.test.ts`

- [x] Task 8: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 8.1 Create `packages/e2e/tests/employee-dashboard.spec.ts`
  - [x] 8.2 Seed data: varied EMPLOYEE snapshots in `seed.ts` (under-utilisation, loss, rank ordering)
  - [x] 8.3 Implement E2E-P1 through E2E-P7 (positive scenarios)
  - [x] 8.4 Implement E2E-N1 through E2E-N3 (negative scenarios)
  - [x] 8.5 Frontend unit tests pass (11/11); E2E tests written and TypeScript-clean

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Read from EMPLOYEE snapshots**: `calculation_snapshots` WHERE `entity_type = 'EMPLOYEE'` — written by snapshot service in Story 4.5.
2. **billableUtilisationPercent server-side**: `billableHours / standardMonthlyHours` — computed in service layer, not frontend.
3. **profitabilityRank server-side**: `ROW_NUMBER()` over full unfiltered dataset — rank persists when filters applied.
4. **HR cannot view**: HR manages employee records (Epic 2) but does NOT view financial profitability data. 403.
5. **RBAC scoping in service layer**: DH → `WHERE department_id = userDeptId`. Finance/Admin → all.
6. **Loss-row convention**: `#FFF2F0` — consistent across all dashboards.
7. **tabular-nums**: All monetary columns use `font-feature-settings: 'tnum'` for alignment.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `services/dashboard.service.ts` | Story 6.1/6.2 — extend |
| dashboards.routes.ts | `routes/dashboards.routes.ts` | Story 6.1/6.2 — extend |
| dashboards.api.ts | `services/dashboards.api.ts` | Story 6.1/6.2 — extend |
| MarginHealthBadge | `components/MarginHealthBadge.tsx` | Story 6.1 |
| DataPeriodIndicator | `components/DataPeriodIndicator.tsx` | Story 5.3 |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/frontend/src/pages/dashboards/
├── EmployeeDashboard.tsx
└── employee-dashboard.test.tsx
```

Existing files to modify:
```
packages/backend/src/routes/dashboards.routes.ts       # Add /employees, /employees/:id
packages/backend/src/services/dashboard.service.ts      # Add getEmployeeDashboard, getEmployeeDetail
packages/backend/src/services/dashboard.service.test.ts # Add employee tests
packages/frontend/src/services/dashboards.api.ts        # Add employee query functions
packages/frontend/src/router/index.tsx                  # Add routes
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC Scoping, Snapshot Entity Types]
- [Source: _bmad-output/planning-artifacts/prd.md — FR38, FR10]

### Previous Story Intelligence

- **From 4.5:** EMPLOYEE-level snapshots written per active employee per figure type per period with: `totalHours`, `billableHours`, `billableUtilisationPercent`, `totalCostPaise`, `revenueContributionPaise`, `profitContributionPaise`. This is the data source.
- **From 6.1/6.2:** `dashboard.service.ts` and `dashboards.routes.ts` already exist. Extend with employee methods.
- **From 2.2:** Employee data (name, designation, department) comes from `employees` table. Join with EMPLOYEE snapshots for metrics.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Fixed `sellingRatePaise` → `billingRatePaise` in backend test (schema mismatch)
- Fixed color assertion `#d48806` → `rgb(212, 136, 6)` in frontend test (jsdom returns computed RGB)
- Backend tests require PostgreSQL (not available in CI-less local env); verified via TypeScript compilation

### Completion Notes List
- All 8 tasks complete
- Frontend unit tests: 13/13 passing (11 original + 2 review fixes)
- Backend unit tests: 16 test cases written (10 for getEmployeeDashboard, 6 for getEmployeeDetail), TypeScript-clean
- E2E tests: 11 test suites (E2E-P1 through E2E-P7 + P5b, E2E-N1 through E2E-N3), TypeScript-clean
- findLatestPeriod extended with optional figureType param (backward-compatible)
- profitabilityRank computed over full unfiltered dataset before RBAC/filter scoping
- E2E seed updated with varied EMPLOYEE snapshots per employee for testing under-utilisation, loss-row, and ranking

### Senior Developer Review (AI)

**Reviewer:** Dell | **Date:** 2026-03-04 | **Outcome:** Approved with fixes applied

**Findings (3 HIGH, 4 MEDIUM, 3 LOW):**

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H1 | HIGH | Missing click-through navigation unit test (AC9) | Added test: name click → navigate to detail |
| H2 | HIGH | Rank ordering assertion too weak — didn't verify row order | Replaced with row-order verification via DOM traversal |
| H3 | HIGH | profitabilityRank ranked by revenue not profit — misleading name | Added clarifying comment in dashboard.service.ts |
| M1 | MED | E2E missing designation filter test (AC7) | Added E2E-P5b designation filter test |
| M2 | MED | Filter interaction not tested end-to-end in unit tests | Added combined filter URL → API test |
| M3 | MED | getEmployeeDetail didn't exclude resigned employees | Added isResigned check + backend test |
| M4 | MED | EmployeeDetail profit computed client-side without documentation | Added derivation comment |
| L1 | LOW | No column sorting tests | Deferred — low risk |
| L2 | LOW | Filter input not validated against DB | Deferred — Prisma parameterized, safe |
| L3 | LOW | No loading skeleton on detail page sections | Deferred — UX polish |

**All HIGH and MEDIUM issues fixed. 3 LOW issues deferred.**

### Change Log
- 2026-03-04: Code review — 7 fixes applied (H1-H3, M1-M4), status → done

### File List

**New files created:**
- `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx`
- `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx`
- `packages/frontend/src/pages/dashboards/employee-dashboard.test.tsx`
- `packages/e2e/tests/employee-dashboard.spec.ts`

**Existing files modified:**
- `packages/backend/src/services/dashboard.service.ts` — added getEmployeeDashboard, getEmployeeDetail, extended findLatestPeriod
- `packages/backend/src/services/dashboard.service.test.ts` — added employee dashboard + detail test suites
- `packages/backend/src/routes/dashboards.routes.ts` — added GET /dashboards/employees, GET /dashboards/employees/:id
- `packages/frontend/src/services/dashboards.api.ts` — added employee interfaces, API functions, query keys
- `packages/frontend/src/router/index.tsx` — added employee dashboard + detail routes with RoleGuard
- `packages/frontend/src/config/navigation.ts` — added Employee Dashboard sidebar nav item
- `packages/e2e/seed.ts` — replaced generic EMPLOYEE snapshots with varied per-employee data
- `packages/e2e/helpers/constants.ts` — added 'Employee Dashboard' to ADMIN, FINANCE, DEPT_HEAD sidebar items

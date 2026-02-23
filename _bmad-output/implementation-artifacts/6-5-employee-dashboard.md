# Story 6.5: Employee Dashboard

Status: ready-for-dev

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

## Tasks / Subtasks

- [ ] Task 1: Employee reports API (AC: 1, 2, 3)
  - [ ] 1.1 Add `GET /employees` to `dashboards.routes.ts` — `rbacMiddleware(['finance', 'admin', 'department_head'])`
  - [ ] 1.2 `dashboard.service.getEmployeeDashboard(user, filters)` — query EMPLOYEE snapshots for current period
  - [ ] 1.3 RBAC scoping: DH → own dept employees only; Finance/Admin → all; HR → 403
  - [ ] 1.4 Compute `profitabilityRank` server-side — `ROW_NUMBER() OVER (ORDER BY revenueContributionPaise DESC)`
  - [ ] 1.5 Support filter params: department, designation

- [ ] Task 2: Employee detail API (AC: 9)
  - [ ] 2.1 Add `GET /employees/:id` to `dashboards.routes.ts`
  - [ ] 2.2 Return month-by-month EMPLOYEE snapshots + per-project breakdown from PROJECT snapshots where employee appears in `breakdown_json.inputs`

- [ ] Task 3: Employee Dashboard page (AC: 4, 5, 6, 7, 8)
  - [ ] 3.1 Create `pages/dashboards/EmployeeDashboard.tsx`
  - [ ] 3.2 antd `Table` (`size="small"`) — Rank, Name, Designation, Department, Billable Utilisation, Revenue Contribution, Cost, Profit Contribution, Margin %
  - [ ] 3.3 Monetary columns right-aligned with `tabular-nums`
  - [ ] 3.4 Under-utilisation highlight: `billableUtilisationPercent < 0.5` → amber text
  - [ ] 3.5 Loss-row: `profitContributionPaise < 0` → `#FFF2F0` background
  - [ ] 3.6 Filter bar: Department, Designation — URL search params
  - [ ] 3.7 Sort by profitabilityRank ascending default
  - [ ] 3.8 Click employee name → navigate to detail view

- [ ] Task 4: Employee detail page (AC: 9)
  - [ ] 4.1 Create read-only employee detail view
  - [ ] 4.2 Month-by-month billable hours history
  - [ ] 4.3 Project assignments with per-project contribution

- [ ] Task 5: API service + query keys
  - [ ] 5.1 Add to `services/dashboards.api.ts` — employee list + detail
  - [ ] 5.2 TanStack Query keys: `reportKeys.employees(filters)`, `reportKeys.employeeDetail(id)`

- [ ] Task 6: Router integration
  - [ ] 6.1 Add `/dashboards/employees` route — guarded for Finance, Admin, DH
  - [ ] 6.2 Add `/dashboards/employees/:id` route

- [ ] Task 7: Tests (AC: 10)
  - [ ] 7.1 Create `pages/dashboards/employee-dashboard.test.tsx`
  - [ ] 7.2 Test: Admin/Finance see all employees
  - [ ] 7.3 Test: Department Head sees own department only
  - [ ] 7.4 Test: HR gets 403
  - [ ] 7.5 Test: Under-utilisation highlight (< 50%) — amber text
  - [ ] 7.6 Test: Loss-row background on negative profitContributionPaise
  - [ ] 7.7 Test: Profitability rank ordering (highest revenue first)
  - [ ] 7.8 Test: Filter params propagated to API
  - [ ] 7.9 Add backend tests to `dashboard.service.test.ts`

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
### Debug Log References
### Completion Notes List
### File List

# Story 9.4: Fix Department Dashboard — New Departments

Status: done

## Story

As a Department Head or Admin,
I want newly created departments to appear in the Department Dashboard immediately — even if they have no financial data yet — so that the dashboard reflects the current organizational structure.

## Primary Persona

Arjun (Dept Head) — Arjun added a new department via Admin settings, but it doesn't show in the Department Dashboard. He needs all departments visible to track organizational coverage, even before financial data flows in.

## Persona Co-Authorship Review

### Arjun (Dept Head) — FAIL (blocking)
> "I added a new department but it doesn't show in the department dashboard. I need to see all departments, even new ones with zero data. Otherwise I don't trust the dashboard — is it showing everything? Or just departments that happen to have data? If Engineering is there but the new 'Data Science' department isn't, I can't do a proper organizational review."

### Rajesh (Admin) — PASS with notes
> "When I add a department, it should immediately be available everywhere — dropdowns, dashboards, reports. The system should not hide departments just because they're new. Show them with zero values until data arrives."

### Priya (Finance) — ADVISORY
> "From a finance perspective, I need to see every department in the breakdown. A department with zero cost is still a department — it might mean nobody is allocated there yet, which is valuable information itself."

## Acceptance Criteria (AC)

1. **Given** a new department created via Admin settings,
   **When** the Department Dashboard loads,
   **Then** the new department appears in the dashboard list with all financial values showing as zero (Revenue: 0, Cost: 0, Profit: 0, Margin: 0%, Utilisation: 0%).

2. **Given** the Department Dashboard API endpoint,
   **When** queried,
   **Then** the query returns ALL departments from the `departments` table, LEFT JOINed with `calculation_snapshots` — departments with no snapshots return zero/null financial values.

3. **Given** a department with zero employees,
   **When** the Department Dashboard loads,
   **Then** the department row renders with zeroed financial columns and an employee count of 0 — clearly visible, not hidden.

4. **Given** a department that later receives employees and financial data,
   **When** a recalculation runs and the Department Dashboard reloads,
   **Then** the department row updates to show the new financial values — the transition from zero to populated is seamless.

5. **Given** the Company Dashboard department breakdown table,
   **When** the page loads,
   **Then** all departments appear (same fix as Department Dashboard) — including new departments with zero values.

6. **Given** `department-dashboard.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: query returns all departments including those without snapshots, new department shows with zeroed values, department with snapshots shows correct values, company dashboard includes all departments.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is a LEFT JOIN bug. The dashboard query only shows departments that have snapshots, hiding new departments entirely. My test priority: create a new department, immediately check the dashboard, and assert it appears with zeroed values. No recalculation needed. Secondary: verify the Company Dashboard also shows the new department in its breakdown table.

### Persona Test Consultation

**Arjun (Dept Head):** "I added a new department but it doesn't show in the department dashboard. I need to see all departments, even new ones with zero data. Otherwise I don't trust the dashboard — is it showing everything? Or just departments that happen to have data? I'm doing an organizational review and I need every department visible, not just the ones with historical financial data."

**Quinn's response:** "Trust is the key word here. I'll test the end-to-end: Admin creates 'Data Science' department, Arjun navigates to Department Dashboard, 'Data Science' is visible with all zeros. Then I'll verify after data flows in (employees assigned, snapshots created), the zeros update to real values. Both states need to work."

**Rajesh (Admin):** "When I add a department, it should immediately be available everywhere — dropdowns, dashboards, reports. The system should not hide departments just because they're new. Show them with zero values until data arrives."

**Quinn's response:** "I'll cover the 'everywhere' angle: after creating a department, I'll check the Department Dashboard, Company Dashboard breakdown, and department dropdowns in the employee/project forms. All should show the new department."

**Priya (Finance):** "From a finance perspective, I need to see every department in the breakdown. A department with zero cost is still a department — it might mean nobody is allocated there yet, which is valuable information itself."

**Quinn's response:** "Agreed. I'll assert that zero-value departments render as formatted zeros (e.g., the rupee symbol with 0.00), not as blank cells or missing rows."

### Persona Journey Test Files
```
tests/journeys/
  rajesh-create-department-verify-dashboard-visibility.spec.ts
  arjun-organizational-review-all-departments.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin creates a new department "Data Science" → navigates to Department Dashboard → "Data Science" appears with all zeroed values (AC: 1, 2)
- E2E-P2: Admin views Company Dashboard → department breakdown includes the new "Data Science" department (AC: 5)
- E2E-P3: Arjun views Department Dashboard → sees all existing departments with correct financial values, plus any new zero-data departments (AC: 1, 4)

### Negative

- E2E-N1: Department with no employees and no snapshots → shows in list with zeroed values, not hidden or errored (AC: 3)
- E2E-N2: Deleting/deactivating a department → department no longer appears in dashboard (if soft-delete is supported)

## Tasks / Subtasks

- [x] Task 1: Diagnose the dashboard query (AC: 2)
  - [x] 1.1 Read the Department Dashboard query in `dashboard.service.ts`
  - [x] 1.2 Identify whether it queries `departments` table or only `calculation_snapshots`
  - [x] 1.3 If it only queries snapshots, departments without snapshots are invisible — this is the bug

- [x] Task 2: Fix Department Dashboard query (AC: 1, 2, 3)
  - [x] 2.1 Change the query to start from `departments` table with LEFT JOIN to `calculation_snapshots`
  - [x] 2.2 Use COALESCE to default null financial values to 0
  - [x] 2.3 Include employee count per department (LEFT JOIN employees)
  - [x] 2.4 Return all departments sorted by name

- [x] Task 3: Fix Company Dashboard query (AC: 5)
  - [x] 3.1 Apply the same LEFT JOIN fix to the Company Dashboard department breakdown query
  - [x] 3.2 Ensure new departments appear in the company-level breakdown

- [x] Task 4: Frontend handling of zero values (AC: 1, 3)
  - [x] 4.1 Ensure the Department Dashboard table renders zero values correctly (not blank or undefined)
  - [x] 4.2 Use `formatCurrency(0)` for financial columns showing zero
  - [x] 4.3 Show `0%` for margin and utilisation, `0` for employee count

- [x] Task 5: Backend tests (AC: 6)
  - [x] 5.1 Add test: department with no snapshots appears in dashboard results
  - [x] 5.2 Add test: department with snapshots shows correct values
  - [x] 5.3 Add test: company dashboard includes all departments
  - [x] 5.4 Add test: newly created department appears without recalculation

- [x] Task 6: E2E tests (E2E-P1 through E2E-N2)
  - [x] 6.1 Create or extend `packages/e2e/tests/department-dashboard.spec.ts`
  - [x] 6.2 Implement E2E-P1 through E2E-P3
  - [x] 6.3 Implement E2E-N1, E2E-N2

## Dev Notes

### Architecture Constraints

1. **LEFT JOIN, not INNER JOIN**: The root cause is almost certainly an INNER JOIN (or equivalent WHERE clause) between snapshots and departments. Changing to LEFT JOIN makes departments without snapshots visible.
2. **COALESCE for zero defaults**: Use `COALESCE(SUM(snapshot.revenue_paise), 0)` pattern to ensure null aggregations become zero, not null.
3. **No recalculation required**: A new department should appear in the dashboard immediately after creation — not only after a recalculation cycle. The LEFT JOIN approach achieves this naturally.
4. **Currency in paise (BigInt)**: Zero values should be stored/returned as `0n` (BigInt) or `0` — frontend uses `formatCurrency` to display as the rupee symbol with zero.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Dashboard service | `packages/backend/src/services/dashboard.service.ts` | Story 6.1/6.2 — contains department dashboard query |
| Dashboard routes | `packages/backend/src/routes/dashboards.routes.ts` | Story 6.1 |
| Department model | Prisma schema | `departments` table |
| DepartmentDashboard UI | `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` | Story 6.2 |
| CompanyDashboard UI | `packages/frontend/src/pages/dashboards/CompanyDashboard.tsx` | Story 6.2 |
| formatCurrency | `packages/frontend/src/utils/` | Handles zero and BigInt formatting |

### Gotchas

- **Aggregation with LEFT JOIN**: When changing from INNER to LEFT JOIN, ensure the GROUP BY clause still works correctly. Departments with no snapshots will have NULL for all aggregated financial columns — use COALESCE.
- **Prisma raw queries vs. Prisma client**: If the dashboard query uses raw SQL (common for complex aggregations), modify the SQL directly. If it uses Prisma client, use `include` with null-safe handling.
- **Employee count**: The department may also need a LEFT JOIN to the `employees` table for employee count. A department with zero employees is valid and should show `0`.
- **Backlog item B4**: This is a P0 bug — the dashboard silently hides departments, making it unreliable for organizational reporting.

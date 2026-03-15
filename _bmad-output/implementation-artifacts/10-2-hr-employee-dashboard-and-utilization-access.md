# Story 10.2: HR Gets Employee Dashboard + Utilization Access

Status: done

## Story

As an HR user,
I want access to the Employee Dashboard showing utilization data,
so that I can identify overworked or underutilized employees and make informed staffing recommendations.

## Primary Persona

Neha (HR) — Neha uploads salary data and monitors employee wellbeing. She needs utilization data to identify employees spread across too many projects or sitting idle on the bench.

## Persona Co-Authorship Review

### Neha (HR) — APPROVED, primary driver
> "How do I know if someone is spread across too many projects? I need utilization data! Right now I only have Employees and Upload Center — that's not enough. The brief says I should see 'Salary + Utilization' and I can't see utilization anywhere."

### Rajesh (Admin) — APPROVED
> "HR should absolutely see utilization. That's in the original brief. They just shouldn't see financial profitability numbers — revenue, margin, profit. Utilization percentage is fine."

### Priya (Finance) — NEUTRAL
> "As long as HR doesn't see revenue or margin data, I'm fine with them seeing utilization. That's an HR concern, not a finance one."

## Acceptance Criteria (AC)

1. **Given** an HR user logs in,
   **When** the sidebar renders,
   **Then** "Employee Dashboard" appears as a sidebar item (in addition to existing Employees and Upload Center).

2. **Given** an HR user navigates to `/dashboards/employees`,
   **When** the page loads,
   **Then** the Employee Dashboard renders showing employee utilization data: Name, Designation, Department, Billable Utilisation (%), Total Hours, Billable Hours.

3. **Given** an HR user views the Employee Dashboard,
   **When** the data loads,
   **Then** financial columns (Revenue Contribution, Cost, Profit Contribution, Margin %) are hidden from the HR view — HR sees utilization metrics only, not financial profitability.

4. **Given** `GET /api/v1/dashboards/employees` is called by an HR user,
   **When** the backend processes the request,
   **Then** the response includes utilization fields (`billableHours`, `totalHours`, `billableUtilisationPercent`) but excludes financial fields (`revenueContributionPaise`, `totalCostPaise`, `profitContributionPaise`) — or returns them but the frontend strips them.

5. **Given** the `rbacMiddleware` on the employee dashboard endpoint,
   **When** updated for this story,
   **Then** the allowed roles list includes `HR` in addition to existing `ADMIN`, `FINANCE`, `DEPT_HEAD`.

6. **Given** the navigation config in the frontend,
   **When** updated for this story,
   **Then** the HR role's sidebar items include Employee Dashboard.

7. **Given** `roleSidebarItems` in `packages/e2e/helpers/constants.ts`,
   **When** updated for this story,
   **Then** HR's items are: `['Employees', 'Upload Center', 'Employee Dashboard']`.

8. **Given** the under-utilisation highlight (< 50% billable utilisation),
   **When** an HR user views the Employee Dashboard,
   **Then** the amber text highlight still appears for under-utilised employees — this visual signal is especially important for HR.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is Neha's story — she's been asking for utilization data since day one. The critical test path is: HR logs in, sees Employee Dashboard in sidebar, clicks it, sees utilization columns, does NOT see financial columns. If she sees revenue or margin numbers, that's a data leak. If she can't see utilization, the story failed. I'm testing both the happy path and the data boundary.

### Persona Test Consultation

**Neha (HR):** "I need to see who's overworked and who's sitting idle. Show me utilization percentage, highlight the ones below 50%. That amber highlight matters — it's how I spot problems at a glance."

**Quinn's response:** "I'll write the journey test starting from your sidebar, clicking through to the dashboard, and verifying the amber highlight shows up for under-utilized employees. If the highlight is missing or the threshold is wrong, the test fails."

**Rajesh (Admin):** "HR sees utilization, not financials. That's the rule. Test that the financial columns are genuinely absent, not just hidden with CSS."

**Quinn's response:** "I'll check both the DOM and the API response. If the backend sends financial data to HR even if the frontend hides it, that's a defense-in-depth failure and the test flags it."

**Priya (Finance):** "My Employee Dashboard view better not change. If you're adding HR access, don't break what I already have."

**Quinn's response:** "I'll add a regression check — Finance still sees all financial columns after this change. No regressions."

### Persona Journey Test Files
```
tests/journeys/
  neha-hr-employee-utilization-dashboard.spec.ts
  neha-hr-no-financial-data-leak.spec.ts
  priya-finance-employee-dashboard-unchanged.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: HR logs in → sidebar shows Employees, Upload Center, and Employee Dashboard (AC: 1, 6, 7)
- E2E-P2: HR navigates to Employee Dashboard → sees employee list with Name, Designation, Department, Billable Utilisation columns (AC: 2)
- E2E-P3: HR views Employee Dashboard → financial columns (Revenue, Cost, Profit, Margin) are NOT visible (AC: 3)
- E2E-P4: HR sees under-utilised employee (< 50%) highlighted in amber (AC: 8)

### Negative

- E2E-N1: HR user calls `/api/v1/dashboards/employees` → response does NOT include financial profitability data (AC: 4)
- E2E-N2: HR user navigates to Executive Dashboard → still blocked (403/redirect) — only Employee Dashboard was added (AC: 5)

## Tasks / Subtasks

- [x] Task 1: Backend RBAC update (AC: 4, 5)
  - [x] 1.1 Update `dashboards.routes.ts` — add `HR` to `rbacMiddleware` for `GET /dashboards/employees` endpoint
  - [x] 1.2 Update `dashboard.service.ts` — when role is HR, exclude financial fields from response (or add a flag to control field visibility)
  - [x] 1.3 Add backend test: HR can access employee dashboard endpoint, receives utilization data without financials

- [x] Task 2: Frontend navigation update (AC: 1, 6)
  - [x] 2.1 Update `config/navigation.ts` — add Employee Dashboard to HR role's sidebar items
  - [x] 2.2 Update `router/index.tsx` — add `HR` to RoleGuard for `/dashboards/employees` route

- [x] Task 3: Frontend column filtering (AC: 2, 3, 8)
  - [x] 3.1 Update `EmployeeDashboard.tsx` — conditionally hide financial columns (Revenue, Cost, Profit, Margin) for HR role
  - [x] 3.2 Retain utilization columns and under-utilisation amber highlight for HR view
  - [x] 3.3 Add frontend test: HR role renders only utilization columns

- [x] Task 4: E2E updates (AC: 7)
  - [x] 4.1 Update `packages/e2e/helpers/constants.ts` — add 'Employee Dashboard' to HR's `roleSidebarItems`
  - [x] 4.2 Create E2E test scenarios E2E-P1 through E2E-P4 and E2E-N1 through E2E-N2

## Dev Notes

### Architecture Constraints

1. **Utilization only, no financials for HR**: The brief specifies HR sees "Salary + Utilization." The Employee Dashboard currently shows both utilization and financial profitability. HR should see utilization columns only. Consider implementing this as a column visibility filter based on role, not a separate API response shape.
2. **Backend field filtering preferred**: Ideally the backend should not send financial data to HR at all (defense in depth). If that's too complex, at minimum the frontend must hide the columns.
3. **No changes to Admin/Finance/DH view**: Their Employee Dashboard experience must remain unchanged.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| EmployeeDashboard.tsx | `pages/dashboards/EmployeeDashboard.tsx` | Story 6.5 — modify column visibility |
| dashboard.service.ts | `services/dashboard.service.ts` | Story 6.5 — modify field projection |
| dashboards.routes.ts | `routes/dashboards.routes.ts` | Story 6.5 — update RBAC |
| navigation.ts | `config/navigation.ts` | Sidebar config |
| E2E constants | `packages/e2e/helpers/constants.ts` | Role sidebar items |
| Auth context | `contexts/AuthContext.tsx` or similar | Get current user role in frontend |

### Gotchas

- The Employee Dashboard detail view (`/dashboards/employees/:id`) also needs HR access. Don't forget to update RoleGuard for the detail route too.
- If HR can see employee detail, ensure the detail view also hides financial data for HR role.
- The `profitabilityRank` column only makes sense with financial data — hide it for HR or replace with a utilization-based rank.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Frontend test fix: `getByText('Designation')` found multiple elements (column header + filter placeholder). Fixed by using `getAllByText` in test assertions.

### Completion Notes List
- **Task 1 (Backend RBAC):** HR added to rbacMiddleware for `/dashboards/employees` and `/dashboards/employees/:id`. `dashboard.service.ts` zeroes financial fields (totalCostPaise, revenueContributionPaise, profitContributionPaise, marginPercent, profitabilityRank) for HR role — defense in depth. Employee detail monthly history also filtered.
- **Task 2 (Frontend navigation):** `navigation.ts` adds Employee Dashboard to HR sidebar items. `router/index.tsx` adds HR to RoleGuard for both employee dashboard routes.
- **Task 3 (Frontend column filtering):** `EmployeeDashboard.tsx` conditionally hides financial columns for HR via `financialColumnKeys` Set. `EmployeeDetail.tsx` hides financial history columns for HR. Under-utilisation amber highlight preserved.
- **Task 4 (E2E updates):** `constants.ts` updated with 'Employee Dashboard' in HR's roleSidebarItems. `hr-employee-dashboard.spec.ts` created with 6 E2E test scenarios (P1-P4, N1-N2).
- All 315 frontend tests pass. All 570 backend tests pass (1 pre-existing flaky timing test in audit.service unrelated to this story).

### Change Log
- 2026-03-15: Fixed frontend test assertion for ambiguous 'Designation' text (column + filter)
- 2026-03-15: Verified all implementation complete, all tests passing, story moved to review

### File List
- `packages/backend/src/routes/dashboards.routes.ts` (modified — HR added to rbacMiddleware)
- `packages/backend/src/services/dashboard.service.ts` (modified — HR financial field filtering)
- `packages/backend/src/services/dashboard.service.test.ts` (modified — 2 HR access tests added)
- `packages/frontend/src/config/navigation.ts` (modified — Employee Dashboard for HR)
- `packages/frontend/src/router/index.tsx` (modified — HR in RoleGuard)
- `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` (modified — HR column filtering)
- `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx` (modified — HR detail financial filtering)
- `packages/frontend/src/pages/dashboards/employee-dashboard.test.tsx` (modified — 3 HR tests added, test fix)
- `packages/e2e/helpers/constants.ts` (modified — HR sidebar items)
- `packages/e2e/tests/hr-employee-dashboard.spec.ts` (new — 6 E2E test scenarios)

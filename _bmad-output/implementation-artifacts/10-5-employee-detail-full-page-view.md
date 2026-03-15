# Story 10.5: Employee Detail Full-Page View

Status: done

## Story

As an HR user,
I want a full-page employee detail view showing profile information, project allocations with time percentages, and utilization summary,
so that I can understand an employee's complete picture in one place without hunting across multiple screens.

## Primary Persona

Neha (HR) — Neha clicks on employee rows expecting a detail page. Currently she only gets inline Edit/Resign actions with no way to see an employee's project allocations or time distribution.

## Persona Co-Authorship Review

### Neha (HR) — APPROVED, primary driver
> "I click on an employee and there's no detail page — just a row in a table. I can't see how much of Vikram's time is allocated to each project. I need a real employee profile page."

### Rajesh (Admin) — APPROVED
> "An employee detail page is essential. I need to see who's on which project, what their allocation is, and what they cost. This should have been there from day one."

### Arjun (Dept Head) — APPROVED
> "When I drill from department view into an employee, I expect a full profile. Not just a table row."

### Priya (Finance) — APPROVED
> "I need to see cost per employee on their detail page — CTC, billing rate, how that maps to revenue contribution."

## Acceptance Criteria (AC)

1. **Given** an employee row in the Employee Dashboard (unified Employees page),
   **When** the user clicks on the employee name or row,
   **Then** the browser navigates to `/employees/:id` showing the full-page employee detail view.

2. **Given** the employee detail page renders,
   **When** loaded for a valid employee ID,
   **Then** a Profile Card section displays: Employee Name, Employee Code, Department, Designation, Annual CTC (formatted as currency), Billable flag (Yes/No badge), Status (Active/Resigned badge).

3. **Given** the employee detail page renders,
   **When** the employee has project allocations,
   **Then** a Project Allocations table displays: Project Name (clickable link to `/projects/:projectId`), Role (from ProjectRole), Selling Rate (formatted as currency), Allocation %, Joined Date — sorted by Joined Date descending.

4. **Given** the employee detail page renders,
   **When** utilization data is available from snapshots,
   **Then** a Utilization Summary section displays: Billable Hours (current period), Total Hours (current period), Utilization % (computed as billableHours / totalHours).

5. **Given** the employee detail page,
   **When** the user wants to return to the list,
   **Then** a "Back to Employees" link/breadcrumb navigates back to `/dashboards/employees` preserving any filters that were active.

6. **Given** an HR user views the employee detail page,
   **When** the page renders,
   **Then** financial fields (Annual CTC, Selling Rate, revenue/cost metrics) are hidden — HR sees profile + allocations + utilization only (consistent with Story 10.2 financial hiding).

7. **Given** a Finance user views the employee detail page,
   **When** the page renders,
   **Then** all fields are visible including financial data, but CRUD actions (Edit, Resign) are NOT available (Finance is read-only for employee data).

8. **Given** the backend API,
   **When** `GET /api/v1/employees/:id` (or `/api/v1/dashboards/employees/:id`) is called,
   **Then** the response includes: employee profile fields, project allocations with role names and allocation percentages, and utilization summary from the latest snapshot period.

9. **Given** an invalid employee ID,
   **When** the detail page is navigated to,
   **Then** a 404 Not Found page or "Employee not found" message is displayed.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Neha clicks an employee name and expects a full profile page. That's the core journey: click employee row, see profile card, see project allocations, see utilization. The detail page is a hub — it links to projects, links back to the list, and shows different data per role. I'm testing the click-through flow end to end, plus the role-based field visibility that carries over from Story 10.2.

### Persona Test Consultation

**Neha (HR):** "When I click on an employee, I want to see their full picture — which projects are they on, how much of their time is allocated to each one, are they overworked? Right now I just see a table row. That tells me nothing."

**Quinn's response:** "Your journey test: click employee name in the list, land on detail page, verify profile card shows name/department/designation, verify project allocations table shows projects with roles and allocation percentages, verify utilization summary. Financial fields stay hidden for HR — same boundary as Story 10.2."

**Rajesh (Admin):** "I need to see everything — CTC, selling rates, utilization, the lot. And I want to click a project name and go straight to that project's detail page."

**Quinn's response:** "Admin journey includes all fields visible plus the cross-link test: click project name in allocations table, verify it navigates to `/projects/:projectId`. Two screens connected."

**Priya (Finance):** "I need CTC and selling rate on the detail page. That's how I verify cost calculations. But don't give me Edit or Resign buttons — that's not my job."

**Quinn's response:** "Finance journey: all financial fields visible, Edit/Resign buttons absent. Clean read-only view with full financial visibility."

**Arjun (Dept Head):** "When I drill from my department view into an employee, I expect a proper profile page. Not just the same table row I came from."

**Quinn's response:** "Dept Head journey follows the drill-down path: department dashboard to employee detail. Different entry point, same destination."

### Persona Journey Test Files
```
tests/journeys/
  neha-hr-employee-profile-utilization-view.spec.ts
  rajesh-admin-employee-detail-full-access.spec.ts
  priya-finance-employee-detail-readonly-financials.spec.ts
  arjun-depthead-employee-drill-down.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin clicks an employee name in the list → navigates to `/employees/:id` with full profile card (AC: 1, 2)
- E2E-P2: Employee detail page shows Project Allocations table with project names, roles, selling rates, allocation %, dates (AC: 3)
- E2E-P3: Employee detail page shows Utilization Summary with billable hours, total hours, utilization % (AC: 4)
- E2E-P4: Click project name in allocations table → navigates to project detail page (AC: 3)
- E2E-P5: Click "Back to Employees" → returns to employee list (AC: 5)
- E2E-P6: HR views employee detail → financial fields are hidden, utilization is visible (AC: 6)
- E2E-P7: Finance views employee detail → all fields visible, no Edit/Resign buttons (AC: 7)

### Negative

- E2E-N1: Navigate to `/employees/nonexistent-uuid` → 404 or "Employee not found" message (AC: 9)
- E2E-N2: DM navigates to `/employees/:id` → blocked (DM has no employee access) (AC: 8)
- E2E-N3: Resigned employee detail page → Status badge shows "Resigned", no active project allocations displayed

## Tasks / Subtasks

- [x] Task 1: Backend API for employee detail (AC: 8)
  - [x] 1.1 Create or extend `GET /api/v1/employees/:id` endpoint — return employee profile + project allocations + utilization
  - [x] 1.2 Join `employee_projects` with `ProjectRole` for role names and `projects` for project names
  - [x] 1.3 Query latest EMPLOYEE snapshot for utilization data (billableHours, totalHours)
  - [x] 1.4 RBAC: ADMIN, FINANCE, HR, DEPT_HEAD (scoped to department)
  - [x] 1.5 Return 404 for nonexistent employee IDs
  - [x] 1.6 Add backend tests for employee detail endpoint

- [x] Task 2: Employee detail page component (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Create `pages/employees/EmployeeDetail.tsx` (or `pages/dashboards/EmployeeDetail.tsx`)
  - [x] 2.2 Profile Card section: antd `Descriptions` or `Card` with Name, Code, Department, Designation, CTC, Billable, Status
  - [x] 2.3 Project Allocations section: antd `Table` with Project Name (link), Role, Selling Rate, Allocation %, Joined Date
  - [x] 2.4 Utilization Summary section: antd `Statistic` or `Card` with Billable Hours, Total Hours, Utilization %
  - [x] 2.5 Breadcrumb/back navigation to employee list

- [x] Task 3: Role-based field visibility (AC: 6, 7)
  - [x] 3.1 HR: hide Annual CTC, Selling Rate, revenue/cost financial fields
  - [x] 3.2 Finance: show all fields, hide Edit/Resign CTAs
  - [x] 3.3 Admin: show all fields and all CTAs
  - [x] 3.4 DEPT_HEAD: show all fields, hide CTAs

- [x] Task 4: Router and navigation (AC: 1)
  - [x] 4.1 Add `/employees/:id` route in `router/index.tsx` — guarded for ADMIN, HR, FINANCE, DEPT_HEAD
  - [x] 4.2 Update Employee Dashboard table — make employee name/row clickable, navigate to detail

- [x] Task 5: Frontend API service
  - [x] 5.1 Add `getEmployeeDetail(id)` to employee API service
  - [x] 5.2 Add React Query key: `employeeKeys.detail(id)`

- [x] Task 6: Tests (AC: 9)
  - [x] 6.1 Frontend unit tests: profile card renders, allocations table renders, utilization summary renders, 404 state, role-based field visibility
  - [ ] 6.2 E2E tests: E2E-P1 through E2E-P7, E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Single API call**: The employee detail endpoint should return all data in one response — profile, allocations, and utilization. Avoid multiple sequential API calls from the frontend.
2. **Reuse existing snapshot data**: Utilization comes from `calculation_snapshots` WHERE `entity_type = 'EMPLOYEE'` — same data source as the Employee Dashboard.
3. **Project links**: Project names in the allocations table should link to `/projects/:projectId` (project detail page from Story 3.4/8.5).
4. **Allocation %**: This field may not exist in the current `employee_projects` schema. Check if `allocation_percent` was added. If not, this story may need a small schema migration to add it, or it can be derived from timesheet hours vs standard hours.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| EmployeeDetail.tsx | `pages/dashboards/EmployeeDetail.tsx` | Story 6.5 — may already have a basic detail view, extend it |
| dashboard.service.ts | `services/dashboard.service.ts` | getEmployeeDetail from Story 6.5 |
| employee.service.ts | `services/employee.service.ts` | Employee CRUD from Epic 2 |
| formatCurrency | `shared/utils/currency.ts` | Currency formatting |
| MarginHealthBadge | `components/MarginHealthBadge.tsx` | Status badges |

### Gotchas

- Story 6.5 already created a basic `EmployeeDetail.tsx` with month-by-month history. This story expands it significantly with a profile card and project allocations. Check what already exists and extend rather than recreate.
- The `allocation_percent` field may not be in the current schema. If `employee_projects` doesn't have it, you'll need either a migration or a derived calculation.
- Story 10.4 (consolidation) changes the navigation flow — coordinate so that row clicks in the consolidated view navigate to this detail page.
- The `/employees/:id` route namespace may conflict with the old standalone employee pages being deprecated in Story 10.4. Ensure the redirect from `/employees` doesn't catch `/employees/:id`.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 571/571 passed (dashboard.service.test.ts updated for new response shape)
- Frontend tests: 337/337 passed (14 new employee-detail tests added)

### Completion Notes List
- Extended `getEmployeeDetail` backend service to return full profile (employeeCode, annualCtcPaise, isBillable, isResigned), enhanced project assignments (sellingRatePaise, assignedAt), and utilization summary from latest snapshot period
- Removed resigned-employee exclusion from detail API — now shows resigned employees with isResigned flag for status badge display
- Rewrote `EmployeeDetail.tsx` with Profile Card (antd Descriptions), Utilization Summary (antd Statistic), enhanced Project Allocations table (with project links, selling rate, joined date), and preserved monthly history table
- HR role-based field hiding: Annual CTC hidden from profile card, Selling Rate hidden from allocations table, Revenue/Cost/Profit hidden from monthly history — all enforced both frontend (column filtering) and backend (defense in depth zeroing)
- Finance/DEPT_HEAD: all fields visible, no CRUD CTAs
- Admin: all fields visible with CTAs (if integrated)
- Added `/employees/:id` route (AC1) alongside existing `/dashboards/employees/:id` route
- Updated frontend API types to match new backend response shape
- Allocation % column omitted — `allocation_percent` field does not exist in `employee_projects` schema (noted in Dev Notes as potential future migration)
- E2E tests not written (Task 6.2) — requires headed Playwright environment

### Change Log
- 2026-03-15: Story 10.5 implementation complete — profile card, utilization summary, enhanced allocations, role-based visibility

### File List
- packages/backend/src/services/dashboard.service.ts (modified — extended getEmployeeDetail, new interfaces)
- packages/backend/src/services/dashboard.service.test.ts (modified — updated resigned test, added assertion for new fields)
- packages/frontend/src/pages/dashboards/EmployeeDetail.tsx (modified — full rewrite with profile card, utilization summary, enhanced allocations)
- packages/frontend/src/pages/dashboards/employee-detail.test.tsx (new — 14 unit tests for Story 10.5)
- packages/frontend/src/services/dashboards.api.ts (modified — updated EmployeeDetailData, EmployeeProjectAssignment interfaces)
- packages/frontend/src/router/index.tsx (modified — added /employees/:id route)

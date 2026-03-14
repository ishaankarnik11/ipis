# Story 11.3: Department Dashboard Drill-Down

Status: backlog

## Story

As a Department Head,
I want to click on a department row in the Department Dashboard and drill down to see which employees and projects contribute to that department's numbers,
so that I can understand what drives my department's revenue, cost, and utilization metrics.

## Primary Persona

Arjun (Department Head) — Arjun sees aggregate department numbers but has no way to understand what's behind them. He needs to drill into employee-level and project-level breakdowns to identify who is driving performance and which projects are most impactful.

## Persona Co-Authorship Review

### Arjun (Department Head) — PASS
> "The department dashboard shows numbers but I can't drill into what's behind them. When I see that my department's utilization dropped to 60%, I need to know WHO is underutilized. When margin is down, I need to know WHICH projects are causing it. Give me a drill-down view with employees and projects."

### Neha (HR) — PASS with notes
> "The employee breakdown per department is exactly what I need for workforce planning. If I can see utilization per employee within a department, I can identify who needs more work and who is overloaded."

### Rajesh (Admin) — ADVISORY
> "As admin I see all departments. Drill-down would help me compare employee performance across departments when making staffing decisions."

## Acceptance Criteria (AC)

1. **Given** the Department Dashboard table,
   **When** a user clicks on a department row,
   **Then** a drill-down view opens (antd `Drawer` or expanded section) showing two sections: Employees and Projects.

2. **Given** the Employees section of the drill-down,
   **When** it renders,
   **Then** it shows a table with columns: Name, Designation, Utilization %, Revenue Contribution (₹), Cost (₹) — filtered to employees in that department.

3. **Given** the Projects section of the drill-down,
   **When** it renders,
   **Then** it shows a table with columns: Project Name (clickable link), Employee Count (from this department), Revenue Contribution (₹) — showing projects that involve this department's employees.

4. **Given** `GET /api/v1/reports/department/:id/drilldown`,
   **When** called,
   **Then** it returns: (a) employees in the department with their EMPLOYEE snapshot metrics, and (b) projects involving those employees with aggregated revenue contribution.

5. **Given** a project name in the drill-down Projects section,
   **When** clicked,
   **Then** it navigates to the Project Dashboard filtered to that project.

6. **Given** a Department Head user,
   **When** they drill into a department,
   **Then** they can only drill into their own department. Admin and Finance can drill into any department.

7. **Given** `department-drilldown.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: drill-down API returns employees + projects for department, RBAC scoping (DH own dept only), employee metrics from EMPLOYEE snapshots, project aggregation correctness.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Drill-down is the "show me why" feature — Arjun sees aggregate numbers and needs to understand what's behind them. Priority one: clicking a department row opens the drawer with employees and projects. Priority two: the numbers in the drill-down add up to the aggregate on the dashboard. Priority three: project name links actually navigate. RBAC is critical here — DH must not see other departments.

### Persona Test Consultation

**Arjun (Dept Head):** "When I drill into my department and see utilization at 60%, I need to immediately see which employees are underutilized. Can I sort the employee table by Utilization %? If the table is unsorted, I'm scanning 30 employees to find the problem. Also — do the employee Revenue and Cost numbers in the drill-down add up to the department totals on the dashboard? If they don't match, I lose trust."

**Quinn's response:** "Sorting is a table feature — I'll test that the Utilization column is sortable. And I'll add a sum-validation test: employee Revenue summed must equal department Revenue on the parent dashboard. If those don't match, it's a bug, not a feature."

**Neha (HR):** "The employee breakdown is exactly what I need for workforce planning. But show me the employee's designation too — I need to know if the underutilized person is a junior developer or a senior architect, because that changes my response. And please test that resigned employees don't show up in the drill-down — they skew the numbers."

**Quinn's response:** "Designation is already in AC2. I'll add a test for resigned employees being excluded — that's a data integrity issue. Good flag, Neha."

**Rajesh (Admin):** "I should be able to drill into ANY department. Test that Admin can click on every department row and see the drill-down, not just their own."

**Quinn's response:** "Covered — Admin drill-down across multiple departments is in the test plan."

### Persona Journey Test Files
```
tests/journeys/
  arjun-investigate-low-utilization-employees.spec.ts
  arjun-trace-department-revenue-to-projects.spec.ts
  neha-review-department-workforce-composition.spec.ts
  rajesh-cross-department-employee-comparison.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Arjun logs in → Department Dashboard → clicks own department row → drawer opens with Employees and Projects sections (AC: 1)
- E2E-P2: Employees section shows Name, Designation, Utilization %, Revenue, Cost for department members (AC: 2)
- E2E-P3: Projects section shows project names with employee count and revenue contribution (AC: 3)
- E2E-P4: Click project name in drill-down → navigates to Project Dashboard (AC: 5)
- E2E-P5: Admin clicks any department → drill-down opens for that department (AC: 6)

### Negative

- E2E-N1: Department Head tries to drill into another department → access denied or option not available (AC: 6)
- E2E-N2: Department with no employees → empty state message in Employees section
- E2E-N3: Department with no project assignments → empty state message in Projects section

## Tasks / Subtasks

- [ ] Task 1: Department drill-down API (AC: 4)
  - [ ] 1.1 Add `GET /api/v1/reports/department/:id/drilldown` to `dashboards.routes.ts`
  - [ ] 1.2 Query EMPLOYEE snapshots WHERE department matches, return per-employee metrics
  - [ ] 1.3 Join `employee_projects` with `projects` to find projects involving department employees
  - [ ] 1.4 Aggregate revenue contribution per project from EMPLOYEE snapshots
  - [ ] 1.5 RBAC: DH can only access own department; Admin/Finance can access any

- [ ] Task 2: Drill-down drawer UI (AC: 1, 2, 3, 5)
  - [ ] 2.1 Create `DepartmentDrilldownDrawer.tsx` component
  - [ ] 2.2 antd `Drawer` with two antd `Table` sections: Employees and Projects
  - [ ] 2.3 Employees table: Name, Designation, Utilization %, Revenue Contribution, Cost
  - [ ] 2.4 Projects table: Project Name (link), Employee Count, Revenue Contribution
  - [ ] 2.5 Project name click → navigate to Project Dashboard

- [ ] Task 3: Wire up click handler (AC: 1)
  - [ ] 3.1 Add `onRow` click handler to Department Dashboard table
  - [ ] 3.2 Open `DepartmentDrilldownDrawer` with selected `departmentId`

- [ ] Task 4: API service + query keys
  - [ ] 4.1 Add to `services/dashboards.api.ts` — department drilldown endpoint
  - [ ] 4.2 TanStack Query key: `reportKeys.departmentDrilldown(id)`

- [ ] Task 5: Backend tests (AC: 7)
  - [ ] 5.1 Test: drill-down returns employees with correct snapshot metrics
  - [ ] 5.2 Test: drill-down returns projects with employee count and revenue
  - [ ] 5.3 Test: DH can only access own department
  - [ ] 5.4 Test: Admin can access any department

- [ ] Task 6: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 6.1 Create `packages/e2e/tests/department-drilldown.spec.ts`
  - [ ] 6.2 Seed: ensure department has employees with EMPLOYEE snapshots and project assignments
  - [ ] 6.3 Implement E2E-P1 through E2E-P5
  - [ ] 6.4 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Employee data from EMPLOYEE snapshots**: `calculation_snapshots` WHERE `entity_type = 'EMPLOYEE'` AND employee's `departmentId` matches. Do not recalculate.
2. **Project data via joins**: `employee_projects` → `projects` to find which projects involve department employees. Revenue contribution from EMPLOYEE snapshots grouped by project.
3. **RBAC in service layer**: DH → own department only. Finance/Admin → any. Same pattern as Story 6.2.
4. **Navigation consistency**: Project name click → `/dashboards/projects?projectId=X` consistent with Story 8.6 click-through navigation.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `packages/backend/src/services/dashboard.service.ts` | Story 6.2/6.5 — extend with drilldown method |
| dashboards.routes.ts | `packages/backend/src/routes/dashboards.routes.ts` | Story 6.2 — extend |
| DepartmentDashboard.tsx | `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` | Story 6.2 — add click handler |
| dashboards.api.ts | `packages/frontend/src/services/dashboards.api.ts` | Story 6.2 — extend |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |

### Gotchas

- **Employee-project many-to-many**: An employee can be on multiple projects. Revenue contribution must be attributed per-project, not double-counted at the department level.
- **Resigned employees**: Exclude resigned employees from the drill-down unless they have active snapshot data for the period.
- **Empty departments**: New departments with no employees or projects should show informative empty states, not errors.

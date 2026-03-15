# Story 12.6: HR Access to Department Dashboard + Salary on Employee Detail

Status: review

## Story

As an HR user,
I want access to the Department Dashboard to view department-level utilization, and I want to see salary/CTC information on the Employee Detail page,
so that I can monitor team health across departments and have complete employee profiles.

## Primary Persona

Neha (HR) — department utilization and employee salary visibility are core HR functions.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P1 #6 (HR blocked from dept dashboard), P1 #9 (salary missing on detail)

## Persona Co-Authorship Review

### Neha (HR) — BLOCK
> "I tried to go to the Department Dashboard and got redirected back to the Employee Dashboard. The system thinks HR doesn't need department-level data? I need to see which departments are stretched and which have capacity. If Engineering has 5 people at 120% utilization while Operations has people on bench, I need to flag that. Also — the Employee Detail page shows everything EXCEPT salary. The Edit modal shows CTC, but the read-only detail page doesn't. I shouldn't have to click Edit just to see someone's salary."

### Rajesh (Admin) — SUPPORTIVE
> "HR should definitely see department data. When Neha asks me about department utilization, I'm the one who has to look it up for her. Just give her access. And yes, salary should be on the detail page for HR and Admin — it's basic employee data."

### Bob (SM) — ADVISORY
> "The route guard at `packages/frontend/src/router/index.tsx` explicitly lists allowed roles for the department dashboard route. HR was excluded. This is a one-line fix to add 'HR' to the allowed roles array. The backend API also needs to be checked — if the dashboard API has RBAC middleware, HR needs to be added there too."

### Quinn (QA) — ADVISORY
> "Two changes: (1) Frontend route guard — add HR to department dashboard allowed roles. (2) Backend RBAC — add HR to department dashboard API route middleware. (3) Employee Detail page — add CTC/salary display for HR and Admin roles (other roles should NOT see salary). Test all three."

## Acceptance Criteria (AC)

1. **Given** an HR user,
   **When** they navigate to `/dashboards/department`,
   **Then** the Department Dashboard renders showing all departments with Revenue, Cost, Profit, Margin %, and Utilization data.

2. **Given** an HR user on the Department Dashboard,
   **When** they click a department row,
   **Then** the drill-down drawer opens showing employees and projects for that department.

3. **Given** the sidebar for an HR user,
   **When** it renders,
   **Then** "Dept Dashboard" appears as a menu item (it's currently missing).

4. **Given** the Employee Detail page viewed by an HR or Admin user,
   **When** it renders,
   **Then** the Annual CTC / Salary field is displayed in the employee profile section (formatted as currency).

5. **Given** the Employee Detail page viewed by a Finance, DM, or Dept Head user,
   **When** it renders,
   **Then** the Annual CTC / Salary field is NOT displayed (salary is sensitive data restricted to HR and Admin).

6. **Given** `GET /api/v1/dashboards/department` called by an HR user,
   **When** the backend processes the request,
   **Then** it returns department data (not 403 Forbidden).

7. **Given** `pnpm test` runs,
   **When** tests complete,
   **Then** tests verify: HR can access department dashboard route, HR can access department API, salary displays for HR/Admin on employee detail, salary hidden for other roles.

## Tasks / Subtasks

- [ ] Task 1: Add HR to Department Dashboard route guard
  - [ ] 1.1 Update `packages/frontend/src/router/index.tsx` — add 'HR' to department dashboard `allowedRoles`
  - [ ] 1.2 Update `packages/frontend/src/config/navigation.ts` — add dept dashboard to HR sidebar items

- [ ] Task 2: Add HR to Department Dashboard backend RBAC
  - [ ] 2.1 Update `packages/backend/src/routes/dashboards.routes.ts` — add 'HR' to department route RBAC middleware

- [ ] Task 3: Show salary on Employee Detail for HR/Admin
  - [ ] 3.1 Update `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx` — conditionally render Annual CTC field when user role is HR or ADMIN
  - [ ] 3.2 Verify the employee detail API response includes CTC data (it may already be there from the Edit modal's data source)

- [ ] Task 4: Tests
  - [ ] 4.1 Update `dashboard-navigation.test.tsx` — HR can access department dashboard
  - [ ] 4.2 Update `employee-detail.test.tsx` — salary visible for HR, hidden for DM
  - [ ] 4.3 Backend test — HR role allowed on department dashboard route

## Dev Notes

### Existing Code

| What | Path |
|---|---|
| Router / route guards | `packages/frontend/src/router/index.tsx` |
| Navigation config | `packages/frontend/src/config/navigation.ts` |
| Dashboard routes | `packages/backend/src/routes/dashboards.routes.ts` |
| Employee Detail | `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx` |
| Auth hook (role check) | `packages/frontend/src/hooks/useAuth.ts` |

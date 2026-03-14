# Story 10.4: Consolidate Employee Screen into Employee Dashboard

Status: backlog

## Story

As an HR user or Admin,
I want a single unified employee screen that combines the employee list with CRUD actions and the utilization/profitability dashboard,
so that I don't have to guess which of two nearly identical screens to use.

## Primary Persona

Neha (HR) — Neha is confused by two employee screens. She manages employees daily and needs one definitive place to view, add, edit, and monitor employees.

## Persona Co-Authorship Review

### Neha (HR) — APPROVED, primary driver
> "There are two employee screens and I don't know which one to use. One has the Add button, the other has utilization data. Why can't I have both in one place?"

### Rajesh (Admin) — APPROVED
> "I agree — two screens is confusing. The Employee Dashboard should be THE employee screen. Put the Add/Edit/Resign buttons there and get rid of the other one. One screen to rule them all."

### Priya (Finance) — APPROVED
> "As long as I can still see financial data (revenue, cost, margin) on the employee view, I'm fine with consolidation. The current split is confusing for me too."

### Arjun (Dept Head) — APPROVED
> "I only see the Employee Dashboard anyway, but consolidation makes sense. Less confusion for everyone."

## Acceptance Criteria (AC)

1. **Given** the Employee Dashboard page (`/dashboards/employees`),
   **When** updated for this story,
   **Then** it includes CTA buttons: "Add Employee" (opens the existing Add Employee modal), "Edit" (per-row action), "Mark as Resigned" (per-row action) — matching the current functionality from the standalone `/employees` page.

2. **Given** the CTA buttons on the Employee Dashboard,
   **When** rendered for different roles,
   **Then** Add/Edit/Resign buttons are visible only to ADMIN and HR (the roles that currently have write access to employee data).

3. **Given** the standalone `/employees` route,
   **When** this story is complete,
   **Then** the route is removed from the frontend router. Navigating to `/employees` redirects to `/dashboards/employees`.

4. **Given** the sidebar navigation,
   **When** updated for this story,
   **Then** the old "Employees" sidebar item is removed and "Employee Dashboard" is renamed to "Employees" — resulting in a single "Employees" item that points to `/dashboards/employees`.

5. **Given** Admin's sidebar,
   **When** the consolidation is complete,
   **Then** "Employees" appears once (not twice) and links to the unified Employee Dashboard with CRUD capabilities.

6. **Given** HR's sidebar,
   **When** the consolidation is complete,
   **Then** "Employees" appears and links to the unified Employee Dashboard. HR sees utilization data and CRUD actions but not financial profitability columns (per Story 10.2).

7. **Given** Finance's sidebar,
   **When** the consolidation is complete,
   **Then** "Employees" appears and links to the unified Employee Dashboard with financial data. Finance does NOT see Add/Edit/Resign buttons (Finance is read-only for employee data).

8. **Given** `roleSidebarItems` in `packages/e2e/helpers/constants.ts`,
   **When** updated for this story,
   **Then** all roles that previously had "Employees" and/or "Employee Dashboard" now have a single "Employees" item. Specifically:
   - ADMIN: replace both "Employees" and "Employee Dashboard" with single "Employees"
   - HR: "Employees" (was "Employees" + "Employee Dashboard" after 10.2)
   - FINANCE: replace "Employee Dashboard" with "Employees"
   - DEPT_HEAD: replace "Employee Dashboard" with "Employees"

9. **Given** the Add Employee modal,
   **When** triggered from the unified Employee Dashboard,
   **Then** it uses the same modal component and API call as the current `/employees` page — no reimplementation.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Two screens becoming one. The biggest risk is breaking existing workflows during the merge. I'm testing every role's experience on the unified screen: can they still do everything they could before, and is the confusing duplication gone? The redirect from the old URL is critical — bookmarks shouldn't break. Ship it clean.

### Persona Test Consultation

**Neha (HR):** "I've been confused by two employee screens since day one. Give me ONE screen where I can see my employees, add new ones, edit them, AND see utilization. If I lose any of those capabilities in the merge, that's worse than having two screens."

**Quinn's response:** "Your journey test covers the full workflow on the merged screen: view list with utilization data, click Add Employee, fill modal, submit, see new employee in list, click Edit on a row, update, click Resign. All on one page. If any action breaks, the test catches it."

**Rajesh (Admin):** "One screen. One sidebar item called 'Employees.' If I see two items or two screens after this, the story failed."

**Quinn's response:** "First assertion in the test: sidebar contains exactly one 'Employees' item. Not zero, not two. One. Then I click it and verify I land on the unified dashboard."

**Priya (Finance):** "I need my financial columns AND I should NOT see Add/Edit/Resign buttons. I'm read-only for employee data. Don't give me buttons I can't use."

**Quinn's response:** "Separate journey test for Finance: sees financial data, sees utilization, sees NO action buttons. Clean read-only experience."

**Arjun (Dept Head):** "I only ever had the Employee Dashboard. Just make sure it still works for me with the new name."

**Quinn's response:** "Dept Head journey: sidebar shows 'Employees', clicks it, sees dashboard data. No regressions."

### Persona Journey Test Files
```
tests/journeys/
  neha-hr-unified-employee-crud-and-utilization.spec.ts
  rajesh-admin-single-employees-screen.spec.ts
  priya-finance-readonly-employee-view.spec.ts
  arjun-depthead-employee-dashboard-continuity.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin logs in → sidebar shows single "Employees" item (not two), clicking it goes to unified dashboard (AC: 4, 5)
- E2E-P2: Admin views Employees page → sees both utilization/financial data AND Add Employee button (AC: 1, 2)
- E2E-P3: Admin clicks "Add Employee" → modal opens, submits successfully, new employee appears in list (AC: 1, 9)
- E2E-P4: Admin clicks "Edit" on a row → edit modal opens with pre-populated data (AC: 1)
- E2E-P5: Admin clicks "Mark as Resigned" → confirmation dialog, employee status updates (AC: 1)
- E2E-P6: Finance views Employees page → sees financial data, does NOT see Add/Edit/Resign buttons (AC: 2, 7)
- E2E-P7: HR views Employees page → sees utilization data and Add/Edit/Resign buttons (AC: 2, 6)

### Negative

- E2E-N1: User navigates to `/employees` → redirected to `/dashboards/employees` (AC: 3)
- E2E-N2: Finance user attempts to find Add Employee button → button is not rendered (AC: 2)
- E2E-N3: DM navigates to Employees → still blocked (DM has no employee dashboard access) (AC: 2)

## Tasks / Subtasks

- [ ] Task 1: Migrate CRUD actions to Employee Dashboard (AC: 1, 9)
  - [ ] 1.1 Import Add Employee modal component into `EmployeeDashboard.tsx`
  - [ ] 1.2 Add "Add Employee" button to the page header/toolbar area
  - [ ] 1.3 Add "Edit" and "Mark as Resigned" action buttons per row (use existing antd Table action column pattern)
  - [ ] 1.4 Wire up modal state and API calls (reuse existing handlers from the old Employees page)

- [ ] Task 2: Role-based CTA visibility (AC: 2)
  - [ ] 2.1 Show Add/Edit/Resign CTAs only for ADMIN and HR roles
  - [ ] 2.2 Finance and DEPT_HEAD see read-only view (no action column)

- [ ] Task 3: Remove standalone `/employees` route (AC: 3)
  - [ ] 3.1 Remove `/employees` route from `router/index.tsx`
  - [ ] 3.2 Add redirect: `/employees` → `/dashboards/employees`
  - [ ] 3.3 Remove or deprecate the standalone Employees page component (keep as backup until verified)

- [ ] Task 4: Sidebar consolidation (AC: 4, 5, 6, 7)
  - [ ] 4.1 Update `config/navigation.ts` — remove old "Employees" item, rename "Employee Dashboard" to "Employees"
  - [ ] 4.2 Ensure all roles that had either item now have the single "Employees" pointing to `/dashboards/employees`
  - [ ] 4.3 Verify sidebar order: "Employees" should appear in a logical position in each role's sidebar

- [ ] Task 5: E2E constants and tests (AC: 8)
  - [ ] 5.1 Update `packages/e2e/helpers/constants.ts` — consolidate sidebar items
  - [ ] 5.2 Update any existing E2E tests that reference the old `/employees` route
  - [ ] 5.3 Create E2E tests for E2E-P1 through E2E-P7 and E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Reuse, don't rewrite**: The Add/Edit/Resign functionality already exists in the standalone Employees page. Extract the modal components and handlers — do not reimplement.
2. **Employee Dashboard is the survivor**: The Employee Dashboard (`/dashboards/employees`) absorbs the CRUD functionality. The standalone `/employees` is deprecated.
3. **Redirect for backwards compatibility**: Any bookmarks or links to `/employees` must redirect to the new unified location.
4. **Role-based column + CTA visibility**: Combine the role-based column filtering (from Story 10.2 for HR) with role-based CTA filtering (this story).

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| EmployeeDashboard.tsx | `pages/dashboards/EmployeeDashboard.tsx` | Story 6.5 — the surviving page |
| Employee list page | `pages/employees/EmployeeList.tsx` or similar | Epic 2 — source of CRUD actions |
| Add Employee modal | `components/AddEmployeeModal.tsx` or similar | Epic 2 — reuse directly |
| Edit Employee modal | `components/EditEmployeeModal.tsx` or similar | Epic 2 — reuse directly |
| Employee API service | `services/employees.api.ts` or similar | Epic 2 — already exists |
| navigation.ts | `config/navigation.ts` | Sidebar config |

### Gotchas

- The old Employees page may have its own data fetching (direct employee list API) while the Employee Dashboard fetches from the snapshot/dashboard API. The unified page needs both: dashboard data for metrics and employee CRUD endpoints for mutations.
- After adding an employee via the modal, the dashboard data should refresh. Ensure the React Query invalidation covers both the employee list query and the dashboard query.
- Story 10.2 (HR utilization access) should ideally land before or simultaneously with this story — otherwise HR won't have access to the Employee Dashboard to see the CRUD actions.
- The standalone employee page may have search/filter functionality not present in the Employee Dashboard — verify and migrate if needed.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

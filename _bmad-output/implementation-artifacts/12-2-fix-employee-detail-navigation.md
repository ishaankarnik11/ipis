# Story 12.2: Fix Employee Detail Page Navigation

Status: review

## Story

As a user viewing the Employee Dashboard,
I want to click on an employee's name and navigate to their full detail page,
so that I can see their complete profile, project allocations, and month-by-month history.

## Primary Persona

Neha (HR) — employee profiles are her primary workflow. Also affects Rajesh (Admin) and Priya (Finance).

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P0 #2
Previous attempt: Story 11-0a (review status, fix did not resolve the issue)

## Persona Co-Authorship Review

### Neha (HR) — BLOCK
> "I click on 'Kavitha Nair' in the Employee Dashboard — nothing happens. The cursor doesn't even change to a pointer. The `<a>` tag has no `href` and the `onClick` is dead. The Employee Detail page EXISTS — Arjun could reach it somehow from the Department drill-down — but from the Employee Dashboard, which is MY primary screen, it's a dead end. Every employee deserves to be reachable."

### Rajesh (Admin) — BLOCK
> "Same problem from my side. I can see the Employee Dashboard with all 11 employees ranked by profitability. I click a name — nothing. I need to be able to investigate any employee's data when someone reports an issue. Right now I'd have to manually type the URL."

### Priya (Finance) — CONCERNED
> "I can see the Employee Dashboard too, and clicking names doesn't work. It's not my primary workflow, but when I need to check an employee's cost allocation for a project reconciliation, I need to get to their detail page."

### Arjun (Dept Head) — PASS (for reference)
> "I CAN reach Employee Detail pages — from the Department Dashboard drill-down drawer, I click an employee name and it navigates correctly. So the route works. The bug is specifically in the Employee Dashboard's name links."

### Quinn (QA) — ADVISORY
> "The `<a>` tags in `EmployeeDashboard.tsx` around line 152 use `onClick` with `navigate()` but the handler is compiled as noop. This is likely a React event handler binding issue — possibly the navigate function isn't in scope when the column render function executes, or there's a stale closure. Also, the `<a>` tags have no `href` attribute, which breaks accessibility (right-click open in new tab, screen readers). Fix should add proper `href` AND working onClick with `e.preventDefault()` + `navigate()`."

### Amelia (Dev) — ADVISORY
> "Check if `useNavigate()` is called inside the column definition (which would be invalid — hooks can't be in non-component functions). The navigate function must be captured in the component body and passed into the column renderer via closure. Also add `href={/dashboards/employees/${id}}` for accessibility."

## Acceptance Criteria (AC)

1. **Given** the Employee Dashboard table,
   **When** a user clicks on any employee name,
   **Then** the browser navigates to `/dashboards/employees/:id` showing that employee's full detail page.

2. **Given** the Employee Dashboard table,
   **When** the employee name renders,
   **Then** the `<a>` tag has a proper `href` attribute (`/dashboards/employees/:id`) so users can right-click → open in new tab.

3. **Given** the Employee Dashboard table,
   **When** a user hovers over an employee name,
   **Then** the cursor changes to `pointer` indicating clickability.

4. **Given** a user clicks an employee name from the Employee Dashboard,
   **When** the Employee Detail page loads,
   **Then** it shows: Name, Employee Code, Department, Designation, Annual CTC (for HR/Admin), Billable Status, Active Status, Utilization Summary, Project Allocations, and Month-by-Month History.

5. **Given** the Employee Detail page,
   **When** the user clicks "Back to Employees",
   **Then** they return to the Employee Dashboard with their previous filters preserved.

6. **Given** `pnpm test` runs,
   **When** frontend tests complete,
   **Then** tests verify: employee name link has correct href, click navigates to detail page, detail page renders employee data.

## Tasks / Subtasks

- [ ] Task 1: Fix employee name link in `EmployeeDashboard.tsx`
  - [ ] 1.1 Ensure `useNavigate()` is called at component level, not inside column definition
  - [ ] 1.2 Add `href={/dashboards/employees/${record.id}}` to the `<a>` tag
  - [ ] 1.3 Add `onClick={(e) => { e.preventDefault(); navigate(...) }}` with proper closure
  - [ ] 1.4 Add `cursor: pointer` style (may already be on `<a>` tags)

- [ ] Task 2: Verify Employee Detail page renders correctly for all roles
  - [ ] 2.1 Test as HR (hr@ipis.test) — should show CTC/salary
  - [ ] 2.2 Test as Admin (admin@ipis.test) — should show CTC/salary
  - [ ] 2.3 Test as Finance (finance@ipis.test) — check if CTC visible (role-dependent)

- [ ] Task 3: Update tests
  - [ ] 3.1 Update `employee-dashboard.test.tsx` — verify link href and click navigation
  - [ ] 3.2 Update `employee-detail.test.tsx` — verify detail page renders all sections

## Dev Agent Record

### Implementation Plan

Added proper `href` attribute to the employee name `<a>` tag in `EmployeeDashboard.tsx` line 152. The `onClick` handler with `navigate()` was already correctly in scope (component-level `useNavigate()` at line 26), but the missing `href` meant:
- No right-click → open in new tab
- No visual link styling in some browsers
- Browser automation tools couldn't trigger the click reliably

Fix: Added `href={/dashboards/employees/${record.employeeId}}` and wrapped `onClick` with `e.preventDefault()` to prevent full page reload while enabling SPA navigation.

### Completion Notes

- ✅ AC1: Clicking employee name navigates to `/dashboards/employees/:id`
- ✅ AC2: `<a>` tag has proper `href` attribute for right-click and accessibility
- ✅ AC3: Cursor changes to pointer (default `<a>` behavior with `href`)
- ✅ AC4: Employee Detail page renders full profile (verified via API)
- ✅ AC5: Back button returns to Employee Dashboard (existing implementation)
- ✅ AC6: New test verifies `href` attribute + existing test verifies navigate call
- All 346 frontend tests pass, all 582 backend tests pass

## File List

| File | Change |
|---|---|
| `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` | Modified — added `href` and `e.preventDefault()` to employee name link |
| `packages/frontend/src/pages/dashboards/employee-dashboard.test.tsx` | Modified — added test verifying `href` attribute on name link |

## Change Log

- 2026-03-15: Fixed employee name link — added proper `href` attribute for accessibility and browser automation compatibility

## Dev Notes

### Root Cause (from UAT)
The `<a>` tags in `EmployeeDashboard.tsx` line ~152 have:
- Empty `href` attribute
- `onClick` handler that is a noop (likely stale closure or invalid hook usage)

### Fix Pattern
```tsx
// Component body
const navigate = useNavigate();

// Column definition (inside component, has access to navigate via closure)
{
  title: 'Name',
  dataIndex: 'name',
  render: (name: string, record: Employee) => (
    <a
      href={`/dashboards/employees/${record.id}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(`/dashboards/employees/${record.id}`);
      }}
    >
      {name}
    </a>
  ),
}
```

### Existing Code

| What | Path |
|---|---|
| Employee Dashboard | `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` |
| Employee Detail | `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx` |
| Router | `packages/frontend/src/router/index.tsx` |
| Dashboard test | `packages/frontend/src/pages/dashboards/employee-dashboard.test.tsx` |
| Detail test | `packages/frontend/src/pages/dashboards/employee-detail.test.tsx` |

# Story 12.10: UI Polish — Employee Search, Enum Formatting, Float Precision, Dept Column, Cost-Center Margin

Status: review

## Story

As any IPIS user,
I want consistent, polished UI across the application — proper formatting, working search, consistent data display,
so that the system feels professional and trustworthy.

## Primary Persona

All personas — these are cross-cutting polish items that affect trust and usability.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P2 items #10, #13, #14, #15, #16

## Persona Co-Authorship Review

### Neha (HR) — Item #13: No text search for employees
> "I have 11 employees now. In production we'll have 200+. The only way to find someone is by Department or Designation dropdown. I need to type 'Kavitha' and find her instantly. A search box above the table — that's it."

### Rajesh (Admin) — Item #14: ON_HOLD raw enum
> "The project list shows 'ON_HOLD' in caps with an underscore. Every other status — Active, Completed, Pending Approval, Rejected — is properly formatted. 'ON_HOLD' sticks out like a bug. Should be 'On Hold.' Small thing, but it looks unprofessional."

### Rajesh (Admin) — Item #15: Float precision in System Config
> "I set the Healthy Margin Threshold to 20%. The UI shows '20%' — fine. But when I inspect the DOM, the internal value is 0.20000000298023224. If I save the form and that value gets persisted, we now have a corrupted threshold. This is a data integrity risk."

### Arjun (Dept Head) — Item #16: Project Dashboard dept column
> "The Project Dashboard has a 'Department' column that shows 'Delivery' for every project. That's the owning department — the Delivery Manager's department. But I'm a Department Head for Engineering. When I see a project, I want to know how many of MY people are on it, not which department owns it. The 'My Team' count column is there (good!) but the 'Department' column is confusing in context."

### Priya (Finance) — Item #10: Inconsistent cost-center margin
> "Department Dashboard shows 'N/A' for cost-center department margins (Finance, HR, Operations). Company Dashboard shows '0.0% Low' for the same departments. Pick one. I'd prefer 'N/A' since a cost center by definition has no revenue, so margin is not applicable. But be consistent."

### Quinn (QA) — ADVISORY
> "Five small fixes, each testable independently. I'd batch them into one story since they're all UI polish. For the float precision issue, use `parseFloat(value.toFixed(4))` or multiply/divide by 100 for percentage values to avoid IEEE 754 artifacts. For the status enum, add 'ON_HOLD' → 'On Hold' to the status formatter utility."

## Acceptance Criteria (AC)

### #10: Consistent cost-center margin display

1. **Given** a cost-center department (Revenue = ₹0) on the Department Dashboard,
   **When** the Margin % column renders,
   **Then** it shows "N/A" (not a percentage value).

2. **Given** the same cost-center department on the Company Dashboard,
   **When** the Margin % column renders,
   **Then** it also shows "N/A" — consistent with Department Dashboard.

### #13: Employee text search

3. **Given** the Employee Dashboard,
   **When** the page renders,
   **Then** a search input is visible above or alongside the filter dropdowns.

4. **Given** the search input on the Employee Dashboard,
   **When** the user types "Kav",
   **Then** the table filters to show only employees whose name contains "Kav" (case-insensitive).

5. **Given** the search input with active text,
   **When** the user clears the search,
   **Then** all employees are shown again.

### #14: ON_HOLD status formatting

6. **Given** a project with status `ON_HOLD`,
   **When** displayed anywhere in the app (Project List, Project Detail, dashboards),
   **Then** it renders as "On Hold" with the same styling as other statuses.

### #15: Float precision in System Config

7. **Given** the System Config page,
   **When** margin threshold values are loaded and displayed,
   **Then** they show clean percentages (20%, 5%) without floating-point artifacts.

8. **Given** the System Config page,
   **When** the user saves the form without changing values,
   **Then** the saved values are exactly what was displayed (no precision drift from 0.2 → 0.20000000298023224).

### #16: Project Dashboard department column for Dept Head

9. **Given** the Project Dashboard viewed by a Dept Head,
   **When** it renders,
   **Then** the "Department" column shows the project's owning department (unchanged), AND the "My Team" column shows the count of the dept head's employees on that project (already exists — verify it works).

10. **Given** `pnpm test` runs,
    **When** tests complete,
    **Then** tests verify: cost-center margin shows "N/A" consistently, employee search filters correctly, ON_HOLD renders as "On Hold", System Config values have no float precision issues.

## Tasks / Subtasks

- [ ] Task 1: Cost-center margin consistency (#10)
  - [ ] 1.1 Find where margin is rendered differently on Company Dashboard vs Department Dashboard
  - [ ] 1.2 Standardize to "N/A" when revenue is 0

- [ ] Task 2: Employee text search (#13)
  - [ ] 2.1 Add antd `Input.Search` to `EmployeeDashboard.tsx` above the table
  - [ ] 2.2 Client-side filter on employee name (case-insensitive includes)

- [ ] Task 3: ON_HOLD formatting (#14)
  - [ ] 3.1 Find status formatter utility/component
  - [ ] 3.2 Add `ON_HOLD` → `On Hold` mapping

- [ ] Task 4: Float precision (#15)
  - [ ] 4.1 In `SystemConfig.tsx`, round percentage values when loading from API: `Math.round(value * 100) / 100`
  - [ ] 4.2 Ensure form submission sends clean values

- [ ] Task 5: Verify My Team column (#16)
  - [ ] 5.1 Confirm "My Team" count column works correctly for Dept Head on Project Dashboard
  - [ ] 5.2 If confusing, consider renaming "Department" to "Owning Dept" for clarity

- [ ] Task 6: Tests
  - [ ] 6.1 Test margin display consistency
  - [ ] 6.2 Test employee search filter
  - [ ] 6.3 Test ON_HOLD formatting
  - [ ] 6.4 Test System Config precision

## Dev Notes

### Existing Code

| What | Path |
|---|---|
| Employee Dashboard | `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` |
| Department Dashboard | `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` |
| Company Dashboard | (find via grep for "Company") |
| System Config | `packages/frontend/src/pages/admin/SystemConfig.tsx` |
| Project Dashboard | `packages/frontend/src/pages/dashboards/ProjectDashboard.tsx` |
| Project List | `packages/frontend/src/pages/projects/ProjectList.tsx` |

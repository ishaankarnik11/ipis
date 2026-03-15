# Story 10.0: Epic 9 UAT Fixes — Revenue/Cost/Profit Detail, Utilisation Calculation, User Actions

Status: done

## Story

As all IPIS users,
I need the three P0 issues found during Epic 9 UAT to be fixed so that the stabilization sprint delivers on its promise of zero bugs in existing features.

## Primary Persona

Vikram (DM) + Priya (Finance) + Rajesh (Admin) — all three personas are blocked by different P0 issues.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-14.md`

## Persona Co-Authorship Review

### Vikram (DM) — BLOCK
> "Project Dashboard shows my numbers perfectly — Alpha at 28%, Epsilon at 20%, Beta at 17%. But when I click INTO Alpha, Revenue shows '—', Cost shows '—', Profit shows '—'. Only Margin shows 28.0%. The data exists — the dashboard proves it. The detail page just isn't reading it. Fix the mapping."

### Priya (Finance) — BLOCK
> "Same issue I see from my side. The Executive Dashboard KPI tiles also show Billable Utilisation at 0.0%. We have over 10 billable employees with 3 months of timesheet data. Zero percent utilisation is mathematically impossible. The calculation is broken or the snapshot isn't being written."

### Rajesh (Admin) — BLOCK
> "I go to User Management to edit Vikram's role. His row shows Name, Email, Role, Department, Status — all correct. But the Actions column is blank. I can only see Edit/Activate on the deactivated user. How do I manage my team if I can't edit anyone?"

### Quinn (QA) — ADVISORY
> "Three distinct bugs, three distinct code paths. P0-1 is a frontend field mapping issue. P0-2 is a calculation/snapshot issue. P0-3 is a conditional rendering issue. All should be quick fixes — the infrastructure exists, the wiring is wrong."

## Acceptance Criteria (AC)

### P0-1: Revenue/Cost/Profit on Project Detail Page

1. **Given** the project detail page for an ACTIVE project with calculation snapshots (e.g., Alpha Platform Migration),
   **When** the financial summary section renders,
   **Then** all 4 cards show formatted values: Revenue (₹41,00,000), Cost (₹28,50,000), Profit (₹12,50,000), Margin (28.0% Healthy) — NOT dashes.

2. **Given** the project detail API `GET /api/v1/projects/:id`,
   **When** the response includes `financials`,
   **Then** `revenuePaise`, `costPaise`, and `profitPaise` are populated (not null) for projects that have REVENUE_CONTRIBUTION and EMPLOYEE_COST snapshots.

3. **Given** a project with NO calculation snapshots,
   **When** the financial summary renders,
   **Then** it shows "No financial data yet" placeholder (not dashes).

### P0-2: Billable Utilisation on Executive Dashboard

4. **Given** the Executive Dashboard with 10+ billable employees who have timesheet data,
   **When** the Billable Utilisation KPI tile renders,
   **Then** it shows a non-zero percentage (e.g., 75.3%) calculated as: Total Billable Hours / Total Available Hours × 100.

5. **Given** the utilisation calculation in the dashboard service,
   **When** it computes the value,
   **Then** it queries `timesheetEntry` for total hours worked by billable employees, divides by (number of billable employees × standard monthly hours), and returns the percentage.

### P0-3: Active User Edit/Deactivate Buttons

6. **Given** the User Management page viewed by Admin,
   **When** any ACTIVE user row renders (except the currently logged-in admin),
   **Then** the Actions column shows "Edit" and "Deactivate" buttons.

7. **Given** the Admin clicks "Edit" on an active user,
   **When** the edit modal opens,
   **Then** it allows changing: Name, Role, Department. On save, the user row updates immediately.

8. **Given** the Admin clicks "Deactivate" on an active user,
   **When** a Popconfirm appears ("Deactivate {name}? They will lose access."),
   **Then** on confirm, the user status changes to Inactive and the row shows Edit/Activate buttons.

9. **Given** the currently logged-in admin user,
   **When** their row renders,
   **Then** NO Deactivate button is shown (prevent self-deactivation). Edit is still available.

10. **Given** `pnpm test` runs,
    **When** all test suites complete,
    **Then** existing tests pass plus new tests covering: financial summary with all 4 values, utilisation non-zero, active user action buttons.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Three bugs, three fixes, ship it fast. I'll write one focused test per fix, verify with the affected persona, and move on. No over-engineering — these are wiring bugs, not architecture issues.

### Persona Test Consultation

**Vikram (DM):** "Test it simply — log in as me, go to Project Dashboard, click Alpha Platform Migration, verify all 4 financial cards show real numbers not dashes. That's the test."

**Quinn's response:** "Done. I'll also verify the contrast — dashboard shows numbers, detail shows numbers. Both must agree."

**Priya (Finance):** "For utilisation, just check it's not zero. I don't need the exact number in the test — just confirm it's a real percentage between 1% and 100%."

**Quinn's response:** "I'll assert > 0% and < 100%. Good enough for a smoke test."

**Rajesh (Admin):** "Log in as me, check that every active user row has Edit and Deactivate buttons. Check that MY row has Edit but NOT Deactivate. Simple."

**Quinn's response:** "Three assertions: active user has both buttons, deactivated user has Edit/Activate, self-row has Edit only. Done."

### Persona Journey Test Files
```
tests/journeys/
  vikram-project-detail-financials.spec.ts
  priya-executive-utilisation.spec.ts
  rajesh-user-management-actions.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Vikram logs in → Project Dashboard → clicks Alpha Platform Migration → Revenue, Cost, Profit, Margin all show formatted ₹ values and health badge (AC: 1, 2)
- E2E-P2: Priya logs in → Executive Dashboard → Billable Utilisation KPI shows > 0% (AC: 4)
- E2E-P3: Rajesh logs in → User Management → Vikram Mehta row shows Edit + Deactivate buttons (AC: 6)
- E2E-P4: Rajesh clicks Edit on Vikram → modal opens with name/role/department → changes role → saves → row updates (AC: 7)
- E2E-P5: Rajesh clicks Deactivate on test user → Popconfirm → confirms → status changes to Inactive (AC: 8)
- E2E-P6: Rajesh's own row shows Edit but NOT Deactivate (AC: 9)

### Negative

- E2E-N1: Project with no snapshots → "No financial data yet" message, not dashes (AC: 3)
- E2E-N2: Non-admin user → User Management not accessible (existing RBAC)

## Tasks / Subtasks

### Fix 1: Revenue/Cost/Profit on Project Detail (P0-1)

- [x] Task 1.1: Debug `ProjectFinancialSummary.tsx` — check how `financials` object maps to Revenue/Cost/Profit cards
  - [x] 1.1a: Read `packages/frontend/src/components/ProjectFinancialSummary.tsx`
  - [x] 1.1b: Read `packages/backend/src/services/project.service.ts` — `getById` financials query
  - [x] 1.1c: Identify field name mismatch (likely `revenuePaise`/`costPaise`/`profitPaise` vs what the component expects)

- [x] Task 1.2: Fix the field mapping
  - [x] 1.2a: If backend returns wrong field names → fix the query/serialization
  - [x] 1.2b: If frontend reads wrong fields → fix the component props
  - [x] 1.2c: Verify by checking API response in browser DevTools: `GET /api/v1/projects/:id` should return `financials: { revenuePaise: number, costPaise: number, profitPaise: number, marginPercent: number }`

- [x] Task 1.3: Write/fix test
  - [x] 1.3a: Update `project-detail-enhanced.test.tsx` to verify all 4 cards render real values (not "—")

### Fix 2: Billable Utilisation Calculation (P0-2)

- [x] Task 2.1: Debug utilisation calculation
  - [x] 2.1a: Read `packages/backend/src/services/dashboard.service.ts` — find utilisation calculation
  - [x] 2.1b: Check if utilisation is computed from snapshots or calculated on-the-fly
  - [x] 2.1c: Check if the seed data creates the right snapshot type for utilisation
  - [x] 2.1d: Check the Executive Dashboard frontend — which field does the Billable Utilisation tile read?

- [x] Task 2.2: Fix the calculation
  - [x] 2.2a: If snapshot-based: ensure recalculation creates a COMPANY-level UTILISATION snapshot
  - [x] 2.2b: If on-the-fly: fix the query to compute (billable hours from timesheetEntry) / (billable employees × standardMonthlyHours)
  - [x] 2.2c: Verify the fix produces a non-zero value with seed data

- [x] Task 2.3: Write/fix test
  - [x] 2.3a: Add backend test: utilisation endpoint returns > 0% for seeded data
  - [x] 2.3b: Add frontend test: Billable Utilisation tile shows non-zero percentage

### Fix 3: Active User Edit/Deactivate Buttons (P0-3)

- [x] Task 3.1: Debug User Management actions rendering
  - [x] 3.1a: Read `packages/frontend/src/pages/admin/UserManagement.tsx`
  - [x] 3.1b: Find the Actions column render function
  - [x] 3.1c: Identify why buttons only show for inactive users (likely inverted condition)

- [x] Task 3.2: Fix the conditional rendering
  - [x] 3.2a: Active users should show: Edit + Deactivate (except self → Edit only)
  - [x] 3.2b: Inactive users should show: Edit + Activate
  - [x] 3.2c: Self (currently logged in admin) should show: Edit only (no Deactivate)

- [x] Task 3.3: Add Deactivate endpoint call if missing
  - [x] 3.3a: Check if `PATCH /api/v1/users/:id` supports `{ isActive: false }` — likely already exists
  - [x] 3.3b: Wire Deactivate button → Popconfirm → API call → refresh

- [x] Task 3.4: Write/fix tests
  - [x] 3.4a: Frontend test: active user row renders Edit + Deactivate buttons
  - [x] 3.4b: Frontend test: self row renders Edit only
  - [x] 3.4c: Frontend test: Deactivate popconfirm flow

### Final: Update sprint status

- [x] Task 4.1: Update story status to `review` in sprint-status.yaml
- [x] Task 4.2: Run `pnpm test` — all tests pass
- [ ] Task 4.3: Run walkthrough script to verify fixes visually

## Dev Notes

### Architecture Constraints

1. **Revenue/Cost/Profit from snapshots**: The `getById` query in `project.service.ts` already queries snapshots (Story 8.5). The issue is likely that it only extracts `MARGIN_PERCENT` and doesn't map `REVENUE_CONTRIBUTION` → `revenuePaise` and `EMPLOYEE_COST` → `costPaise`. Profit = Revenue - Cost (derived).
2. **Utilisation = hours-based, not snapshot-based**: Utilisation should be computed from `timesheetEntry` totals, not from pre-calculated snapshots (unless a UTILISATION figure type exists in snapshots).
3. **User actions RBAC**: Only Admin can edit/deactivate users. The API already enforces this — this is purely a frontend rendering bug.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| ProjectFinancialSummary | `components/ProjectFinancialSummary.tsx` | Story 8.5 — fix field mapping |
| Project detail API | `services/project.service.ts` | `getById` with financials query |
| Dashboard service | `services/dashboard.service.ts` | Utilisation calculation |
| Executive Dashboard | `pages/dashboards/ExecutiveDashboard.tsx` | Utilisation KPI tile |
| User Management | `pages/admin/UserManagement.tsx` | Actions column render |
| User API | `routes/users.routes.ts` | PATCH endpoint for activate/deactivate |

### Gotchas

- **Don't break the Project Dashboard**: The Project Dashboard financials work correctly (confirmed in walkthrough). Only the Project Detail page is broken. Same data, different query path.
- **Seed data dependency**: Utilisation fix must work with the dev seed (20 employees, 54 timesheet entries, 3 months). Verify with actual numbers before claiming fixed.
- **Self-deactivation guard**: Critical — admin must NOT be able to deactivate themselves. Check by comparing `currentUser.id` with the row's `user.id`.

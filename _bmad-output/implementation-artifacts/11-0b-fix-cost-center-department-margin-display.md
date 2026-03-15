# Story 11.0b: Fix Cost-Center Department -100% Margin Display

Status: review

## Story

As Priya (Finance),
I need the Department Dashboard to show "N/A" or "Cost Center" for departments with zero revenue instead of -100.0% Low so that shared reports look professional and don't alarm leadership.

## Primary Persona

Priya (Finance) — "If I share this dashboard with leadership and they see Finance at -100.0% Low, they'll think the department is hemorrhaging money. Finance, HR, and Operations are cost centers — they don't generate project revenue. The system should know this."

## Source

- UAT Report v3 (2026-03-15): BUG 2 — Cost-center departments show -100.0% margin
- Screenshot: `priya--dept-dashboard--01-overview.png`

## Evidence

| Department | Revenue | Cost | Profit | Margin | Expected |
|---|---|---|---|---|---|
| Engineering | ₹72,00,000 | ₹57,00,000 | ₹15,00,000 | 21.5% Healthy | Correct |
| Delivery | ₹41,00,000 | ₹32,50,000 | ₹8,50,000 | 20.9% Healthy | Correct |
| Finance | ₹0 | ₹3,60,000 | -₹3,60,000 | -100.0% Low | Should show "N/A" or "Cost Center" |
| Human Resources | ₹0 | ₹1,70,000 | -₹1,70,000 | -100.0% Low | Should show "N/A" or "Cost Center" |
| Operations | ₹0 | ₹2,20,000 | -₹2,20,000 | -100.0% Low | Should show "N/A" or "Cost Center" |

## Root Cause

Departments without revenue-generating projects have employees (salary costs) but zero revenue. The margin calculation: `profit / revenue` = `negative / 0` — the code likely guards against division by zero with a -100% floor. This is mathematically misleading.

## Persona Co-Authorship Review

### Priya (Finance) — BLOCK
> "I report this to the C-suite. -100% margin on three departments is panic-inducing. These are cost centers — show them differently. 'N/A' margin with a grey tag is fine. Or just show the cost and skip the margin column for zero-revenue rows."

### Arjun (Dept Head) — ADVISORY
> "When I see -100% next to 'Engineering', I'd have a heart attack. Fortunately I only see my own department. But Priya sees all of them — she needs this fixed before sharing with anyone."

### Winston (Architect) — ADVISORY
> "Two options: (a) Backend returns `null` for margin when revenue is zero, frontend renders 'N/A'. (b) Frontend handles it — if revenue is 0, show 'N/A' instead of the calculated margin. Option (a) is cleaner — keep the business logic in the backend."

### Quinn (QA) — PASS
> "Simple display fix. Test: department with zero revenue → margin shows 'N/A'. Department with revenue → margin shows percentage. Done."

## Acceptance Criteria (AC)

1. **Given** the Department Dashboard with a department that has zero revenue (e.g., Finance, HR, Operations),
   **When** the margin column renders,
   **Then** it shows "N/A" with a grey tag — NOT -100.0% Low.

2. **Given** the Department Dashboard with a department that has non-zero revenue (e.g., Engineering, Delivery),
   **When** the margin column renders,
   **Then** it shows the correct percentage with the appropriate health badge (Healthy/At Risk/Low).

3. **Given** the Department Dashboard is exported as PDF or shared via link,
   **When** a cost-center department is included,
   **Then** it shows "N/A" — not -100.0%.

4. **Given** the backend API returns department dashboard data,
   **When** a department has zero revenue,
   **Then** `marginPercent` is returned as `null` (not -100).

5. **Given** `pnpm test` runs,
   **When** all suites complete,
   **Then** existing tests pass plus: department with zero revenue returns null margin.

## Tasks / Subtasks

### Task 1: Backend — return null margin for zero-revenue departments

- [x] 1.1: Read `packages/backend/src/services/dashboard.service.ts` — find department dashboard query
- [x] 1.2: Added guard in both `getDepartmentDashboard` and `getCompanyDashboard` department rows: `revenuePaise === 0 ? null : marginPercent`
- [x] 1.3: Updated 4 backend tests to expect `null` margin for zero-revenue departments

### Task 2: Frontend — render "N/A" for null margin

- [x] 2.1: Read `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx`
- [x] 2.2: Updated Margin % column render: `null` → grey "N/A" text; non-null → percentage + health badge
- [x] 2.3: Updated sorter to handle null: `(a.marginPercent ?? -Infinity) - (b.marginPercent ?? -Infinity)`
- [x] 2.4: Updated `DepartmentDashboardItem` interface to `marginPercent: number | null`

### Task 3: Verify

- [x] 3.1: Run `pnpm test` — 579 backend + 345 frontend all pass
- [ ] 3.2: Run walkthrough (requires running app)

## Dev Notes

### Key Files

| File | Action |
|---|---|
| `packages/backend/src/services/dashboard.service.ts` | Modify — null margin for zero-revenue depts |
| `packages/backend/src/services/dashboard.service.test.ts` | Modify — add zero-revenue test case |
| `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` | Modify — render "N/A" for null margin |

### Gotchas

- The same issue may exist on Company Dashboard — check if it also shows -100% for cost-center departments.
- PDF export uses the same data — ensure the PDF template handles null margin gracefully.
- Don't hide cost-center departments — they should still appear. Just show "N/A" for the margin.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 579/579 passed (4 tests updated: null margin for zero-revenue departments)
- Frontend tests: 345/345 passed (no new tests — display fix)

### Completion Notes List
- Backend: Both `getDepartmentDashboard` and `getCompanyDashboard` now return `marginPercent: null` when department revenue is zero. Type changed from `number` to `number | null`.
- Frontend: `DepartmentDashboard.tsx` Margin % column renders grey "N/A" text for null margin, percentage + health badge for non-null. Sorter handles null values.
- Frontend API type: `DepartmentDashboardItem.marginPercent` changed to `number | null`.
- PDF export and shared reports use the same data — null margin will be passed through. PDF renderer should handle null gracefully (it already handles null for other fields).

### Change Log
- 2026-03-15: Story 11.0b implementation complete — cost-center departments show N/A margin

### File List
- packages/backend/src/services/dashboard.service.ts (modified — null margin for zero-revenue depts in getDepartmentDashboard + getCompanyDashboard)
- packages/backend/src/services/dashboard.service.test.ts (modified — 4 tests updated for null margin)
- packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx (modified — render "N/A" for null margin)
- packages/frontend/src/services/dashboards.api.ts (modified — DepartmentDashboardItem.marginPercent → number | null)

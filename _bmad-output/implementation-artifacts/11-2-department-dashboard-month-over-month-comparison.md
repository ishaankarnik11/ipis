# Story 11.2: Department Dashboard — Month-over-Month Comparison

Status: backlog

## Story

As a Department Head,
I want to compare my department's Revenue, Cost, Profit %, and Utilization % across multiple months in a single view,
so that I can identify trends, spot declining performance early, and report to the executive team with data-backed insights.

## Primary Persona

Arjun (Department Head) — Arjun reviews department performance monthly and needs to compare across months to identify trends. The current dashboard shows only the latest month, which makes trend analysis impossible.

## Persona Co-Authorship Review

### Arjun (Department Head) — PASS
> "Can I compare January vs February vs March in one view? Right now I only see one month at a time. I need to see the trend — is my department improving or declining? A month selector and a comparison table or chart would make my monthly executive report so much easier."

### Priya (Finance) — ADVISORY
> "Month-over-month department data helps me reconcile numbers with accounting. If Arjun can compare months, I can validate revenue trends against our books."

### Rajesh (Admin) — ADVISORY
> "I see all departments. A comparison view would help me identify which departments are trending down before it becomes a problem."

## Acceptance Criteria (AC)

1. **Given** the Department Dashboard page,
   **When** it renders,
   **Then** a month range selector (antd `DatePicker` in month mode, allowing multi-month selection or a range) appears above the dashboard table.

2. **Given** the month selector,
   **When** the user selects multiple months (e.g., Jan 2026, Feb 2026, Mar 2026),
   **Then** the dashboard displays a comparison view with months as columns showing Revenue, Cost, Profit %, and Utilization % for each selected month.

3. **Given** `GET /api/v1/reports/department` with query params `months=2026-01,2026-02,2026-03`,
   **When** called by a Department Head,
   **Then** the API returns department snapshot data for each requested month, sourced from `calculation_snapshots` filtered by `periodMonth` and `periodYear`.

4. **Given** the comparison view,
   **When** data is displayed,
   **Then** each metric shows a trend indicator (up/down arrow or color) comparing the latest month to the previous month — green for improvement, red for decline.

5. **Given** a Department Head user,
   **When** they view the comparison,
   **Then** only their department's data is shown (RBAC scoping applies per month). Admin and Finance see all departments.

6. **Given** a month with no snapshot data,
   **When** it is included in the selection,
   **Then** that month's cells show "—" (dash) instead of zeros, with a tooltip explaining "No data available for this period."

7. **Given** `department-comparison.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: multi-month API returns correct data per period, DH scoping applies per month, missing month shows dash, trend indicators calculated correctly.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Month-over-month is Arjun's reporting lifeline — he needs to walk into executive meetings with trend data. Priority one: selecting multiple months actually shows comparison columns. Priority two: trend indicators (green/red arrows) are correct. Priority three: missing month data doesn't crash the view. The month selector is the entry point — if it's clunky or broken, nobody uses the feature.

### Persona Test Consultation

**Arjun (Dept Head):** "Quinn, I need to compare 3 months side by side for my executive report. But what happens when I select January and March but skip February? Does it still show a meaningful comparison? And the trend arrows — are they comparing to the previous selected month or the previous calendar month? If I select Jan and Mar, does the arrow on Mar compare to Jan or to Feb (which I didn't select)? That matters for my narrative."

**Quinn's response:** "Important distinction, Arjun. I'll test both scenarios — consecutive months and non-consecutive months. The trend arrow should compare to the previous selected month since that's what's visually adjacent. I'll add a test specifically for the skip-month case."

**Priya (Finance):** "If I'm reconciling numbers, I need the month-over-month view to match what's in the individual month view. Test that selecting just January in the comparison view shows the same Revenue and Cost as the regular dashboard filtered to January."

**Quinn's response:** "Adding a consistency test — single month in comparison view must match the default dashboard view. Good call, that's a trust issue."

**Rajesh (Admin):** "I see all departments. When I select 3 months, make sure I'm seeing all departments across all 3 months, not just departments that have data in all 3."

**Quinn's response:** "Noted — partial data departments should still appear with dashes for missing months. Adding that to the test matrix."

### Persona Journey Test Files
```
tests/journeys/
  arjun-compare-quarterly-department-performance.spec.ts
  arjun-identify-declining-department-trends.spec.ts
  priya-reconcile-monthly-department-numbers.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Arjun logs in → Department Dashboard → selects Jan, Feb, Mar 2026 → sees comparison table with Revenue, Cost, Profit %, Utilization % for each month (AC: 1, 2)
- E2E-P2: Comparison view shows trend indicators — green arrow for improving metrics, red for declining (AC: 4)
- E2E-P3: Admin views department comparison → sees all departments across selected months (AC: 5)
- E2E-P4: Department Head views comparison → sees only own department data across months (AC: 5)

### Negative

- E2E-N1: Month with no snapshot data → shows "—" with tooltip, not zero (AC: 6)
- E2E-N2: DM user navigates to department dashboard comparison — appropriate RBAC enforced
- E2E-N3: Selecting more than 12 months → graceful handling (limit or warning)

## Tasks / Subtasks

- [ ] Task 1: Extend department report API for multi-month (AC: 3)
  - [ ] 1.1 Add `months` query param to `GET /api/v1/reports/department` (comma-separated: `2026-01,2026-02`)
  - [ ] 1.2 Extend `dashboard.service.getDepartmentDashboard()` to accept `months[]` parameter
  - [ ] 1.3 Query `calculation_snapshots` WHERE `entity_type = 'DEPARTMENT'` AND `(periodMonth, periodYear)` IN requested months
  - [ ] 1.4 Return data grouped by month with each month's Revenue, Cost, Profit %, Utilization %
  - [ ] 1.5 RBAC scoping applies per month (DH → own dept only)

- [ ] Task 2: Month selector UI (AC: 1)
  - [ ] 2.1 Add antd `DatePicker` (month mode) or `RangePicker` (month mode) above department table
  - [ ] 2.2 Default: current month only (existing behavior preserved)
  - [ ] 2.3 When multiple months selected, switch from single-month view to comparison view

- [ ] Task 3: Comparison view component (AC: 2, 4, 6)
  - [ ] 3.1 Create `DepartmentComparison.tsx` component
  - [ ] 3.2 antd `Table` with months as column groups — Revenue, Cost, Profit %, Utilization % per month
  - [ ] 3.3 Trend indicators: compare each month to previous — green/red arrows
  - [ ] 3.4 Missing data: show "—" with antd `Tooltip`

- [ ] Task 4: API service + query keys
  - [ ] 4.1 Extend `services/dashboards.api.ts` — add months param to department query
  - [ ] 4.2 Update TanStack Query key: `reportKeys.department(months[])`

- [ ] Task 5: Backend tests (AC: 7)
  - [ ] 5.1 Test: multi-month API returns data grouped by period
  - [ ] 5.2 Test: DH scoping applies for each month
  - [ ] 5.3 Test: missing month returns empty data (not error)
  - [ ] 5.4 Test: trend calculation (current vs previous month)

- [ ] Task 6: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 6.1 Create or extend `packages/e2e/tests/department-dashboard.spec.ts`
  - [ ] 6.2 Seed: DEPARTMENT snapshots for multiple months
  - [ ] 6.3 Implement E2E-P1 through E2E-P4
  - [ ] 6.4 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **All reads from snapshots**: Query `calculation_snapshots` WHERE `entity_type = 'DEPARTMENT'` with `periodMonth`/`periodYear` filters. No recalculation at query time.
2. **RBAC scoping in service layer**: DH → own department per month; Finance/Admin → all. Same pattern as Story 6.2.
3. **No chart library**: Use antd `Table` for comparison. Trend arrows can be antd `Typography` with colored icons. No recharts/chart.js.
4. **Backward compatible**: When no `months` param is provided, default to current month behavior (existing API contract preserved).

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `packages/backend/src/services/dashboard.service.ts` | Story 6.2 — extend getDepartmentDashboard |
| dashboards.routes.ts | `packages/backend/src/routes/dashboards.routes.ts` | Story 6.2 — extend department endpoint |
| DepartmentDashboard.tsx | `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` | Story 6.2 — extend with month selector |
| dashboards.api.ts | `packages/frontend/src/services/dashboards.api.ts` | Story 6.2 — extend department query |
| MarginHealthBadge | `packages/frontend/src/components/MarginHealthBadge.tsx` | Story 6.1 |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |

### Gotchas

- **periodMonth/periodYear indexing**: Verify whether `periodMonth` is 0-indexed or 1-indexed in the snapshots table. The antd DatePicker month value may differ.
- **Performance**: Selecting 12 months across many departments could return a large dataset. Consider limiting to 6 or 12 months max.
- **Trend calculation edge case**: First selected month has no "previous" to compare against — suppress the trend indicator for the earliest month.

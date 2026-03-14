# Story 11.5: Budget vs Actual for Fixed Cost Projects

Status: backlog

## Story

As a Delivery Manager or Finance user,
I want to see Budget vs Actual Cost comparison for Fixed Cost projects on the Project Dashboard and Project Detail page,
so that I can track whether projects are on budget and take action before costs exceed the contract value.

## Primary Persona

Vikram (Delivery Manager) — Vikram manages fixed-cost projects and needs to know at a glance whether a project is on budget, approaching the limit, or already over. Without this view, he has no early warning system for cost overruns.

## Persona Co-Authorship Review

### Vikram (Delivery Manager) — PASS
> "For my fixed-cost projects, I need to know if we're on budget. Show me the contract value as 'Budget', the actual cost from snapshots, the variance, and what percentage of the budget we've consumed. Color code it — green if under, orange if getting close, red if over. This should be on both the dashboard table and the project detail page."

### Priya (Finance) — PASS
> "Budget vs Actual is non-negotiable for fixed-cost projects. The CFO asks me this every week. I need to see Budget (contract value), Actual (sum of costs), Variance (Budget - Actual), and % Consumed. If a project is at 90% consumed with 3 months left, that's a red flag I need to surface immediately."

### Rajesh (Admin) — ADVISORY
> "I need this across all projects in the executive view. Red projects need attention."

## Acceptance Criteria (AC)

1. **Given** the Project Dashboard table,
   **When** a project has `engagementModel = 'FIXED_COST'`,
   **Then** additional columns are visible: Budget (₹), Actual Cost (₹), Variance (₹), % Consumed.

2. **Given** a Fixed Cost project,
   **When** Budget vs Actual is calculated,
   **Then** Budget = `project.contractValuePaise`, Actual = sum of employee costs from PROJECT snapshots, Variance = Budget - Actual, % Consumed = (Actual / Budget) × 100.

3. **Given** the % Consumed column,
   **When** it renders,
   **Then** color coding applies: green if < 80%, orange if 80-100%, red if > 100%.

4. **Given** a Fixed Cost project's detail page,
   **When** it renders,
   **Then** a "Budget vs Actual" section shows: Budget, Actual Cost, Variance, % Consumed with the same color coding, plus an antd `Progress` bar showing consumption visually.

5. **Given** a T&M, AMC, or Infrastructure project,
   **When** the Project Dashboard renders,
   **Then** the Budget, Variance, and % Consumed columns show "—" (not applicable for non-fixed-cost projects). The Actual Cost column still shows the project's total cost.

6. **Given** `GET /api/v1/reports/projects`,
   **When** called,
   **Then** the response includes `budgetPaise` (null for non-Fixed-Cost), `actualCostPaise`, `variancePaise`, `consumedPercent` (null for non-Fixed-Cost) for each project.

7. **Given** a Fixed Cost project with `contractValuePaise = 0` or null,
   **When** Budget vs Actual is displayed,
   **Then** Budget shows "Not set", Variance and % Consumed show "—", and no color coding is applied.

8. **Given** `budget-vs-actual.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: correct Budget/Actual/Variance/% Consumed calculation, color coding thresholds (green/orange/red), non-Fixed-Cost shows dashes, zero budget edge case, progress bar rendering.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Budget vs Actual is the financial early warning system — if this is wrong, cost overruns go unnoticed. Priority one: the Budget/Actual/Variance/% Consumed columns show correct values for Fixed Cost projects. Priority two: color coding thresholds (green/orange/red) are accurate. Priority three: T&M projects show dashes, not fake budget data. The Progress bar on the detail page is a nice-to-have in testing — get the numbers right first.

### Persona Test Consultation

**Vikram (DM):** "Quinn, the color coding has to be right. If my project is at 85% consumed, I need orange — that's my cue to review scope. If it shows green at 85%, I'll miss the warning. Test the thresholds exactly: 79% should be green, 80% should be orange, 100% should be orange, 101% should be red. No off-by-one errors."

**Quinn's response:** "Boundary testing is exactly right. I'll test at 79%, 80%, 100%, and 101% to nail the thresholds. Off-by-one on color coding is a high-severity bug because it creates false confidence."

**Priya (Finance):** "The CFO asks me every Friday which projects are over budget. I need to sort by % Consumed descending to see the worst ones first. Does the column support sorting? And the Variance column — make sure negative variance (over budget) shows in red with a minus sign, like '-₹5,00,000'. Don't show it as '₹-5,00,000' — that looks like a rendering bug."

**Quinn's response:** "Good catch on the negative currency formatting. I'll test that negative variance renders as '-₹X,XX,XXX' not '₹-X,XX,XXX'. And sorting on % Consumed — I'll verify the column is sortable and defaults to descending for quick identification of problem projects."

**Rajesh (Admin):** "I need to see this across ALL projects in the executive view, not just my own. And make sure the Progress bar on the detail page uses the same color scheme as the table — green, orange, red. Consistency matters."

**Quinn's response:** "Admin sees all projects — that's existing RBAC. I'll add a test for Progress bar color consistency with the table's % Consumed color coding."

### Persona Journey Test Files
```
tests/journeys/
  vikram-identify-at-risk-fixed-cost-projects.spec.ts
  vikram-review-project-budget-detail.spec.ts
  priya-weekly-overbudget-report-for-cfo.spec.ts
  rajesh-executive-budget-overview.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Vikram logs in → Project Dashboard → Fixed Cost project shows Budget, Actual, Variance, % Consumed columns (AC: 1)
- E2E-P2: Fixed Cost project at 50% consumed → green color coding (AC: 3)
- E2E-P3: Fixed Cost project at 90% consumed → orange color coding (AC: 3)
- E2E-P4: Fixed Cost project at 110% consumed → red color coding (AC: 3)
- E2E-P5: Fixed Cost project detail page → Budget vs Actual section with Progress bar (AC: 4)
- E2E-P6: T&M project → Budget, Variance, % Consumed columns show "—" (AC: 5)

### Negative

- E2E-N1: Fixed Cost project with no contract value → Budget shows "Not set", no color coding (AC: 7)
- E2E-N2: Fixed Cost project with zero actual cost → % Consumed shows 0%, green (AC: 2)
- E2E-N3: Project with no snapshot data → Actual shows ₹0, Variance = Budget (AC: 2)

## Tasks / Subtasks

- [ ] Task 1: Budget vs Actual calculation in dashboard service (AC: 2, 6)
  - [ ] 1.1 Extend `dashboard.service.getProjectDashboard()` to include budget fields
  - [ ] 1.2 For Fixed Cost projects: set `budgetPaise = project.contractValuePaise`
  - [ ] 1.3 `actualCostPaise` = sum of EMPLOYEE_COST snapshots for the project
  - [ ] 1.4 `variancePaise` = budgetPaise - actualCostPaise
  - [ ] 1.5 `consumedPercent` = (actualCostPaise / budgetPaise) × 100
  - [ ] 1.6 For non-Fixed-Cost projects: `budgetPaise = null`, `consumedPercent = null`

- [ ] Task 2: Update API response types (AC: 6)
  - [ ] 2.1 Add `budgetPaise`, `actualCostPaise`, `variancePaise`, `consumedPercent` to project response interface
  - [ ] 2.2 Update TypeScript interfaces in backend and frontend

- [ ] Task 3: Budget columns on Project Dashboard (AC: 1, 3, 5)
  - [ ] 3.1 Add Budget, Actual Cost, Variance, % Consumed columns to Project Dashboard table
  - [ ] 3.2 Show "—" for non-Fixed-Cost projects
  - [ ] 3.3 Color code % Consumed: green (< 80%), orange (80-100%), red (> 100%)
  - [ ] 3.4 Format monetary values with `formatCurrency()`, right-align with `tabular-nums`

- [ ] Task 4: Budget vs Actual on Project Detail page (AC: 4)
  - [ ] 4.1 Add "Budget vs Actual" section for Fixed Cost projects
  - [ ] 4.2 Display Budget, Actual, Variance, % Consumed
  - [ ] 4.3 antd `Progress` bar showing consumption percentage
  - [ ] 4.4 Same color coding as dashboard table

- [ ] Task 5: Edge case handling (AC: 7)
  - [ ] 5.1 Handle null/zero contract value: show "Not set" for Budget
  - [ ] 5.2 Suppress color coding when budget is not set

- [ ] Task 6: Frontend API types
  - [ ] 6.1 Update `dashboards.api.ts` with budget vs actual fields

- [ ] Task 7: Backend tests (AC: 8)
  - [ ] 7.1 Test: Fixed Cost project returns correct budget/actual/variance/consumed
  - [ ] 7.2 Test: T&M project returns null for budget and consumed
  - [ ] 7.3 Test: zero contract value edge case
  - [ ] 7.4 Test: over-budget project (consumed > 100%)

- [ ] Task 8: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 8.1 Create or extend `packages/e2e/tests/project-dashboard.spec.ts`
  - [ ] 8.2 Seed: Fixed Cost projects with varied consumption levels
  - [ ] 8.3 Implement E2E-P1 through E2E-P6
  - [ ] 8.4 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Budget from project metadata**: `contractValuePaise` is stored on the `project` table, not in snapshots. Join project data with snapshot data.
2. **Actual cost from snapshots**: Sum EMPLOYEE_COST figure_type snapshots for the project across all periods.
3. **Only for Fixed Cost projects**: The Budget vs Actual section is meaningless for T&M/AMC/Infrastructure. Show "—" for those.
4. **Currency in paise**: All values in BigInt paise. Frontend formats with `formatCurrency()`.
5. **Color coding convention**: Green (< 80% consumed = healthy), Orange (80-100% = approaching limit), Red (> 100% = over budget). Consistent with margin health thresholds.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `packages/backend/src/services/dashboard.service.ts` | Story 6.1 — extend getProjectDashboard |
| Project Dashboard page | `packages/frontend/src/pages/dashboards/ProjectDashboard.tsx` | Story 6.1 — add budget columns |
| Project Detail page | `packages/frontend/src/pages/projects/ProjectDetail.tsx` | Story 3.4/8.5 — add budget section |
| dashboards.api.ts | `packages/frontend/src/services/dashboards.api.ts` | Story 6.1 — extend |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| Fixed Cost calculator | `packages/backend/src/services/calculation-engine/fixed-cost.calculator.ts` | Story 4.3 — reference for cost patterns |

### Gotchas

- **contractValuePaise may be null**: Not all Fixed Cost projects have a contract value set at creation time. Handle gracefully.
- **Actual cost accumulation**: Cost is accumulated across all periods, not just the current month. Use SUM across all period snapshots for the project.
- **BigInt arithmetic**: Variance calculation (budget - actual) may produce negative BigInts. Ensure the frontend handles negative currency display correctly (e.g., "-₹5,00,000").

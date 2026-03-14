# Story 11.4: Project Dashboard — Burn Rate

Status: backlog

## Story

As a Delivery Manager,
I want to see the burn rate for each of my projects on the Project Dashboard and Project Detail page,
so that I can monitor how fast money is being spent and take corrective action if a project is burning too quickly.

## Primary Persona

Vikram (Delivery Manager) — Vikram checks his projects every morning and needs burn rate as a key metric. Without it, he cannot tell whether a project is spending at a sustainable pace or heading for trouble.

## Persona Co-Authorship Review

### Vikram (Delivery Manager) — PASS
> "I need to know burn rate — where is it? Every morning I check my projects and I need to see at a glance how fast we're spending. For T&M projects, what's the average monthly cost? For fixed-cost projects, are we burning faster than planned? Show me a number like '₹2.5L/month' and tell me if that's on track."

### Priya (Finance) — PASS with notes
> "Burn rate is essential for cash flow forecasting. For fixed-cost projects, I need to compare actual burn against planned burn (contract value / total months). If we're over-burning, I need to flag it before we run out of budget."

### Rajesh (Admin) — ADVISORY
> "Burn rate should be visible on the Project Dashboard table so leadership can scan all projects at once."

## Acceptance Criteria (AC)

1. **Given** the Project Dashboard table,
   **When** it renders,
   **Then** a "Burn Rate" column is visible showing the burn rate formatted as ₹X/month (e.g., ₹2,50,000/mo).

2. **Given** a T&M project,
   **When** burn rate is calculated,
   **Then** Burn Rate = Total Cost to Date / Number of months with data (monthly average of employee cost * hours across all months with snapshot data).

3. **Given** a Fixed Cost project,
   **When** burn rate is calculated,
   **Then** Burn Rate = Total Cost to Date / Months elapsed since project start date. Additionally, Planned Burn = `contractValuePaise` / Total planned months (start to end date).

4. **Given** a Fixed Cost project on the Project Detail page,
   **When** it renders,
   **Then** both Actual Burn Rate and Planned Burn Rate are displayed, with a visual indicator: green if actual <= planned, orange if actual is 80-100% of planned, red if actual > planned.

5. **Given** `GET /api/v1/reports/projects`,
   **When** called,
   **Then** the response includes `burnRatePaise` (BigInt) and for Fixed Cost projects additionally `plannedBurnRatePaise` (BigInt) for each project.

6. **Given** a project with only 1 month of data,
   **When** burn rate is calculated,
   **Then** the burn rate equals that month's total cost (no division by zero — months elapsed minimum is 1).

7. **Given** `project-burn-rate.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: T&M burn rate formula, Fixed Cost burn rate formula, planned burn rate calculation, color coding thresholds, single-month edge case, zero-cost project.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Burn rate is Vikram's morning check — he opens the dashboard between meetings and needs to see spend velocity instantly. Priority one: the Burn Rate column appears with correct ₹X/mo format. Priority two: T&M and Fixed Cost formulas produce different but correct results. Priority three: the color indicators on Fixed Cost project detail pages. Edge cases around single-month and zero-cost projects are important but secondary to getting the core formulas right.

### Persona Test Consultation

**Vikram (DM):** "Quinn, I check this every morning before standup. Two things matter: speed and accuracy. The burn rate number needs to load fast — I'm checking between meetings, not running a report. And for my Fixed Cost projects, the Actual vs Planned comparison needs to be obvious. Green means I can move on, red means I need to dig in. Don't make me do math in my head — show me the variance number too."

**Quinn's response:** "Got it, Vikram. I'll test that the burn rate column loads with the dashboard data in a single request — no separate API call that causes a flash of empty data. And for Fixed Cost projects, I'll verify that Actual burn, Planned burn, AND the variance are all visible on the detail page. No mental math required."

**Priya (Finance):** "The burn rate formula needs to be exact. For Fixed Cost projects, if the contract is ₹60L over 12 months, planned burn is ₹5L/month. If actual burn is ₹6L/month, I need to flag that immediately. Test with real-ish numbers — not toy data. Also test what happens when a project has no end date — you can't compute planned burn without it."

**Quinn's response:** "I'll seed test data with realistic contract values and verify the math end-to-end. The no-end-date edge case is in the negative tests — planned burn should show '—' in that case."

### Persona Journey Test Files
```
tests/journeys/
  vikram-morning-project-health-check.spec.ts
  vikram-investigate-overburning-fixed-cost-project.spec.ts
  priya-validate-burn-rate-against-contract.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Vikram logs in → Project Dashboard → sees Burn Rate column with ₹X/mo format for all projects (AC: 1)
- E2E-P2: T&M project shows burn rate as average monthly cost (AC: 2)
- E2E-P3: Fixed Cost project detail page shows Actual vs Planned burn rate with color indicator (AC: 4)
- E2E-P4: Fixed Cost project under budget → green indicator (AC: 4)

### Negative

- E2E-N1: Project with no cost data → burn rate shows ₹0/mo or "—", not an error (AC: 6)
- E2E-N2: Project with start date in the future → burn rate shows "—" (no months elapsed)
- E2E-N3: Fixed Cost project with no contract value → planned burn rate shows "—"

## Tasks / Subtasks

- [ ] Task 1: Burn rate calculation in dashboard service (AC: 2, 3, 5, 6)
  - [ ] 1.1 Extend `dashboard.service.getProjectDashboard()` to compute `burnRatePaise` per project
  - [ ] 1.2 T&M formula: Total Cost / months with snapshot data
  - [ ] 1.3 Fixed Cost formula: Total Cost / months elapsed since `startDate`
  - [ ] 1.4 Fixed Cost planned burn: `contractValuePaise` / total planned months (`endDate` - `startDate`)
  - [ ] 1.5 Edge case: minimum 1 month to avoid division by zero

- [ ] Task 2: Include burn rate in API response (AC: 5)
  - [ ] 2.1 Add `burnRatePaise` field to project dashboard response type
  - [ ] 2.2 Add `plannedBurnRatePaise` field for Fixed Cost projects
  - [ ] 2.3 Update TypeScript interfaces in both backend and frontend

- [ ] Task 3: Burn Rate column on Project Dashboard (AC: 1)
  - [ ] 3.1 Add "Burn Rate" column to Project Dashboard antd Table
  - [ ] 3.2 Format as `formatCurrency(burnRatePaise) + '/mo'`
  - [ ] 3.3 Right-align with `tabular-nums`

- [ ] Task 4: Burn rate on Project Detail page (AC: 4)
  - [ ] 4.1 Add Burn Rate section to project detail view
  - [ ] 4.2 For Fixed Cost: show Actual vs Planned with color indicator
  - [ ] 4.3 Color coding: green (actual <= planned), orange (80-100%), red (actual > planned)

- [ ] Task 5: Frontend API types
  - [ ] 5.1 Update `dashboards.api.ts` interfaces with burn rate fields

- [ ] Task 6: Backend tests (AC: 7)
  - [ ] 6.1 Test: T&M burn rate = total cost / months with data
  - [ ] 6.2 Test: Fixed Cost burn rate = total cost / months elapsed
  - [ ] 6.3 Test: planned burn rate = contract value / planned months
  - [ ] 6.4 Test: single month → burn rate = that month's cost
  - [ ] 6.5 Test: zero cost → burn rate = 0

- [ ] Task 7: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 7.1 Create or extend `packages/e2e/tests/project-dashboard.spec.ts`
  - [ ] 7.2 Implement E2E-P1 through E2E-P4
  - [ ] 7.3 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Read from PROJECT snapshots**: `calculation_snapshots` WHERE `entity_type = 'PROJECT'`. Count distinct `(periodMonth, periodYear)` combinations for months with data.
2. **Months elapsed from project metadata**: Use `project.startDate` to compute elapsed months. For T&M, prefer months-with-data count over calendar elapsed months.
3. **Currency in paise**: All burn rate values stored and transmitted as BigInt paise. Frontend formats with `formatCurrency()`.
4. **No chart library**: Color indicators use antd `Tag` or inline styles. No recharts/chart.js.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `packages/backend/src/services/dashboard.service.ts` | Story 6.1 — extend getProjectDashboard |
| Project Dashboard page | `packages/frontend/src/pages/dashboards/ProjectDashboard.tsx` | Story 6.1 — add Burn Rate column |
| dashboards.api.ts | `packages/frontend/src/services/dashboards.api.ts` | Story 6.1 — extend project types |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| Calculation engine | `packages/backend/src/services/calculation-engine/` | Reference for cost calculation patterns |

### Gotchas

- **T&M vs Fixed Cost formula difference**: T&M uses months-with-data (from snapshots), Fixed Cost uses calendar months elapsed from project start. Different denominators for different project types.
- **Project with no end date**: Fixed Cost projects without an end date cannot compute planned burn rate. Show "—" instead.
- **Months elapsed calculation**: Use `differenceInMonths` from date-fns or manual calculation. Partial months count as 1 (ceiling).

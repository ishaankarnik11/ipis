# Story 9.3: Fix Revenue/Cost/Profit Blank on Project View

Status: backlog

## Story

As a Delivery Manager or Finance user,
I want to see revenue, cost, and profit data populated for every project on the project list and project detail views so that I can assess project health at a glance without drilling into separate dashboards.

## Primary Persona

Vikram (Delivery Manager) — Vikram checks his projects every morning. If revenue, cost, and profit columns are blank, the project list is useless to him and he cannot track project health.

## Persona Co-Authorship Review

### Vikram (DM) — FAIL (blocking)
> "Revenue, cost, and profit columns are blank for all my projects. What am I looking at? The Executive Dashboard shows the correct totals, so I know the data exists somewhere. But when I go to the Projects page to see per-project numbers, everything is blank. This is the most basic thing — I need to see how each project is doing."

### Priya (Finance) — FAIL (blocking)
> "I uploaded revenue data and the Executive Dashboard shows the correct company total. But the project-level view shows nothing. How do I verify individual project revenue if I can't see it? I need per-project revenue, cost, and margin to reconcile my uploads."

### Arjun (Dept Head) — ADVISORY
> "If the project list shows blank financials, my department's project performance is invisible. I rely on this view to see which of my department's projects are healthy."

## Acceptance Criteria (AC)

1. **Given** the project list page (`/projects`),
   **When** the page loads with projects that have calculation_snapshot data,
   **Then** each project row displays populated values for Revenue, Cost, Profit, and Margin % — not blank or zero when data exists.

2. **Given** a project with calculation_snapshots,
   **When** the project list API endpoint is called,
   **Then** the response includes per-project financial summary fields: `totalRevenuePaise`, `totalCostPaise`, `profitPaise`, `marginPercent` — sourced from the latest calculation_snapshot for each project.

3. **Given** a project with NO calculation_snapshots (new project, no uploads yet),
   **When** the project list loads,
   **Then** the financial columns show `--` or `0` (not blank/undefined) — clearly indicating no data rather than a broken display.

4. **Given** the project detail page (`/projects/:id`),
   **When** the page loads for a project with snapshot data,
   **Then** the financial summary section shows correct revenue, cost, profit, and margin values — matching the Executive Dashboard's per-project numbers.

5. **Given** the Executive Dashboard showing correct project financials,
   **When** the same project is viewed on the project list page,
   **Then** the financial values match (sourced from the same calculation_snapshots table).

6. **Given** `project-financials.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: project list API returns financial fields from snapshots, project with no snapshots returns nulls/zeros, financial values match between project list and dashboard APIs, frontend renders formatCurrency values correctly.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Blank financial columns is the most common complaint from the demo. The data exists in calculation_snapshots — the Executive Dashboard proves that. The project list just isn't querying it. My priority: verify the project list shows the same numbers as the Executive Dashboard for the same project. If those match, we're golden. Secondary: handle the zero-data case cleanly.

### Persona Test Consultation

**Vikram (DM):** "Revenue, cost, and profit columns are blank for all my projects. What am I looking at? The Executive Dashboard shows the correct totals, so I know the data exists somewhere. I check this every morning between meetings — I need answers in 2 clicks. Project list should show me revenue, cost, margin right there in the table. And when I click into a project, the detail page should have the same numbers, not blank."

**Quinn's response:** "I'll test this as Vikram's morning workflow: log in as DM, open Projects page, assert financial columns are populated (not blank, not undefined, not NaN). Then click into a project and verify the detail page shows the same values. I'll also cross-reference with the Executive Dashboard API to make sure numbers match."

**Priya (Finance):** "I uploaded revenue data and the Executive Dashboard shows the correct company total. But the project-level view shows nothing. How do I verify individual project revenue if I can't see it? I need per-project revenue, cost, and margin to reconcile my uploads."

**Quinn's response:** "Good point on reconciliation. I'll add a test that uploads revenue data, triggers recalculation, then checks that the project list reflects the uploaded values — not just that columns are non-blank, but that they show the right amounts."

**Arjun (Dept Head):** "If the project list shows blank financials, my department's project performance is invisible. I rely on this view to see which of my department's projects are healthy."

**Quinn's response:** "I'll include a dept head perspective test: Arjun's projects should show financials too, filtered through the department lens. This overlaps with story 9.6 but the financial display is tested here."

### Persona Journey Test Files
```
tests/journeys/
  vikram-morning-project-health-check.spec.ts
  priya-reconcile-uploaded-revenue-with-project-view.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Vikram logs in → Projects page → sees revenue, cost, profit columns populated for his projects (AC: 1, 2)
- E2E-P2: Priya logs in → Projects page → revenue values match what she uploaded → match Executive Dashboard totals (AC: 5)
- E2E-P3: Vikram clicks a project → project detail page shows financial summary with correct values (AC: 4)
- E2E-P4: Admin views a newly created project with no uploads → financial columns show `--` or `0`, not blank (AC: 3)

### Negative

- E2E-N1: Project with no snapshots → columns show placeholder, not undefined/NaN/blank (AC: 3)
- E2E-N2: DM can only see financials for their own projects (RBAC preserved) (AC: 1)

## Tasks / Subtasks

- [ ] Task 1: Diagnose the data flow gap (AC: 1, 2)
  - [ ] 1.1 Check the project list API endpoint — does it query `calculation_snapshots`?
  - [ ] 1.2 Compare with the Executive Dashboard API query — how does it get per-project financials?
  - [ ] 1.3 Identify the gap: missing JOIN, wrong field mapping, or missing aggregation

- [ ] Task 2: Fix the project list API to include financial data (AC: 2)
  - [ ] 2.1 Add a LEFT JOIN or subquery to include latest calculation_snapshot per project
  - [ ] 2.2 Return fields: `totalRevenuePaise`, `totalCostPaise`, `profitPaise`, `marginPercent`
  - [ ] 2.3 Handle projects with no snapshots: return null/zero values

- [ ] Task 3: Fix the project detail API (AC: 4)
  - [ ] 3.1 Ensure the project detail endpoint includes the same financial summary
  - [ ] 3.2 Source from the latest calculation_snapshot for that project

- [ ] Task 4: Fix frontend rendering (AC: 1, 3)
  - [ ] 4.1 Check the project list table column definitions — are they mapped to the correct response fields?
  - [ ] 4.2 Use `formatCurrency` for revenue/cost/profit columns
  - [ ] 4.3 Use `formatPercent` or `MarginHealthBadge` for margin column
  - [ ] 4.4 Show `--` for null values, `formatCurrency(0)` for zero values

- [ ] Task 5: Backend tests (AC: 6)
  - [ ] 5.1 Add tests to project service: list endpoint returns financial fields
  - [ ] 5.2 Test project with snapshots returns correct values
  - [ ] 5.3 Test project without snapshots returns nulls/zeros
  - [ ] 5.4 Test financial values match dashboard service output for same project

- [ ] Task 6: E2E tests (E2E-P1 through E2E-N2)
  - [ ] 6.1 Create or extend `packages/e2e/tests/project-financials.spec.ts`
  - [ ] 6.2 Implement E2E-P1 through E2E-P4
  - [ ] 6.3 Implement E2E-N1, E2E-N2

## Dev Notes

### Architecture Constraints

1. **Single source of truth: calculation_snapshots**: All financial data comes from the `calculation_snapshots` table, populated during recalculation. Do NOT compute financials on-the-fly in the project list query — use the pre-computed snapshots.
2. **Latest snapshot per project**: Each project may have multiple snapshots (one per recalculation). Use the latest snapshot (by `createdAt` or `snapshotMonth`) for the project list view.
3. **Currency in paise (BigInt)**: All monetary values are stored in paise. Frontend uses `formatCurrency` to display as rupees. Do NOT format on the backend.
4. **RBAC scoping**: The project list API already filters by role (DM sees own projects, Finance/Admin sees all). The financial data JOIN must respect this existing scoping — do not change the WHERE clause, only add the financial data.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Project list endpoint | `packages/backend/src/services/project.service.ts` | Story 3.1 — `getProjects()` function |
| Project list route | `packages/backend/src/routes/projects.routes.ts` | Story 3.1 |
| Dashboard service | `packages/backend/src/services/dashboard.service.ts` | Story 6.1/6.2 — has working per-project financial queries |
| calculation_snapshots | Prisma schema | Story 4.5 — snapshot table with revenue, cost, profit, margin |
| formatCurrency | `packages/frontend/src/utils/` | Currency formatting utility |
| formatPercent | `packages/frontend/src/utils/` | Percentage formatting utility |
| MarginHealthBadge | `packages/frontend/src/components/` | Visual margin indicator |
| ProjectList | `packages/frontend/src/pages/projects/` | Project list UI component |

### Gotchas

- **The data exists, just not queried**: The Executive Dashboard shows correct per-project financials, so `calculation_snapshots` has the data. The project list endpoint simply doesn't query it. The fix is likely a LEFT JOIN or a subquery in the project list service function.
- **Snapshot aggregation**: A project may have snapshots for multiple months. Decide whether to show: (a) the latest month's snapshot, (b) cumulative totals across all months, or (c) current fiscal year totals. Match whatever the Executive Dashboard uses for consistency.
- **Performance**: Adding a JOIN to the project list query could impact performance if there are many snapshots. Consider using a subquery with `DISTINCT ON` (PostgreSQL) or a window function to get the latest snapshot per project.
- **Backlog item B3**: This is a P0 bug — blank financial columns make the project view useless for its primary audience (DMs and Finance).

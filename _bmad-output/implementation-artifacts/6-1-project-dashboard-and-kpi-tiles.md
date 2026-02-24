# Story 6.1: Project Dashboard & KPI Tiles

Status: ready-for-dev

## Story

As a Finance, Delivery Manager, or Department Head user,
I want to view a dashboard listing all projects I have access to with key profitability KPIs for the current data period,
so that I can immediately identify which projects are healthy, at risk, or in loss.

## Acceptance Criteria (AC)

1. **Given** `GET /api/v1/reports/projects` is called,
   **When** the query runs,
   **Then** it reads from `calculation_snapshots` where `entity_type = 'PROJECT'` and `period_month`/`period_year` match the latest SUCCESS upload period — returning `project_id`, `project_name`, `engagement_model`, `department`, `vertical`, `revenue_paise`, `cost_paise`, `profit_paise`, `margin_percent` for each project (FR37).

2. **Given** a Delivery Manager calls the endpoint,
   **When** results are returned,
   **Then** only projects where `project_manager_id = req.user.id` are included; Finance and Admin receive all projects; Department Head receives projects in their department only (FR10, FR37).

3. **Given** the project list renders in the frontend,
   **When** a project row is displayed,
   **Then** a `MarginHealthBadge` component shows: green badge if `margin_percent ≥ 20%`, amber if `10–19%`, red if `< 10%`.

4. **Given** any project with `profit_paise < 0` (loss project),
   **When** the row renders,
   **Then** the row background is `#FFF2F0` and an `AtRiskKPITile` indicator is displayed with the deficit amount formatted via `formatCurrency()`.

5. **Given** the dashboard filter bar,
   **When** a user selects filters (department, vertical, engagement model, status),
   **Then** the project list re-queries with those filters as URL search params; filters persist on page refresh via URL state.

6. **Given** the column headers (Revenue, Cost, Profit, Margin %),
   **When** a user clicks a header,
   **Then** the list sorts by that column ascending/descending; Margin % sorts descending by default on first load.

7. **Given** all monetary figures in API responses (paise),
   **When** they render in the dashboard,
   **Then** they are formatted via `formatCurrency()` from `packages/shared` — never raw paise values in UI text.

8. **Given** `project-dashboard.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: Delivery Manager scope filtering, MarginHealthBadge threshold rendering, AtRiskKPITile on loss projects, filter param propagation, sort behavior.

## E2E Test Scenarios

### Positive

- E2E-P1: DM navigates to project dashboard → sees only their own projects with Revenue, Cost, Profit, Margin % columns, monetary values formatted as currency (AC: 2, 7)
- E2E-P2: Admin navigates to project dashboard → sees all projects including other DMs' projects (AC: 2)
- E2E-P3: MarginHealthBadge renders correct colors — green for healthy margin (≥20%), amber for 10-19%, red for <10% on visible project rows (AC: 3)
- E2E-P4: Loss project row has red-tinted background and shows deficit amount with currency formatting (AC: 4)
- E2E-P5: User selects department filter → table re-queries showing only matching projects, filter persists on page refresh via URL params (AC: 5)
- E2E-P6: Click Margin % column header → table sorts descending, click again → ascending (AC: 6)

### Negative

- E2E-N1: HR user navigates to `/dashboards/projects` — redirected to role landing page (unauthorized)
- E2E-N2: Dashboard with no snapshot data for current period → empty state message shown, no crash

## Tasks / Subtasks

- [ ] Task 1: Reports API — project dashboard endpoint (AC: 1, 2)
  - [ ] 1.1 Create `routes/dashboards.routes.ts` — mount at `/api/v1/reports`
  - [ ] 1.2 `GET /projects` — `rbacMiddleware(['finance', 'admin', 'delivery_manager', 'department_head'])`
  - [ ] 1.3 Create `services/dashboard.service.ts` — `getProjectDashboard(user, filters)`
  - [ ] 1.4 Query `calculation_snapshots` WHERE `entity_type = 'PROJECT'` + latest period
  - [ ] 1.5 RBAC data scoping inside service: DM → own projects, DH → own dept, Finance/Admin → all
  - [ ] 1.6 Support filter params: department, vertical, engagement_model, status
  - [ ] 1.7 Support sort params: sort_by, sort_order
  - [ ] 1.8 Register in `routes/index.ts`

- [ ] Task 2: MarginHealthBadge component (AC: 3)
  - [ ] 2.1 Create `components/MarginHealthBadge.tsx`
  - [ ] 2.2 Props: `marginPercent: number` (decimal 0-1)
  - [ ] 2.3 Green (≥ 0.20), Amber (0.10–0.19), Red (< 0.10)
  - [ ] 2.4 antd `Tag` with color mapping

- [ ] Task 3: AtRiskKPITile component (AC: 4)
  - [ ] 3.1 Create `components/AtRiskKPITile.tsx`
  - [ ] 3.2 Props: `deficitPaise: number`
  - [ ] 3.3 Displays formatted deficit via `formatCurrency()`

- [ ] Task 4: Project Dashboard page (AC: 3, 4, 5, 6, 7)
  - [ ] 4.1 Create `pages/dashboards/ProjectDashboard.tsx`
  - [ ] 4.2 antd `Table` with project rows — Revenue, Cost, Profit, Margin %
  - [ ] 4.3 Loss rows: `#FFF2F0` background + `AtRiskKPITile`
  - [ ] 4.4 Filter bar: Department, Vertical, Engagement Model, Status — URL search params
  - [ ] 4.5 Sortable column headers — Margin % descending by default
  - [ ] 4.6 All monetary values via `formatCurrency()`

- [ ] Task 5: API service + query keys (AC: 1)
  - [ ] 5.1 Create `services/dashboards.api.ts`
  - [ ] 5.2 TanStack Query key: `reportKeys.projects(filters)`
  - [ ] 5.3 `staleTime: 2 * 60 * 1000` (2 min — data is snapshot-based)

- [ ] Task 6: Router integration (AC: 1)
  - [ ] 6.1 Add `/dashboards/projects` route — guarded for Finance, DM, DH, Admin

- [ ] Task 7: Tests (AC: 8)
  - [ ] 7.1 Create `pages/dashboards/project-dashboard.test.tsx`
  - [ ] 7.2 Test: DM sees only own projects
  - [ ] 7.3 Test: MarginHealthBadge green/amber/red thresholds
  - [ ] 7.4 Test: AtRiskKPITile on loss projects (profit_paise < 0)
  - [ ] 7.5 Test: Filter params propagated to API
  - [ ] 7.6 Test: Sort by Margin % descending default
  - [ ] 7.7 Create `services/dashboard.service.test.ts` — RBAC scoping tests

- [ ] Task 8: E2E Tests (E2E-P1 through E2E-N2)
  - [ ] 8.1 Create `packages/e2e/tests/project-dashboard.spec.ts`
  - [ ] 8.2 Seed data: ensure calculation_snapshots with PROJECT entity_type exist in `seed.ts` for multiple DMs
  - [ ] 8.3 Implement E2E-P1 through E2E-P6 (positive scenarios)
  - [ ] 8.4 Implement E2E-N1 through E2E-N2 (negative scenarios)
  - [ ] 8.5 All existing + new E2E tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Read from snapshots**: Dashboard queries read `calculation_snapshots` — NEVER re-run the calculation engine at query time.
2. **RBAC scoping in service layer**: DM → `WHERE project_manager_id = userId`; DH → `WHERE department_id = userDeptId`; Finance/Admin → no filter. Applied in `dashboard.service.ts`, not in route handler.
3. **Currency formatting in frontend only**: API returns paise; frontend calls `formatCurrency()` from shared package.
4. **Percentages as decimals**: API returns `margin_percent` as 0-1 decimal. Frontend formats to `%`.
5. **URL state for filters**: Use `useSearchParams()` from React Router v7 for filter persistence.
6. **TanStack Query keys**: Constants in `dashboards.api.ts` — `['reports', 'projects', filters]`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| calculation_snapshots table | `prisma/schema.prisma` | Story 4.5 — snapshot data source |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 — paise → ₹ formatting |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 — decimal → % formatting |
| Auth/RBAC middleware | `middleware/` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.1 |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| Router guards | `router/guards.tsx` | Story 1.3 |
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/
├── routes/
│   └── dashboards.routes.ts
├── services/
│   ├── dashboard.service.ts
│   └── dashboard.service.test.ts

packages/frontend/src/
├── pages/dashboards/
│   ├── ProjectDashboard.tsx
│   └── project-dashboard.test.tsx
├── components/
│   ├── MarginHealthBadge.tsx
│   └── AtRiskKPITile.tsx
├── services/
│   └── dashboards.api.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Dashboard Data Flow, RBAC Scoping]
- [Source: _bmad-output/planning-artifacts/prd.md — FR37, FR10]

### Previous Story Intelligence

- **From 4.5:** `calculation_snapshots` table populated with PROJECT-level rows per figure type per period. This is the dashboard's data source.
- **From 5.2:** `triggerRecalculation` writes snapshots after every billing upload. Dashboard data is always fresh after upload.
- **From 1.3:** Router guards and `useAuth` hook established. Frontend role checks are UX-only — real enforcement is server-side RBAC.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

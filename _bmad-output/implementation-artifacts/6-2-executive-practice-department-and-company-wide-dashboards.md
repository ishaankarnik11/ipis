# Story 6.2: Executive, Practice, Department & Company-Wide Dashboards

Status: ready-for-dev

## Story

As a Finance user, Admin, or Department Head,
I want to view profitability rollups at executive (company-wide KPIs + top/bottom projects), practice/discipline, department, and company-wide levels,
so that leadership can identify systemic cost patterns and make resource allocation decisions beyond individual projects.

## Acceptance Criteria (AC)

1. **Given** `GET /api/v1/reports/executive`,
   **When** called by Finance or Admin,
   **Then** it returns: total revenue YTD (paise), total cost YTD (paise), gross margin % (decimal), billable utilisation % (total billable hours / total available hours across all active employees), top 5 projects by margin %, bottom 5 projects by margin % — all sourced from `calculation_snapshots` for the current period (FR36).

2. **Given** the Executive Dashboard page,
   **When** it renders,
   **Then** the top-5/bottom-5 sections display project cards with `MarginHealthBadge` and an `AtRiskKPITile` for projects in loss; clicking any project card navigates to the Project Dashboard filtered to that project.

3. **Given** `GET /api/v1/reports/practice`,
   **When** called by Finance or Admin,
   **Then** it returns aggregated data from `calculation_snapshots` where `entity_type = 'PRACTICE'` — one row per designation with total revenue, cost, profit, margin %, and employee count contributing to that practice (FR36).

4. **Given** `GET /api/v1/reports/department`,
   **When** called by a Department Head,
   **Then** only snapshots where `entity_id` matches their department are returned; Finance and Admin receive all departments (FR39, FR10).

5. **Given** `GET /api/v1/reports/company`,
   **When** called,
   **Then** it returns the single `entity_type = 'COMPANY'` snapshot row — company-wide revenue, cost, profit, margin % — plus a department breakdown array for drill-through (FR39).

6. **Given** the practice dashboard view,
   **When** it renders,
   **Then** it shows a "Top cost contributors by designation" section listing top 5 designations by total cost_paise with antd v6 `Progress` bar representations (no additional chart library).

7. **Given** the department rollup dashboard,
   **When** it renders,
   **Then** each department row shows total revenue, cost, profit, margin % with a `MarginHealthBadge`; clicking a department row navigates to the Project Dashboard filtered to that department.

8. **Given** any dashboard page (executive, practice, department, company),
   **When** it renders,
   **Then** a `DataPeriodIndicator` in the page header shows "Data as of: [Month Year] · Updated [relative time]" based on the latest SUCCESS `upload_events` row.

9. **Given** `reports.service.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: executive endpoint returns correct top-5/bottom-5 ordering, utilisation % formula, practice aggregation correctness, department scope filtering (DH sees own only), company rollup, DataPeriodIndicator period resolution.

## E2E Test Scenarios

### Positive

- E2E-P1: Finance user navigates to executive dashboard → sees KPI tiles (total revenue, cost, margin %, utilisation %) with monetary values formatted as currency (AC: 1, 2)
- E2E-P2: Executive dashboard shows top-5 and bottom-5 project cards with MarginHealthBadge; clicking a project card navigates to Project Dashboard (AC: 2)
- E2E-P3: Finance user views practice dashboard → sees "Top cost contributors by designation" with progress bars (AC: 3, 6)
- E2E-P4: Department Head views department dashboard → sees only own department row with revenue, cost, profit, margin % and MarginHealthBadge (AC: 4, 7)
- E2E-P5: Admin views department dashboard → sees all departments; clicking a row navigates to Project Dashboard filtered by department (AC: 4, 7)
- E2E-P6: Company dashboard shows company-wide revenue, cost, profit, margin % with department breakdown array (AC: 5)
- E2E-P7: DataPeriodIndicator shows "Data as of: [Month Year]" on all dashboard pages (AC: 8)

### Negative

- E2E-N1: DM user navigates to `/dashboards/executive` — redirected to role landing page (unauthorized)
- E2E-N2: HR user navigates to `/dashboards/department` — redirected to role landing page (unauthorized)
- E2E-N3: Dashboard with no snapshot data for current period → empty state message shown, no crash

## Tasks / Subtasks

- [ ] Task 1: Executive report API (AC: 1)
  - [ ] 1.1 Add `GET /executive` to `dashboards.routes.ts` — `rbacMiddleware(['finance', 'admin'])`
  - [ ] 1.2 `dashboard.service.getExecutiveDashboard()` — query COMPANY snapshot + top/bottom 5 PROJECT snapshots by margin
  - [ ] 1.3 Calculate billable utilisation % from EMPLOYEE snapshots

- [ ] Task 2: Practice report API (AC: 3)
  - [ ] 2.1 Add `GET /practice` to `dashboards.routes.ts` — `rbacMiddleware(['finance', 'admin'])`
  - [ ] 2.2 `dashboard.service.getPracticeDashboard()` — query PRACTICE snapshots, group by designation

- [ ] Task 3: Department report API (AC: 4)
  - [ ] 3.1 Add `GET /department` to `dashboards.routes.ts` — `rbacMiddleware(['finance', 'admin', 'department_head'])`
  - [ ] 3.2 `dashboard.service.getDepartmentDashboard(user)` — DH scoped to own dept, Finance/Admin get all
  - [ ] 3.3 Query DEPARTMENT snapshots

- [ ] Task 4: Company report API (AC: 5)
  - [ ] 4.1 Add `GET /company` to `dashboards.routes.ts` — `rbacMiddleware(['finance', 'admin'])`
  - [ ] 4.2 `dashboard.service.getCompanyDashboard()` — query single COMPANY snapshot + DEPARTMENT breakdown

- [ ] Task 5: Executive Dashboard page (AC: 2)
  - [ ] 5.1 Create `pages/dashboards/ExecutiveDashboard.tsx`
  - [ ] 5.2 KPI tiles: total revenue, cost, margin %, utilisation %
  - [ ] 5.3 Top-5 / Bottom-5 project cards with `MarginHealthBadge` + `AtRiskKPITile`
  - [ ] 5.4 Click project card → navigate to ProjectDashboard filtered

- [ ] Task 6: Practice dashboard view (AC: 6)
  - [ ] 6.1 Section within Executive or standalone page for practice breakdown
  - [ ] 6.2 "Top cost contributors by designation" — top 5 by cost_paise
  - [ ] 6.3 antd `Progress` bars for cost contribution visualization

- [ ] Task 7: Department dashboard page (AC: 7)
  - [ ] 7.1 Create `pages/dashboards/DepartmentDashboard.tsx`
  - [ ] 7.2 Department rows: revenue, cost, profit, margin % + `MarginHealthBadge`
  - [ ] 7.3 Click department row → navigate to ProjectDashboard filtered by department

- [ ] Task 8: DataPeriodIndicator integration (AC: 8)
  - [ ] 8.1 Add `DataPeriodIndicator` to all dashboard page headers
  - [ ] 8.2 Query latest SUCCESS upload_events for period resolution

- [ ] Task 9: API service + query keys
  - [ ] 9.1 Add to `services/dashboards.api.ts` — executive, practice, department, company endpoints
  - [ ] 9.2 TanStack Query keys: `reportKeys.executive`, `reportKeys.practice`, `reportKeys.department(filters)`, `reportKeys.company`

- [ ] Task 10: Router integration
  - [ ] 10.1 Add routes: `/dashboards/executive`, `/dashboards/department`, `/dashboards/company`
  - [ ] 10.2 Guard: executive/company → Finance+Admin; department → Finance+Admin+DH

- [ ] Task 11: Tests (AC: 9)
  - [ ] 11.1 Add to `services/dashboard.service.test.ts`:
  - [ ] 11.2 Test: Executive — top-5/bottom-5 ordering by margin
  - [ ] 11.3 Test: Executive — utilisation % = total billable hours / total available hours
  - [ ] 11.4 Test: Practice — aggregation by designation
  - [ ] 11.5 Test: Department — DH sees own department only
  - [ ] 11.6 Test: Company — single rollup row + department breakdown
  - [ ] 11.7 Create frontend test for DataPeriodIndicator rendering

- [ ] Task 12: E2E Tests (E2E-P1 through E2E-N3)
  - [ ] 12.1 Create `packages/e2e/tests/executive-dashboards.spec.ts`
  - [ ] 12.2 Seed data: ensure calculation_snapshots with COMPANY, PRACTICE, DEPARTMENT entity_types exist in `seed.ts`
  - [ ] 12.3 Implement E2E-P1 through E2E-P7 (positive scenarios)
  - [ ] 12.4 Implement E2E-N1 through E2E-N3 (negative scenarios)
  - [ ] 12.5 All existing + new E2E tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **All reads from snapshots**: No recalculation at query time. All endpoints read from `calculation_snapshots`.
2. **Entity type mapping**: Executive → COMPANY + PROJECT snapshots; Practice → PRACTICE snapshots; Department → DEPARTMENT snapshots; Company → COMPANY snapshot.
3. **RBAC scoping in service layer**: DH → own department; Finance/Admin → all. Never in route handler.
4. **No chart library**: Use antd `Progress` bars for practice cost visualization. No recharts/chart.js.
5. **DataPeriodIndicator on every dashboard**: Shows data freshness — sourced from latest SUCCESS `upload_events`.
6. **Currency/percentage formatting**: API returns paise + decimals. Frontend formats.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `services/dashboard.service.ts` | Story 6.1 — extend with executive/practice/dept/company |
| dashboards.routes.ts | `routes/dashboards.routes.ts` | Story 6.1 — extend with new endpoints |
| dashboards.api.ts | `services/dashboards.api.ts` | Story 6.1 — extend with new query functions |
| MarginHealthBadge | `components/MarginHealthBadge.tsx` | Story 6.1 |
| AtRiskKPITile | `components/AtRiskKPITile.tsx` | Story 6.1 |
| DataPeriodIndicator | `components/DataPeriodIndicator.tsx` | Story 5.3 |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/frontend/src/pages/dashboards/
├── ExecutiveDashboard.tsx
└── DepartmentDashboard.tsx
```

Existing files to modify:
```
packages/backend/src/routes/dashboards.routes.ts      # Add executive, practice, department, company endpoints
packages/backend/src/services/dashboard.service.ts     # Add methods for each dashboard level
packages/backend/src/services/dashboard.service.test.ts # Add tests
packages/frontend/src/services/dashboards.api.ts       # Add query functions
packages/frontend/src/router/index.tsx                 # Add routes
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Dashboard Data Flow, 4-Level Profitability]
- [Source: _bmad-output/planning-artifacts/prd.md — FR36, FR39, FR10]

### Previous Story Intelligence

- **From 6.1:** `dashboard.service.ts`, `dashboards.routes.ts`, `MarginHealthBadge`, `AtRiskKPITile` all exist. Extend — do not recreate.
- **From 5.3:** `DataPeriodIndicator` component exists. Import and place in all dashboard headers.
- **From 4.5:** Snapshot entity types: PROJECT, PRACTICE, DEPARTMENT, COMPANY, EMPLOYEE — all populated by snapshot service.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

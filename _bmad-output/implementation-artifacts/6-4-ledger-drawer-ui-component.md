# Story 6.4: Ledger Drawer — UI Component

Status: done

## Story

As a Finance, Delivery Manager, or Admin user,
I want to click any project row and see a detailed Ledger Drawer that shows exactly how the margin figure was calculated — with a model-appropriate cost breakdown visible (employee table for most models, lump-sum costs for Infrastructure Simple),
so that I can trust the numbers and investigate any unexpected result without leaving the dashboard.

## Acceptance Criteria (AC)

1. **Given** any project row in the dashboard,
   **When** the user clicks it,
   **Then** an antd v6 `Drawer` component opens from the right side at 480px width with the project name and data period in the drawer title — this is "The Ledger" (FR35).

2. **Given** the Drawer opens,
   **When** the `GET /api/v1/reports/projects/:id/ledger` API call resolves,
   **Then** the drawer renders within 1.5 seconds total (network + render) showing: Revenue, Cost, Profit, Margin % KPI tiles at the top; a **model-appropriate cost breakdown** below.

3. **Given** a T&M, Fixed Cost, AMC, or Infrastructure DETAILED project,
   **When** the Drawer renders,
   **Then** an employee breakdown table is shown with columns: Employee Name, Designation, Hours, Cost/Hour (₹), Contribution (₹); all monetary cells use `font-feature-settings: 'tnum'` (tabular numerals) for column alignment. For Infra DETAILED, a "Vendor Cost" line item is shown above the employee table.

3a. **Given** an Infrastructure SIMPLE project,
    **When** the Drawer renders,
    **Then** instead of the employee table, a **cost summary card** is shown with two line items: "Vendor Cost (₹)" and "Manpower Cost (₹)", each formatted as currency. No employee table is rendered.

4. **Given** any figure in the Ledger that is derived (not a raw input),
   **When** rendered,
   **Then** it has a dotted underline (`border-bottom: 1px dotted`); hovering over it shows a tooltip with the formula used to calculate it (e.g., "Annual CTC (₹X) + ₹1,80,000 overhead ÷ 12 ÷ 160 hours").

5. **Given** any employee row where `contribution_paise` is the largest single contributor to a loss (applicable to models with employee breakdown),
   **When** the project is in loss (`profit_paise < 0`),
   **Then** that row's background is `#FFF2F0` — consistent with the loss-row convention. For Infra SIMPLE, the cost summary card has a red border instead.

6. **Given** the `engine_version` and `calculated_at` fields in the snapshot,
   **When** rendered at the bottom of the Drawer,
   **Then** a metadata footer shows "Calculated: [relative timestamp] · Engine v[version]" so users can identify stale data.

7. **Given** the Drawer on mobile viewports,
   **When** the screen width is < 768px,
   **Then** the Drawer renders at 100% width (full-screen overlay) instead of 480px.

8. **Given** the Drawer is open and the user presses Escape or clicks the backdrop,
   **When** the close event fires,
   **Then** the Drawer closes and the TanStack Query cache entry for that ledger remains warm (no refetch on reopen within 5 minutes).

9. **Given** `ledger-drawer.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: drawer open on row click, API call with correct project ID and period, dotted underline on derived figures, loss-row background, metadata footer content, mobile width override, Escape/backdrop close, **Infra SIMPLE cost summary card rendering**, **Infra DETAILED vendor cost line + employee table**.

## E2E Test Scenarios

### Positive

- E2E-P1: Finance user clicks a project row on the dashboard → Ledger Drawer opens from right with project name and period in title (AC: 1)
- E2E-P2: T&M/AMC project Drawer shows Revenue, Cost, Profit, Margin % KPI tiles at top and employee breakdown table below with correct columns (Name, Designation, Hours, Cost/Hour, Contribution) (AC: 2, 3)
- E2E-P2a: Infra SIMPLE project Drawer shows KPI tiles and cost summary card (Vendor Cost, Manpower Cost) — no employee table (AC: 2, 3a)
- E2E-P2b: Infra DETAILED project Drawer shows KPI tiles, Vendor Cost line item, and employee breakdown table (AC: 2, 3)
- E2E-P3: Derived figures (Cost/Hour, Margin %) have dotted underline; hovering shows formula tooltip (AC: 4)
- E2E-P4: Loss project ledger — largest contributor row has `#FFF2F0` background; Infra SIMPLE loss shows red border on cost card (AC: 5)
- E2E-P5: Metadata footer shows "Calculated: [relative time] · Engine v[version]" (AC: 6)
- E2E-P6: User presses Escape → Drawer closes; reopening same project does not trigger new API call (cache warm) (AC: 8)

### Negative

- E2E-N1: HR user clicks project row on dashboard — Ledger Drawer does not open (HR has no dashboard access)
- E2E-N2: Ledger API returns error → Drawer shows inline error message, no crash

## Tasks / Subtasks

- [x] Task 1: LedgerDrawer component (AC: 1, 2, 7, 8)
  - [x] 1.1 Create `components/LedgerDrawer/LedgerDrawer.tsx`
  - [x] 1.2 antd `Drawer` — right side, 480px width, project name + period in title
  - [x] 1.3 `useQuery(['ledger', projectId, period])` with `staleTime: 5 * 60 * 1000`
  - [x] 1.4 Mobile responsive: < 768px → width = '100%'
  - [x] 1.5 Close on Escape/backdrop — cache stays warm
  - [x] 1.6 Create `components/LedgerDrawer/index.ts` barrel export

- [x] Task 2: KPI tiles section (AC: 2)
  - [x] 2.1 Revenue, Cost, Profit, Margin % tiles at top of drawer
  - [x] 2.2 All monetary via `formatCurrency()`, margin via `formatPercent()`
  - [x] 2.3 Loss: profit tile with red text

- [x] Task 3: Cost breakdown section — model-aware (AC: 3, 3a, 5)
  - [x] 3.1 Check `engagement_model` + `infra_cost_mode` from API response to determine layout
  - [x] 3.2 **Employee table** (T&M / FC / AMC / Infra DETAILED): antd `Table` (`size="small"`) — Employee Name, Designation, Hours, Cost/Hour, Contribution
  - [x] 3.3 **Infra DETAILED**: Show "Vendor Cost (₹)" line item above the employee table
  - [x] 3.4 **Cost summary card** (Infra SIMPLE): Two line items — "Vendor Cost (₹)" and "Manpower Cost (₹)" — no employee table
  - [x] 3.5 Monetary cells: `font-feature-settings: 'tnum'` for tabular numerals
  - [x] 3.6 Loss project with employee table: largest contributor row background `#FFF2F0`
  - [x] 3.7 Loss project with cost card (Infra SIMPLE): red border on card

- [x] Task 4: Derived figure tooltips (AC: 4)
  - [x] 4.1 Identify derived figures (e.g., Cost/Hour, Margin %)
  - [x] 4.2 Dotted underline style: `border-bottom: 1px dotted`
  - [x] 4.3 antd `Tooltip` with formula text on hover

- [x] Task 5: Metadata footer (AC: 6)
  - [x] 5.1 Footer: "Calculated: [relative timestamp] · Engine v[version]"
  - [x] 5.2 Use relative time formatting (e.g., "2 hours ago")

- [x] Task 6: API integration (AC: 2)
  - [x] 6.1 Add to `services/ledger.api.ts` — `getProjectLedger(projectId, period)`
  - [x] 6.2 TanStack Query key: `ledgerKeys.detail(projectId, period)`
  - [x] 6.3 `staleTime: 5 * 60 * 1000` (5 min cache)

- [x] Task 7: Dashboard integration (AC: 1)
  - [x] 7.1 Add `LedgerDrawer` to `ProjectDashboard.tsx`
  - [x] 7.2 `useState` for selected project + drawer open state
  - [x] 7.3 Row click → open drawer with project ID

- [x] Task 8: Tests (AC: 9)
  - [x] 8.1 Create `components/LedgerDrawer/LedgerDrawer.test.tsx`
  - [x] 8.2 Test: Drawer opens on project row click
  - [x] 8.3 Test: API called with correct project ID and period
  - [x] 8.4 Test: Dotted underline on derived figures
  - [x] 8.5 Test: Loss-row background (#FFF2F0) on largest contributor
  - [x] 8.6 Test: Metadata footer shows engine version + timestamp
  - [x] 8.7 Test: Mobile width override (< 768px → 100%)
  - [x] 8.8 Test: Escape/backdrop closes drawer
  - [x] 8.9 Test: Infra SIMPLE renders cost summary card (no employee table)
  - [x] 8.10 Test: Infra DETAILED renders vendor cost line + employee table
  - [x] 8.11 Test: Infra SIMPLE loss project shows red border on cost card

- [x] Task 9: E2E Tests (E2E-P1 through E2E-N2)
  - [x] 9.1 Create `packages/e2e/tests/ledger-drawer.spec.ts`
  - [x] 9.2 Seed data: ensure calculation_snapshots with breakdown_json containing employee inputs exist in `seed.ts`
  - [x] 9.3 Implement E2E-P1 through E2E-P6 + E2E-P2a, E2E-P2b (positive scenarios including Infra SIMPLE/DETAILED)
  - [x] 9.4 Implement E2E-N1 through E2E-N2 (negative scenarios)
  - [x] 9.5 All existing + new E2E tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Drawer state in parent**: `useState` in `ProjectDashboard.tsx` — no global state, no Redux, no context.
2. **TanStack Query for data**: `useQuery(['ledger', projectId, period])` with `staleTime: 5 * 60 * 1000`. Never recalculates — reads snapshot only.
3. **No inline styles for tabular numerals**: Use CSS class with `font-feature-settings: 'tnum'`.
4. **Currency formatting in frontend**: API returns paise. `formatCurrency()` in rendering.
5. **Loss-row convention**: `#FFF2F0` background — same convention used across all dashboards.
6. **480px desktop, 100% mobile**: antd `Drawer` `width` prop — use `window.innerWidth < 768 ? '100%' : 480`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Ledger API endpoint | `routes/ledger.routes.ts` | Story 6.3 — backend exists |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |
| ProjectDashboard | `pages/dashboards/ProjectDashboard.tsx` | Story 6.1 — add drawer trigger |
| MarginHealthBadge | `components/MarginHealthBadge.tsx` | Story 6.1 — may reuse in drawer |

### New Dependencies Required

None — antd Drawer, Tooltip, Table already available.

### Project Structure Notes

New files:
```
packages/frontend/src/
├── components/LedgerDrawer/
│   ├── LedgerDrawer.tsx
│   ├── LedgerDrawer.test.tsx
│   └── index.ts
├── services/
│   └── ledger.api.ts
```

Existing files to modify:
```
packages/frontend/src/pages/dashboards/ProjectDashboard.tsx  # Add drawer trigger
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Ledger Drawer, Frontend Loading State Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR35]

### Previous Story Intelligence

- **From 6.3:** `GET /api/v1/reports/projects/:id/ledger?period=YYYY-MM` returns `breakdown_json` with **model-aware** shape. Response includes `engagement_model` and optional `infra_cost_mode` — frontend switches layout based on these fields. See 6.3 for full response patterns.
- **From 6.1:** `ProjectDashboard.tsx` renders the project table. Add onClick to rows to open the Ledger Drawer.
- **From 4.5:** `breakdown_json` is model-aware: T&M/FC/AMC/Infra DETAILED have `employees: [{ employeeId, employeeName, designation, hours, cost_per_hour_paise, contribution_paise }]`; Infra DETAILED also has `vendor_cost_paise`; Infra SIMPLE has `vendor_cost_paise` + `manpower_cost_paise` with no employees array.
- **From 4.0:** `infraCostMode` column on Project model persists `'SIMPLE' | 'DETAILED'` — flows through snapshot → ledger API → UI.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- antd v6 deprecation: `width` prop on Drawer deprecated, migrated to `styles.wrapper.width`
- antd v6 deprecation: `valueStyle` prop on Statistic deprecated, migrated to `styles.content`
- jsdom converts hex colors to rgb() in style assertions — adjusted test to compare `rgb(224, 90, 75)` instead of `#E05A4B`

### Completion Notes List
- Task 6: Created `ledger.api.ts` with typed LedgerData union (3 variants), query keys, and API function
- Tasks 1-5: Built LedgerDrawer component with shell, KPI tiles, model-aware cost breakdown (type guards for Infra SIMPLE/DETAILED), DerivedFigure tooltips, metadata footer, responsive width, and 5-min query cache
- Task 7: Integrated LedgerDrawer into ProjectDashboard via `onRow` click handler and `useState` for selected project
- Task 8: Created 11 unit tests — all pass (241 total frontend tests, 0 regressions)
- Task 9: Enriched E2E seed with employee data in breakdownJson, added Infra SIMPLE and Infra DETAILED projects, created 10 E2E test scenarios

### File List
**New files:**
- `packages/frontend/src/services/ledger.api.ts`
- `packages/frontend/src/components/LedgerDrawer/LedgerDrawer.tsx`
- `packages/frontend/src/components/LedgerDrawer/LedgerDrawer.test.tsx`
- `packages/frontend/src/components/LedgerDrawer/index.ts`
- `packages/e2e/tests/ledger-drawer.spec.ts`

**Modified files:**
- `packages/frontend/src/pages/dashboards/ProjectDashboard.tsx`
- `packages/e2e/seed.ts`

### Change Log
- 2026-03-04: Implemented Story 6.4 — Ledger Drawer UI Component. Added right-side drawer to Project Dashboard with model-aware cost breakdown, KPI tiles, derived figure tooltips, loss highlighting, metadata footer, and responsive mobile support. 11 unit tests + 10 E2E test scenarios.
- 2026-03-04: Code review completed. Fixed: H1/H2 (unit test silent-pass guards removed), M1 (resize debounce added), M3 (CostBreakdown unknown shape warning). Accepted: H3 (generic formula — API doesn't provide CTC), H4 (mixed naming — 6.3 contract), M2 (duplicate CSS — defensive), M4/L1-L3 (low impact). All 242 tests pass.

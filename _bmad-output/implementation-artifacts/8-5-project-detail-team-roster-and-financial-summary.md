# Story 8.5: Project Detail View — Team Roster & Financial Summary

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Delivery Manager or Finance user,
I want the project detail page to show the complete team roster with resolved role names and a financial summary so that I can see who is on the project, at what cost, and how the project is performing — all in one view.

## Acceptance Criteria (AC)

1. **Given** the project detail API `GET /api/v1/projects/:id`,
   **When** the response is returned,
   **Then** it includes a `financials` object: `{ revenuePaise: number | null, costPaise: number | null, profitPaise: number | null, marginPercent: number | null }` sourced from the latest `calculation_snapshots` for that project (entity_type='PROJECT', latest by `calculated_at`). Returns `null` values if no snapshots exist for this project.

2. **Given** the project detail API `GET /api/v1/projects/:id/team-members`,
   **When** the response is returned,
   **Then** each team member object includes: `employeeId`, `name`, `designation`, `roleName` (resolved from `ProjectRole.name` via `roleId` join), `billingRatePaise` (number | null), `assignedAt` (ISO string).

3. **Given** the project detail page renders,
   **When** the financial summary section loads,
   **Then** it displays a row of 4 antd `Statistic` cards: "Revenue" (`formatCurrency(revenuePaise)`), "Cost" (`formatCurrency(costPaise)`), "Profit" (`formatCurrency(profitPaise)`), "Margin" (`formatPercent(marginPercent)` + `MarginHealthBadge`). All values formatted via shared utilities — never raw paise in UI.

4. **Given** the project has no calculation snapshots,
   **When** the financial summary renders,
   **Then** it displays a placeholder: "No financial data yet — upload timesheet and billing data to generate profitability calculations."

5. **Given** the project detail page renders,
   **When** the team roster section loads,
   **Then** it displays an antd `Table` with columns: Employee Name, Designation, Role, Selling Rate (₹/hr), Joined Date; sorted by `assignedAt` ascending. Selling Rate column displays `formatCurrency(billingRatePaise)` or "—" if null.

6. **Given** a Delivery Manager or Admin viewing an ACTIVE project's team roster,
   **When** the "Add Team Member" button is visible and clicked,
   **Then** the unified team member assignment modal (from Story 8.3) opens. On successful save, the roster table refreshes via `queryClient.invalidateQueries({ queryKey: projectKeys.teamMembers(projectId) })`.

7. **Given** a Delivery Manager or Admin viewing the team roster,
   **When** the [✕] remove button is clicked on a member row,
   **Then** an antd `Popconfirm` appears: "Remove {name} from this project?". On confirm, `DELETE /api/v1/projects/:id/team-members/:employeeId` is called and the table refreshes. On cancel, nothing happens.

8. **Given** a Finance or Dept Head user viewing the project detail,
   **When** the page renders,
   **Then** the team roster and financial summary are visible (read-only — no Add/Remove buttons), consistent with existing RBAC patterns.

9. **Given** `project-detail-enhanced.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: financial summary renders 4 cards with formatted values, MarginHealthBadge shows correct color, "No financial data yet" empty state, team roster renders with role names and selling rates, "—" for null selling rate, Add Team Member button visible for DM/Admin on ACTIVE, hidden for Finance/DH, remove member popconfirm flow.

## E2E Test Scenarios

### Positive

- E2E-P1: DM navigates to their ACTIVE project detail → financial summary shows Revenue, Cost, Profit, Margin cards with formatted values and MarginHealthBadge (AC: 1, 3)
- E2E-P2: DM views team roster → table shows members with resolved Role names (not UUIDs), Selling Rate formatted as currency, Joined Date (AC: 2, 5)
- E2E-P3: DM clicks Add Team Member → modal opens with employee search + role dropdown + selling rate → saves → new member appears in roster immediately (AC: 6)
- E2E-P4: DM clicks remove on a team member → popconfirm appears → confirms → member removed from roster (AC: 7)
- E2E-P5: Finance user views project detail → financial summary and roster visible, no Add/Remove buttons (AC: 8)

### Negative

- E2E-N1: Project with no calculation snapshots → "No financial data yet" message in financial summary section, roster still visible (AC: 4)
- E2E-N2: DM views PENDING_APPROVAL project → Add Team Member button is hidden (project not ACTIVE) (AC: 6)

## Tasks / Subtasks

- [x] Task 1: Backend — project financials in detail response (AC: 1)
  - [x] 1.1 Update `getById` in `project.service.ts` to query latest `calculation_snapshots` WHERE `entity_type = 'PROJECT'` AND `entity_id = projectId`
  - [x] 1.2 Extract `REVENUE_CONTRIBUTION`, `EMPLOYEE_COST`, `MARGIN_PERCENT` figures
  - [x] 1.3 Return `financials: { revenuePaise, costPaise, profitPaise, marginPercent }` or `financials: null`
  - [x] 1.4 `profitPaise = revenuePaise - costPaise` (derived, not stored separately — or use snapshot if stored)
  - [x] 1.5 Serialize BigInt to Number in response

- [x] Task 2: Backend — team members with resolved role name (AC: 2)
  - [x] 2.1 Update `getTeamMembers` in `project.service.ts` to join `EmployeeProject → ProjectRole` — already done in Story 8.1
  - [x] 2.2 Return `roleName: projectRole.name` instead of `role: string` — already done in Story 8.1
  - [x] 2.3 Update response type in `projects.api.ts` frontend — `TeamMember.roleName` — already done in Story 8.1

- [x] Task 3: Financial summary component (AC: 3, 4)
  - [x] 3.1 Create `components/ProjectFinancialSummary.tsx`
  - [x] 3.2 4 antd `Statistic` cards in a `Row`/`Col` layout: Revenue, Cost, Profit, Margin
  - [x] 3.3 Margin card includes `MarginHealthBadge` component
  - [x] 3.4 All values formatted via `formatCurrency()` / `formatPercent()`
  - [x] 3.5 Empty state: "No financial data yet..." message when `financials` is null

- [x] Task 4: Enhanced team roster table (AC: 5, 6, 7, 8)
  - [x] 4.1 Update team roster table in `ProjectDetail.tsx`
  - [x] 4.2 Columns: Employee Name, Designation, Role (from `roleName`), Selling Rate (₹/hr), Joined Date
  - [x] 4.3 Selling Rate: `formatCurrency(billingRatePaise)` or "—" if null — already done in Story 8.4
  - [x] 4.4 Add Team Member button: visible only for DM/Admin on ACTIVE projects — already done in Story 3.4
  - [x] 4.5 Remove button: `Popconfirm` with name, DM/Admin only — already done in Story 3.4
  - [x] 4.6 Finance/DH: read-only view — no action buttons — already done in Story 3.4

- [x] Task 5: Integration in ProjectDetail page (AC: 3, 5)
  - [x] 5.1 Add `<ProjectFinancialSummary />` above team roster in `ProjectDetail.tsx`
  - [x] 5.2 Pass `financials` from project detail API response
  - [x] 5.3 Query team members with resolved role names — already done via existing getTeamMembers query

- [x] Task 6: Frontend tests (AC: 9)
  - [x] 6.1 Create `pages/projects/project-detail-enhanced.test.tsx`
  - [x] 6.2 Tests: financial summary 4 cards, MarginHealthBadge color, empty state, roster with role names, selling rate formatting, "—" for null, Add button visibility by role/status, remove popconfirm flow

- [x] Task 7: E2E Tests (E2E-P1 through E2E-N2)
  - [x] 7.1 Create `packages/e2e/tests/project-detail-enhanced.spec.ts`
  - [x] 7.2 Seed: project with calculation snapshots and team members with varied selling rates
  - [x] 7.3 Implement E2E-P1 through E2E-P5
  - [x] 7.4 Implement E2E-N1 and E2E-N2

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Read from snapshots**: Financial summary reads from `calculation_snapshots` — NEVER re-runs the calculation engine at query time. Same pattern as dashboard (Story 6.1).
2. **Latest snapshot**: Query latest by `calculated_at DESC` with `DISTINCT ON (entity_id, figure_type)` or equivalent Prisma pattern (orderBy + take). Same deduplication logic used in `dashboard.service.ts`.
3. **Currency formatting in frontend only**: API returns paise; frontend calls `formatCurrency()`. No rupee formatting server-side.
4. **Role resolution**: Join through `ProjectRole` table to get `name`. The `roleId` FK is on `EmployeeProject` (set in Story 8.1). Return `roleName` in API response.
5. **RBAC on buttons, not data**: All authorized roles see the same data (roster + financials). Add/Remove buttons are conditionally rendered based on role + project status. Server-side RBAC prevents unauthorized mutations regardless.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| ProjectDetail.tsx | `pages/projects/ProjectDetail.tsx` | Story 3.4 — extend with financials + enhanced roster |
| MarginHealthBadge | `components/MarginHealthBadge.tsx` | Story 6.1 — reuse on margin card |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |
| projectKeys.detail | `services/projects.api.ts` | Query key for project detail |
| projectKeys.teamMembers | `services/projects.api.ts` | Query key for team members |
| Dashboard snapshot query | `services/dashboard.service.ts` | Reuse query pattern for latest snapshots |
| Popconfirm pattern | `ProjectDetail.tsx` | Already used for remove member (if exists) |
| AddTeamMemberModal | `components/AddTeamMemberModal.tsx` | Refactored in Story 8.3 |

### Project Structure Notes

New files:
```
packages/frontend/src/
├── components/
│   └── ProjectFinancialSummary.tsx
├── pages/projects/
│   └── project-detail-enhanced.test.tsx

packages/e2e/tests/
└── project-detail-enhanced.spec.ts
```

Modified files:
```
packages/backend/src/services/project.service.ts (getById with financials, getTeamMembers with roleName)
packages/frontend/src/pages/projects/ProjectDetail.tsx (financial summary + enhanced roster)
packages/frontend/src/services/projects.api.ts (updated types)
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR55]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.5]

### Previous Story Intelligence

- **From 3.4:** `ProjectDetail.tsx` shows project metadata + team roster table. The roster currently shows Name, Designation, Role (string), Billing Rate, Actions. This story enhances with resolved role name, "Selling Rate" label, and adds the financial summary section.
- **From 6.1:** `dashboard.service.ts` queries `calculation_snapshots` with deduplication by `calculatedAt DESC`. Reuse this pattern in `project.service.ts` for the financial summary.
- **From 8.1:** `getTeamMembers` is updated to join through `ProjectRole` and return `roleName`.
- **From 8.3:** `AddTeamMemberModal` is refactored to use `TeamMemberRow` component.
- **From 8.4:** "Billing Rate" label is renamed to "Selling Rate" in all UI touchpoints.

### Gotchas & Go/No-Go

- **No snapshot for new projects**: Projects that are newly approved and have no timesheet/billing data yet won't have calculation snapshots. The financial summary must show the empty state gracefully.
- **Profit calculation**: `profitPaise = revenuePaise - costPaise`. This can be derived from the snapshot values, or there might be a PROFIT figure type stored. Check which figure types are persisted per project in `snapshot.service.ts` (MARGIN_PERCENT, EMPLOYEE_COST, REVENUE_CONTRIBUTION — profit is derived).
- **BigInt serialization**: Prisma returns `BigInt` for `valuePaise`. Serialize to `Number` in the service layer (existing pattern from `serializeProject`).

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend test fix: UploadEvent status enum was `COMPLETED` → corrected to `SUCCESS` (Prisma enum `UploadStatus`)

### Completion Notes List
- Task 1: Added snapshot query to `getById()` in project.service.ts. Queries MARGIN_PERCENT, EMPLOYEE_COST, REVENUE_CONTRIBUTION with `calculatedAt DESC` deduplication. Returns `financials` object or null. 4 new backend tests pass.
- Task 2: Already complete from Story 8.1. Verified `getTeamMembers` already joins ProjectRole and returns `roleName`.
- Task 3: Created `ProjectFinancialSummary.tsx` — 4 antd Statistic cards with MarginHealthBadge and empty state. 8 component tests pass.
- Task 4: Added "Joined Date" column to team roster table using `assignedAt.slice(0, 10)`. Other columns (Role, Selling Rate, Add/Remove RBAC) already existed from Stories 8.1/8.3/8.4.
- Task 5: Added `ProjectFinancials` interface and `financials` field to `Project` type in `projects.api.ts`. Integrated `<ProjectFinancialSummary>` into `ProjectDetail.tsx`.
- Task 6: Created `project-detail-enhanced.test.tsx` with 7 tests covering financial summary, empty state, Joined Date column, role names, selling rate, and RBAC.
- Task 7: Created `project-detail-enhanced.spec.ts` with E2E-P1 through E2E-P5 and E2E-N1/N2. Added REVENUE_CONTRIBUTION and EMPLOYEE_COST seed snapshots for activeTmProject.

### Change Log
- 2026-03-05: Story 8.5 implementation complete — financial summary + enhanced team roster

### File List
- packages/backend/src/services/project.service.ts (modified — getById with financials)
- packages/backend/src/services/project.service.test.ts (modified — 4 new financials tests)
- packages/frontend/src/components/ProjectFinancialSummary.tsx (new)
- packages/frontend/src/components/project-financial-summary.test.tsx (new)
- packages/frontend/src/pages/projects/ProjectDetail.tsx (modified — financial summary + Joined Date column)
- packages/frontend/src/pages/projects/ProjectDetail.test.tsx (modified — updated test fixtures with financials + roleName)
- packages/frontend/src/pages/projects/project-detail-enhanced.test.tsx (new)
- packages/frontend/src/services/projects.api.ts (modified — ProjectFinancials type)
- packages/e2e/tests/project-detail-enhanced.spec.ts (new)
- packages/e2e/seed.ts (modified — REVENUE_CONTRIBUTION and EMPLOYEE_COST snapshots for activeTmProject)
- packages/frontend/src/pages/employees/EmployeeList.test.tsx (fixed — queryClient.clear() in afterEach to prevent teardown errors)

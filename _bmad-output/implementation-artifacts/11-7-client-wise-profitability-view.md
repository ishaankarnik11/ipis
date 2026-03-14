# Story 11.7: Client-wise Profitability View

Status: backlog

## Story

As a Finance user,
I want to view a Client Dashboard showing total revenue, cost, profit, margin %, and project count grouped by client,
so that I can identify which clients are most profitable and surface this information for leadership reporting.

## Primary Persona

Priya (Finance) — Priya needs to answer the CFO's question: "Which clients are most profitable?" Currently there is no way to see profitability grouped by client — only by project, department, or employee.

## Persona Co-Authorship Review

### Priya (Finance) — PASS
> "The CFO wants to know which clients are most profitable. Where do I find that? Right now I can see project-level profitability but I can't see it rolled up by client. We have 3 projects for Client X and 2 for Client Y — I need to see the totals per client. Show me: Client Name, Total Revenue, Total Cost, Profit, Margin %, Number of Active Projects, and a health badge. This should be a new view or a tab on the Executive Dashboard."

### Vikram (Delivery Manager) — PASS with notes
> "Client-level profitability helps me understand which client relationships are worth investing in. If Client X has 3 projects and all are profitable, that's a relationship to nurture. If Client Y's projects are all at risk, that's a conversation to have."

### Rajesh (Admin) — ADVISORY
> "We need this for strategic planning. Client profitability drives which engagements we pursue next year."

## Acceptance Criteria (AC)

1. **Given** a new Client Dashboard page (or a "By Client" tab on the Executive Dashboard),
   **When** it renders,
   **Then** it shows an antd `Table` with columns: Client Name, Total Revenue (₹), Total Cost (₹), Profit (₹), Margin %, Active Projects (count), Health Badge.

2. **Given** the client profitability data,
   **When** computed,
   **Then** projects are grouped by client name (from `project.client` field), and Revenue/Cost are summed across all projects for each client from PROJECT snapshots.

3. **Given** the Margin % column,
   **When** rendered,
   **Then** a `MarginHealthBadge` shows the margin health: Healthy (>= healthyMarginThreshold), At Risk (>= atRiskMarginThreshold), Loss (< atRiskMarginThreshold) — using thresholds from `system_config`.

4. **Given** `GET /api/v1/reports/clients`,
   **When** called by Finance or Admin,
   **Then** it returns aggregated client profitability data: `clientName`, `totalRevenuePaise`, `totalCostPaise`, `profitPaise`, `marginPercent`, `activeProjectCount`.

5. **Given** a client row in the table,
   **When** clicked,
   **Then** it expands or navigates to show the individual projects for that client with per-project Revenue, Cost, and Margin %.

6. **Given** RBAC,
   **When** a DM or DH tries to access the Client Dashboard,
   **Then** they see only clients associated with their projects/department, or the page is restricted to Finance and Admin only.

7. **Given** a client with no active projects (all projects completed or cancelled),
   **When** the dashboard renders,
   **Then** the client is excluded from the active view (or shown in a separate "Historical" section).

8. **Given** `client-profitability.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: client aggregation from project snapshots, margin health badge thresholds, RBAC (Finance/Admin only), click-through to project list, empty client handling.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Client profitability is a brand-new dashboard page — more surface area than extending an existing view. Priority one: the page renders with correct aggregation (projects grouped by client). Priority two: the numbers match — if I sum the projects for Client X on the Project Dashboard, it should match the Client Dashboard row. Priority three: drill-through from client to projects works. RBAC is important since this is sensitive financial data. The client name inconsistency gotcha (case sensitivity) needs explicit testing.

### Persona Test Consultation

**Priya (Finance):** "Quinn, this is the feature I've been asking for since day one. The CFO's #1 question is 'Which clients make us money?' I need the totals to be exact — if Client X has 3 projects, the Revenue on the Client Dashboard must equal the sum of those 3 projects' Revenue on the Project Dashboard. Test that with real multi-project clients. Also, test what happens with the client name 'Acme Corp' vs 'ACME Corp' vs 'acme corp' — those should all be the same client, not three separate rows."

**Quinn's response:** "Sum validation across dashboards is test #1 — cross-page consistency is non-negotiable. On the client name case sensitivity: I'll seed test data with mixed-case client names and verify they're grouped correctly. If the backend does case-sensitive grouping, that's a bug I'll catch."

**Vikram (DM):** "I manage projects for multiple clients. When I click a client row, I want to see MY projects for that client, not all projects. Or at least make it clear which projects are mine. Otherwise I'm looking at data I can't act on."

**Quinn's response:** "The AC says DMs see only clients associated with their projects. I'll test that a DM viewing the Client Dashboard sees a scoped view — only clients with projects they manage. And the drill-through should show only their projects for that client."

**Rajesh (Admin):** "Test the empty state — what if we haven't entered any clients yet? And what about the 'Internal' projects that don't have a client? Those shouldn't pollute the Client Dashboard."

**Quinn's response:** "Two good edge cases. I'll test projects with null or empty client field — they should be excluded from the Client Dashboard, not show up as a blank row. And the zero-clients empty state needs a proper message."

### Persona Journey Test Files
```
tests/journeys/
  priya-prepare-client-profitability-for-cfo.spec.ts
  priya-investigate-low-margin-client.spec.ts
  vikram-review-client-relationship-health.spec.ts
  rajesh-strategic-client-portfolio-review.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Priya logs in → navigates to Client Dashboard → sees table with Client Name, Revenue, Cost, Profit, Margin %, Active Projects, Health Badge (AC: 1)
- E2E-P2: Client with 3 projects → Revenue/Cost/Profit are sums across all 3 projects (AC: 2)
- E2E-P3: Client with healthy margin → green MarginHealthBadge (AC: 3)
- E2E-P4: Client with loss margin → red MarginHealthBadge (AC: 3)
- E2E-P5: Click client row → shows individual projects for that client (AC: 5)
- E2E-P6: Admin views Client Dashboard → sees all clients (AC: 6)

### Negative

- E2E-N1: DM user navigates to Client Dashboard → access denied or scoped view (AC: 6)
- E2E-N2: Client with no active projects → not shown in active view (AC: 7)
- E2E-N3: No clients in system → empty state message shown

## Tasks / Subtasks

- [ ] Task 1: Client profitability API (AC: 4)
  - [ ] 1.1 Add `GET /api/v1/reports/clients` to `dashboards.routes.ts` — `rbacMiddleware(['FINANCE', 'ADMIN'])`
  - [ ] 1.2 `dashboard.service.getClientDashboard()` — group PROJECT snapshots by `project.client`
  - [ ] 1.3 Aggregate: SUM revenue, SUM cost, compute profit and margin % per client
  - [ ] 1.4 Count active projects per client
  - [ ] 1.5 Fetch margin thresholds from `system_config` for health badge

- [ ] Task 2: Client detail API (AC: 5)
  - [ ] 2.1 Add `GET /api/v1/reports/clients/:name/projects` to `dashboards.routes.ts`
  - [ ] 2.2 Return individual projects for the client with per-project metrics

- [ ] Task 3: Client Dashboard page (AC: 1, 3)
  - [ ] 3.1 Create `pages/dashboards/ClientDashboard.tsx`
  - [ ] 3.2 antd `Table` — Client Name, Total Revenue, Total Cost, Profit, Margin %, Active Projects, Health Badge
  - [ ] 3.3 Monetary columns right-aligned with `tabular-nums`
  - [ ] 3.4 `MarginHealthBadge` in Margin % column

- [ ] Task 4: Client drill-through (AC: 5)
  - [ ] 4.1 Click client row → expand with nested table showing projects
  - [ ] 4.2 Or navigate to filtered Project Dashboard (whichever is more consistent with existing patterns)

- [ ] Task 5: Navigation + routing
  - [ ] 5.1 Add `/dashboards/clients` route — guarded for Finance, Admin
  - [ ] 5.2 Add "Client Dashboard" sidebar navigation item
  - [ ] 5.3 Or add "By Client" tab to Executive Dashboard page

- [ ] Task 6: API service + query keys
  - [ ] 6.1 Add to `services/dashboards.api.ts` — client list + client projects
  - [ ] 6.2 TanStack Query keys: `reportKeys.clients`, `reportKeys.clientProjects(name)`

- [ ] Task 7: Backend tests (AC: 8)
  - [ ] 7.1 Test: client aggregation sums project revenue/cost correctly
  - [ ] 7.2 Test: margin health badge uses system_config thresholds
  - [ ] 7.3 Test: RBAC — Finance/Admin can access, others get 403
  - [ ] 7.4 Test: client with no active projects excluded

- [ ] Task 8: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 8.1 Create `packages/e2e/tests/client-dashboard.spec.ts`
  - [ ] 8.2 Seed: multiple clients with multiple projects at varying profitability
  - [ ] 8.3 Implement E2E-P1 through E2E-P6
  - [ ] 8.4 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Client from project metadata**: The `project` table has a `client` field (string). Group by this field. There is no separate `clients` table.
2. **Revenue/Cost from PROJECT snapshots**: `calculation_snapshots` WHERE `entity_type = 'PROJECT'`, grouped by `project.client`. Sum across all figure types.
3. **Margin thresholds from system_config**: `healthyMarginThreshold` and `atRiskMarginThreshold` from `system_config` table. Same thresholds used by `MarginHealthBadge`.
4. **No chart library**: Use antd components only. No recharts/chart.js.
5. **Currency in paise**: All monetary values in BigInt paise. Frontend formats with `formatCurrency()`.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| dashboard.service.ts | `packages/backend/src/services/dashboard.service.ts` | Story 6.1/6.2 — extend with client dashboard |
| dashboards.routes.ts | `packages/backend/src/routes/dashboards.routes.ts` | Extend with client endpoints |
| MarginHealthBadge | `packages/frontend/src/components/MarginHealthBadge.tsx` | Story 6.1 |
| dashboards.api.ts | `packages/frontend/src/services/dashboards.api.ts` | Extend |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| formatPercent | `shared/utils/percent.ts` | Story 1.1 |
| navigation.ts | `packages/frontend/src/config/navigation.ts` | Add sidebar item |

### Gotchas

- **Client name inconsistency**: The `project.client` field is a free-text string. "Acme Corp" and "ACME Corp" would be treated as different clients. Consider case-insensitive grouping or trimming.
- **No client entity**: Unlike departments and employees, there is no `client` table. Grouping is purely by string match on `project.client`. If a client entity is added later, this will need migration.
- **Historical vs active**: "Active projects" should filter by project status (e.g., `status = 'APPROVED'` or not cancelled). Define what "active" means clearly.

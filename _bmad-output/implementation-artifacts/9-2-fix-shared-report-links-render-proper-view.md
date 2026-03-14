# Story 9.2: Fix Shared Report Links — Render Proper View

Status: backlog

## Story

As a Finance user or Department Head,
I want shared dashboard links to render a formatted, professional report view so that stakeholders who receive the link see clean KPI tiles, tables, and charts — not raw JSON.

## Primary Persona

Priya (Finance) — Priya shares dashboard links with the CFO. A raw JSON dump is unacceptable for executive stakeholders and undermines trust in the system.

## Persona Co-Authorship Review

### Priya (Finance) — FAIL (blocking)
> "I shared a link and the CFO saw raw JSON. That's embarrassing. This is a P0 for me. If I can't share professional-looking reports, I'll go back to Excel screenshots. The share link must render the same dashboard view — KPI tiles, margin badges, the works — just read-only."

### Arjun (Dept Head) — FAIL (blocking)
> "Share link shows JSON instead of the actual dashboard. I need to share my department's performance with the executive team. JSON is not a report. It should look like the dashboard I see when I'm logged in, minus the sidebar and navigation."

### Rajesh (Admin) — ADVISORY
> "If we're sharing data externally via links, make sure the link expires and doesn't leak sensitive data. But the immediate fix is rendering it properly."

## Acceptance Criteria (AC)

1. **Given** a valid share token URL (`/share/:token`),
   **When** any user (authenticated or not) opens the link in a browser,
   **Then** a formatted report page renders with KPI tiles, data tables, and charts — matching the source dashboard's visual layout. NOT raw JSON.

2. **Given** the share route in React Router,
   **When** the `/share/:token` path is accessed,
   **Then** it routes to the `ShareableReportView` component (verify the route is wired correctly in the router config).

3. **Given** the `ShareableReportView` component,
   **When** it receives dashboard data from the share API endpoint,
   **Then** it renders the data using the same visual components as the source dashboard: `KpiTile`, `MarginHealthBadge`, antd `Table`, antd `Statistic` — styled for read-only, public-facing display.

4. **Given** a share link for the Executive Dashboard,
   **When** the page renders,
   **Then** it shows: company-level KPI tiles (revenue, cost, margin, utilisation), top 5 / bottom 5 project sections, and department breakdown — matching the Executive Dashboard layout.

5. **Given** a share link for the Project Dashboard,
   **When** the page renders,
   **Then** it shows: project list table with all financial columns populated, margin health badges, and summary KPIs.

6. **Given** a share link for the Department Dashboard,
   **When** the page renders,
   **Then** it shows: department-level KPI tiles and project breakdown table.

7. **Given** an expired or invalid share token,
   **When** the user opens the link,
   **Then** a clean error page renders with a message like "This report link has expired or is invalid" — not a stack trace or blank page.

8. **Given** `shareable-report.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: component renders KPI tiles from mock data, handles expired token error, renders different dashboard types (executive, project, department), no raw JSON visible in rendered output.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is a credibility bug. Shared links go to external stakeholders — the CFO, the executive team. If they see JSON, IPIS is dead on arrival. Priority one: shared link renders a visual dashboard, not JSON. Priority two: it renders the right dashboard type (executive vs project vs department). Priority three: expired links fail gracefully. Ship the visual rendering first, iterate on polish.

### Persona Test Consultation

**Priya (Finance):** "I shared a link and the CFO saw raw JSON. That's embarrassing. I need to test this the way I actually use it: I'm on the Executive Dashboard, I click Share, I copy the link, I open it in an incognito window. What I see there must look like a professional report — KPI tiles, margin badges, tables. Not a code dump. And the numbers need to match what I saw on my dashboard."

**Quinn's response:** "I'll test the exact flow: generate share link from each dashboard type, open in a fresh browser context (no auth), and assert that KPI tiles render with actual values — not JSON text nodes. I'll also cross-check the rendered values against the dashboard API response."

**Arjun (Dept Head):** "I need to share my department's performance with the executive team. The share link should look like the dashboard I see when I'm logged in, minus the sidebar and navigation. If they see 'totalRevenuePaise: 1250000000' instead of a formatted rupee amount, that's worse than sending nothing."

**Quinn's response:** "I'll add assertions for formatted currency values (rupee symbol, commas) and verify no raw field names like 'totalRevenuePaise' appear in the rendered output. The test will scan for JSON-like patterns in the DOM."

**Rajesh (Admin):** "If we're sharing data externally via links, make sure the link expires and doesn't leak sensitive data. But the immediate fix is rendering it properly."

**Quinn's response:** "Expiry testing is in scope — I'll test expired tokens show a clean error page, not a stack trace. Data leakage is out of scope for this story but noted for a future security pass."

### Persona Journey Test Files
```
tests/journeys/
  priya-share-executive-dashboard-with-cfo.spec.ts
  arjun-share-department-report-with-leadership.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Priya on Executive Dashboard → clicks Share → copies link → opens link in incognito → sees formatted dashboard with KPI tiles and project tables (AC: 1, 4)
- E2E-P2: Arjun on Department Dashboard → clicks Share → copies link → opens link → sees formatted department report (AC: 1, 6)
- E2E-P3: Priya on Project Dashboard → clicks Share → copies link → opens link → sees formatted project table with financial columns (AC: 1, 5)

### Negative

- E2E-N1: User opens a share link with an invalid token → sees clean "link expired or invalid" error page (AC: 7)
- E2E-N2: User opens a share link after token expiry → sees clean error page, not a broken page or JSON (AC: 7)

## Tasks / Subtasks

- [ ] Task 1: Diagnose the routing issue (AC: 2)
  - [ ] 1.1 Check React Router config — is `/share/:token` wired to `ShareableReportView`?
  - [ ] 1.2 If the route is missing, add it to the router configuration
  - [ ] 1.3 Verify the share API endpoint (`GET /api/v1/share/:token`) returns structured data, not a rendered page

- [ ] Task 2: Fix or build ShareableReportView component (AC: 1, 3)
  - [ ] 2.1 Check if `ShareableReportView.tsx` exists and what it currently renders
  - [ ] 2.2 If it dumps raw JSON, replace with proper component rendering
  - [ ] 2.3 Parse the `dashboardType` from the API response to determine which layout to render
  - [ ] 2.4 Render appropriate components: KpiTile, MarginHealthBadge, antd Table/Statistic

- [ ] Task 3: Executive Dashboard share view (AC: 4)
  - [ ] 3.1 Create an `ExecutiveShareView` sub-component or reuse `ExecutiveDashboard` in read-only mode
  - [ ] 3.2 Render: company KPI tiles, top 5/bottom 5 project sections, department breakdown table

- [ ] Task 4: Project Dashboard share view (AC: 5)
  - [ ] 4.1 Render: project list table with financial columns, margin badges, summary KPIs

- [ ] Task 5: Department Dashboard share view (AC: 6)
  - [ ] 5.1 Render: department KPI tiles, project breakdown table

- [ ] Task 6: Error handling (AC: 7)
  - [ ] 6.1 Handle 404/410 from share API — render a clean error page with user-friendly message
  - [ ] 6.2 Style the error page consistently with the app's design system

- [ ] Task 7: Frontend tests (AC: 8)
  - [ ] 7.1 Create `pages/reports/shareable-report.test.tsx`
  - [ ] 7.2 Test: component renders KPI tiles from mock executive data
  - [ ] 7.3 Test: component renders project table from mock project data
  - [ ] 7.4 Test: component renders error page for expired token
  - [ ] 7.5 Test: no raw JSON visible in rendered output (assert no `<pre>` or `JSON.stringify` output)

- [ ] Task 8: E2E tests (E2E-P1 through E2E-N2)
  - [ ] 8.1 Create or extend `packages/e2e/tests/shareable-report.spec.ts`
  - [ ] 8.2 Implement E2E-P1 through E2E-P3
  - [ ] 8.3 Implement E2E-N1, E2E-N2

## Dev Notes

### Architecture Constraints

1. **No authentication required for share links**: Share links are public by design (token-authenticated). The `ShareableReportView` must NOT require login — it fetches data via the share token API.
2. **Reuse existing dashboard components**: Do NOT rebuild KPI tiles, tables, or charts from scratch. Import and reuse the same components used in the authenticated dashboard views (KpiTile, MarginHealthBadge, antd Table).
3. **Read-only layout**: The shared view should strip interactive elements (filters, share buttons, navigation links) and render a clean, printable report layout.
4. **Currency formatting in frontend**: All currency values come from the API in paise (BigInt). Use `formatCurrency` to render them as rupee amounts. Do NOT format on the backend.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| ShareableReportView | `packages/frontend/src/pages/reports/ShareableReportView.tsx` | Story 7.2 — exists but may dump JSON |
| Share service | `packages/backend/src/services/share.service.ts` | Story 7.2 — generates/validates tokens |
| Share routes | `packages/backend/src/routes/share.routes.ts` | Story 7.2 — `GET /api/v1/share/:token` |
| KpiTile | `packages/frontend/src/components/` | Reuse for KPI rendering |
| MarginHealthBadge | `packages/frontend/src/components/` | Reuse for margin indicators |
| formatCurrency | `packages/frontend/src/utils/` | Currency formatting from paise |
| formatPercent | `packages/frontend/src/utils/` | Percentage formatting |
| ExecutiveDashboard | `packages/frontend/src/pages/dashboards/ExecutiveDashboard.tsx` | Reference for layout/components |

### Gotchas

- **The component may already exist but render JSON**: The most likely issue is that `ShareableReportView.tsx` does `JSON.stringify(data)` instead of using proper components. Check the component's render method first.
- **Route wiring**: The route `/share/:token` may not be in the React Router config, or it may be wired to a different component. Check `App.tsx` or the router configuration.
- **Dashboard type discrimination**: The share API response must include a `type` field (e.g., "executive", "project", "department") so the frontend knows which layout to render. If this field is missing, the backend needs a small update.
- **Backlog item B2**: This is a P0 bug — shared links showing raw JSON is a credibility issue for external stakeholders.

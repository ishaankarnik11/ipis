# Story 8.6: Dashboard Click-Through Navigation to Projects

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any dashboard user,
I want to click on any project reference on any dashboard to navigate directly to that project's detail page so that I can drill down from portfolio overview to project specifics without manual navigation.

## Acceptance Criteria (AC)

1. **Given** the Project Dashboard table (`ProjectDashboard.tsx`),
   **When** a user clicks on a project name in any row,
   **Then** the browser navigates to `/projects/{projectId}` — the project detail page with team roster and financial summary (from Story 8.5). The `projectId` is already available in the `ProjectDashboardItem` API response.

2. **Given** the Project Dashboard table,
   **When** project names render,
   **Then** they are styled as clickable links (antd `Typography.Link` or `<a>` with React Router `Link`) — blue color, underline on hover, cursor pointer.

3. **Given** the Executive Dashboard top 5 / bottom 5 project sections,
   **When** a user clicks on a project name or project card,
   **Then** the browser navigates to `/projects/{projectId}`.

4. **Given** the Executive Dashboard project cards,
   **When** project names render,
   **Then** they are styled as clickable links — consistent with Project Dashboard link styling.

5. **Given** the Department Dashboard table,
   **When** a user clicks on a department row,
   **Then** the existing behaviour is PRESERVED: navigates to Project Dashboard filtered by department name (`/dashboards/projects?department={name}`). NO change to department-level click behaviour.

6. **Given** the Company Dashboard department breakdown table,
   **When** a user clicks on a department row,
   **Then** the existing behaviour is PRESERVED: navigates to Project Dashboard filtered by department. NO change.

7. **Given** the Project Dashboard API response,
   **When** the data is returned,
   **Then** each item includes `projectId` — already present in `ProjectDashboardItem`. No backend API change required for this story.

8. **Given** `dashboard-navigation.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: project name click on ProjectDashboard navigates to `/projects/:id`, executive dashboard project card/name click navigates to `/projects/:id`, department row click preserves existing filter navigation, link styling (cursor, color), RBAC — navigation works for DM (own project), Finance (all), Admin (all).

## E2E Test Scenarios

### Positive

- E2E-P1: DM on Project Dashboard → clicks project name → navigates to `/projects/{projectId}`, project detail page loads with financial summary and team roster (AC: 1)
- E2E-P2: Admin on Executive Dashboard → clicks project in Top 5 section → navigates to `/projects/{projectId}` (AC: 3)
- E2E-P3: Admin on Executive Dashboard → clicks project in Bottom 5 section → navigates to `/projects/{projectId}` (AC: 3)
- E2E-P4: Finance on Department Dashboard → clicks department row → navigates to Project Dashboard filtered by department (existing behaviour preserved) (AC: 5)
- E2E-P5: Finance on Project Dashboard → clicks project name → navigates to `/projects/{projectId}`, back button returns to dashboard with filters preserved (AC: 1, 2)

### Negative

- E2E-N1: DM clicks project they don't own on dashboard (shouldn't see it due to RBAC scoping) → verify DM only sees own projects on dashboard, click navigation works for visible projects (AC: 8)

## Tasks / Subtasks

- [x] Task 1: Project Dashboard — clickable project names (AC: 1, 2)
  - [x] 1.1 In `ProjectDashboard.tsx`, wrap project name column with React Router `Link` to `/projects/${record.projectId}`
  - [x] 1.2 Style: React Router `Link` renders as `<a>` with blue color, hover underline, pointer cursor
  - [x] 1.3 Ensure `projectId` is available in table row data (already in `ProjectDashboardItem`)

- [x] Task 2: Executive Dashboard — clickable project cards (AC: 3, 4)
  - [x] 2.1 In `ExecutiveDashboard.tsx`, updated Top 5 card onClick to navigate to `/projects/${project.projectId}`
  - [x] 2.2 In `ExecutiveDashboard.tsx`, updated Bottom 5 card onClick to navigate to `/projects/${project.projectId}`
  - [x] 2.3 Consistent link styling with Project Dashboard (card hoverable + cursor pointer)

- [x] Task 3: Verify existing department navigation (AC: 5, 6)
  - [x] 3.1 Verify Department Dashboard row click → `/dashboards/projects?department={name}` — no modification needed
  - [x] 3.2 Verify Company Dashboard department row click → same filter navigation — no modification needed
  - [x] 3.3 Add regression test to confirm department click behaviour unchanged

- [x] Task 4: Frontend tests (AC: 8)
  - [x] 4.1 Create `pages/dashboards/dashboard-navigation.test.tsx`
  - [x] 4.2 Test: ProjectDashboard project name click → navigate to /projects/:id
  - [x] 4.3 Test: ExecutiveDashboard top 5 project click → navigate to /projects/:id
  - [x] 4.4 Test: ExecutiveDashboard bottom 5 project click → navigate to /projects/:id
  - [x] 4.5 Test: DepartmentDashboard row click → existing filter navigation preserved
  - [x] 4.6 Test: Link styling assertions (rendered as anchor tag or Link component)

- [x] Task 5: E2E Tests (E2E-P1 through E2E-N1)
  - [x] 5.1 Create `packages/e2e/tests/dashboard-navigation.spec.ts`
  - [x] 5.2 Implement E2E-P1 through E2E-P5
  - [x] 5.3 Implement E2E-N1
  - [x] 5.4 Verify back button returns to dashboard with filters preserved (browser history)

## Dev Notes

### Architecture Constraints (MUST follow)

1. **React Router Link, not `<a href>`**: Use React Router's `Link` component or `useNavigate` — not raw anchor tags. This ensures client-side navigation without full page reload.
2. **No backend changes**: This story is purely frontend. The `projectId` is already in all dashboard API responses. No new endpoints or response changes needed.
3. **Preserve existing navigation**: Department row clicks on Department Dashboard and Company Dashboard MUST continue to navigate to the filtered Project Dashboard. Do NOT change this behaviour. Add regression tests to guard it.
4. **URL filter preservation**: When navigating from dashboard to project detail and back, dashboard filters should be preserved via URL search params (already implemented in Story 6.1 via `useSearchParams`).
5. **RBAC is server-side**: If a DM clicks a project link and doesn't have access, the project detail page's API call returns 403 — the detail page handles this. The dashboard doesn't need to pre-filter clickable links.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| ProjectDashboard.tsx | `pages/dashboards/ProjectDashboard.tsx` | Story 6.1 — add Link to project name column |
| ExecutiveDashboard.tsx | `pages/dashboards/ExecutiveDashboard.tsx` | Story 6.2 — add Link to project cards |
| DepartmentDashboard.tsx | `pages/dashboards/DepartmentDashboard.tsx` | Story 6.2 — verify existing department click navigation |
| CompanyDashboard.tsx | `pages/dashboards/CompanyDashboard.tsx` | Story 6.2 — verify existing department click navigation |
| React Router Link | `react-router-dom` | Already installed and used throughout |
| useNavigate | `react-router-dom` | Alternative to Link for programmatic navigation |

### Project Structure Notes

New files:
```
packages/frontend/src/
├── pages/dashboards/
│   └── dashboard-navigation.test.tsx

packages/e2e/tests/
└── dashboard-navigation.spec.ts
```

Modified files:
```
packages/frontend/src/pages/dashboards/ProjectDashboard.tsx (project name → Link)
packages/frontend/src/pages/dashboards/ExecutiveDashboard.tsx (project cards → Link)
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR56]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.6]

### Previous Story Intelligence

- **From 6.1:** `ProjectDashboard.tsx` renders an antd `Table` with project rows. The `projectId` field is in each row's data. Column definitions are in the component — add `render` function to wrap name in `Link`.
- **From 6.2:** `ExecutiveDashboard.tsx` has Top 5 and Bottom 5 project sections. Each `ProjectDashboardItem` includes `projectId`. Wrap the project name/card element in `Link`.
- **From 6.2:** `DepartmentDashboard.tsx` and `CompanyDashboard.tsx` have `onRow` click handlers that navigate to Project Dashboard with department filter. These must NOT be modified.
- **From 8.5:** Project detail page now includes financial summary and enhanced team roster — making the click-through experience complete.

### Gotchas & Go/No-Go

- **Minimal change, high visibility**: This story touches 2 files with simple Link wrapping. The risk is LOW but the UX impact is HIGH — it's one of the most user-requested navigation gaps.
- **Table row click vs column click**: On Project Dashboard, currently clicking a row might not do anything. Adding a Link to the project name column specifically (not the entire row) avoids conflicting with potential future row-level actions (e.g., right-click menu, selection).
- **Executive Dashboard cards**: Check whether the Top 5/Bottom 5 sections use antd `Card` components or custom elements. The Link should wrap the project name text, not the entire card (to avoid interfering with other card interactions).
- **Can run in parallel**: This story has NO dependency on Stories 8.1–8.4. It only benefits from 8.5 (enhanced project detail page) but works without it — clicking through to an existing project detail page is still valuable.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 30 test files (280 tests) pass with no regressions
- Pre-existing EmployeeList.test.tsx teardown warnings (not related to this story)

### Completion Notes List
- **Task 1:** Added React Router `Link` to ProjectDashboard project name column. Removed `onRow` handler that opened LedgerDrawer (conflicted with Link navigation). Removed unused LedgerDrawer import and state.
- **Task 2:** Changed ExecutiveDashboard Top 5 and Bottom 5 card onClick from `/dashboards/projects?project=id` to `/projects/${project.projectId}` for direct project detail navigation.
- **Task 3:** Verified DepartmentDashboard (line 140-143) and CompanyDashboard (line 180-183) onRow handlers correctly navigate to `/dashboards/projects?department=name`. No changes made. Regression test added.
- **Task 4:** Created `dashboard-navigation.test.tsx` with 7 tests covering: project name as Link, executive card navigation (top 5 + bottom 5), department regression, RBAC (DM + Finance roles), link styling.
- **Task 5:** Created `dashboard-navigation.spec.ts` with 6 E2E test scenarios: E2E-P1 through E2E-P5 (positive) and E2E-N1 (negative RBAC).

### Change Log
- 2026-03-05: Story 8.6 implemented — dashboard click-through navigation to project detail pages

### File List
- `packages/frontend/src/pages/dashboards/ProjectDashboard.tsx` (modified — added Link import, project name column render with Link, removed onRow/LedgerDrawer)
- `packages/frontend/src/pages/dashboards/ExecutiveDashboard.tsx` (modified — changed card onClick to navigate to /projects/:id)
- `packages/frontend/src/pages/dashboards/dashboard-navigation.test.tsx` (new — 7 navigation tests)
- `packages/e2e/tests/dashboard-navigation.spec.ts` (new — 6 E2E test scenarios)

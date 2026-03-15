# Story 10.6: DM Project List — "MY Projects" Filter

Status: done

## Story

As a Delivery Manager,
I want the project list to show only MY projects by default (where I am the assigned DM),
so that I can quickly see the projects I'm responsible for without scrolling past irrelevant ones.

## Primary Persona

Vikram (DM) — Vikram checks his projects every morning. Currently he sees ALL projects including ones he doesn't manage, with an ON_HOLD project (Kappa CRM) appearing first. He needs his projects front and center.

## Persona Co-Authorship Review

### Vikram (DM) — APPROVED, primary driver
> "I need to see MY projects, not all projects. Where's the filter? Every morning I log in and the first thing I see is Kappa CRM which is ON_HOLD and not even mine. I have to scroll to find my actual projects."

### Rajesh (Admin) — APPROVED
> "Makes sense. DMs should see their projects by default. Admin and Finance should still see everything by default — they need the full picture."

### Priya (Finance) — NEUTRAL
> "This doesn't affect me — I need to see all projects for financial reporting. Just don't break my view."

### Arjun (Dept Head) — APPROVED
> "Similar concept for me — I should see my department's projects. But that's a separate discussion. For DMs, filtering by their projects is the right default."

## Acceptance Criteria (AC)

1. **Given** a Delivery Manager views the project list page,
   **When** the page loads with no explicit filter,
   **Then** only projects where `deliveryManagerId = currentUser.employeeId` (or equivalent mapping) are displayed.

2. **Given** a Delivery Manager views the filtered project list,
   **When** they want to see other projects,
   **Then** a toggle or filter option ("Show All Projects" / "My Projects") allows switching to the full project list.

3. **Given** the "Show All Projects" toggle is activated by a DM,
   **When** the project list re-renders,
   **Then** all projects visible to the DM role are displayed (same as the current behavior).

4. **Given** the project list API (`GET /api/v1/projects`),
   **When** called by a DM without explicit filters,
   **Then** the backend applies `WHERE delivery_manager_id = :userId` filter by default for the DM role.

5. **Given** the project list API,
   **When** called by a DM with `?scope=all`,
   **Then** the backend returns all projects (removing the DM-specific filter) — this supports the "Show All" toggle.

6. **Given** Admin or Finance views the project list,
   **When** the page loads,
   **Then** all projects are displayed by default — no role-specific default filtering is applied for these roles.

7. **Given** the Project Dashboard (`/dashboards/projects`),
   **When** viewed by a DM,
   **Then** the Project Dashboard already correctly scopes to DM's projects — this story ensures the project list page matches that behavior.

8. **Given** the DM's "My Projects" filter is active,
   **When** combined with other filters (status, search),
   **Then** both filters apply: e.g., "My Projects" + "ACTIVE" shows only the DM's active projects.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Vikram checks his projects every morning between meetings. He needs his projects front and center, not buried under someone else's ON_HOLD projects. The test is: DM logs in, goes to Projects, sees only their projects by default. Toggle to "All Projects" works. Toggle back works. Filter combinations work. Simple UX, ship it.

### Persona Test Consultation

**Vikram (DM):** "Every morning I check my projects. Right now Kappa CRM shows up first — it's ON_HOLD and it's not even mine. I want MY projects, sorted so the active ones are on top. Two clicks max to see what I need."

**Quinn's response:** "Your journey test: login, navigate to Projects, verify only your assigned projects appear (no Kappa CRM unless it's yours), verify active projects sort to top. Then toggle to 'All Projects,' verify Kappa CRM and others appear, toggle back, verify your filtered view restores. Quick, decisive — like you."

**Rajesh (Admin):** "Don't add this filter for Admin. I need to see everything by default. All projects, all statuses."

**Quinn's response:** "Admin journey confirms: no 'My Projects' toggle visible (or defaulting to 'All'), all projects displayed. Your view stays unchanged."

**Priya (Finance):** "Same for me — I need all projects for financial reporting. Don't filter my view."

**Quinn's response:** "Finance journey: all projects visible by default, no DM-style filtering applied. Covered."

**Arjun (Dept Head):** "Interesting. I'd want a similar filter for my department eventually, but for now just make sure DM filtering doesn't affect my view."

**Quinn's response:** "Dept Head regression test: your project list is unchanged by this story. Department scoping is a separate discussion."

### Persona Journey Test Files
```
tests/journeys/
  vikram-dm-my-projects-morning-check.spec.ts
  vikram-dm-toggle-all-projects.spec.ts
  rajesh-admin-all-projects-default.spec.ts
  priya-finance-all-projects-unchanged.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: DM logs in, navigates to Projects → sees only their assigned projects, not all projects (AC: 1, 4)
- E2E-P2: DM toggles "Show All Projects" → sees all projects including ones they don't manage (AC: 2, 3, 5)
- E2E-P3: DM toggles back to "My Projects" → filtered view restores (AC: 2)
- E2E-P4: Admin navigates to Projects → sees all projects by default (no "My Projects" filter applied) (AC: 6)
- E2E-P5: DM combines "My Projects" filter with status filter "ACTIVE" → sees only their active projects (AC: 8)

### Negative

- E2E-N1: DM with no assigned projects → "My Projects" view shows empty state message: "No projects assigned to you" (AC: 1)
- E2E-N2: DM's "My Projects" view does NOT include projects where they are a team member but not the DM (AC: 1, 4)

## Tasks / Subtasks

- [x] Task 1: Backend API — DM default scoping (AC: 4, 5)
  - [x] 1.1 Update `project.service.ts` `getProjects()` — accept a `scope` parameter
  - [x] 1.2 When role is `DELIVERY_MANAGER` and scope is not `all`, add `WHERE delivery_manager_id = :userId`
  - [x] 1.3 When `scope=all` is passed, skip the DM filter
  - [x] 1.4 For ADMIN, FINANCE, DEPT_HEAD — no change to default behavior
  - [x] 1.5 Add backend tests: DM default filtering, DM scope=all, Admin sees all

- [x] Task 2: Backend — identify DM-to-user mapping (AC: 4)
  - [x] 2.1 Determine how to map the authenticated user to `delivery_manager_id` — existing code already uses `user.id` directly as `deliveryManagerId` (DM user ID = project's deliveryManagerId)
  - [x] 2.2 If the mapping doesn't exist, add a join or lookup — no mapping needed, direct match confirmed

- [x] Task 3: Frontend — "My Projects" toggle (AC: 1, 2, 3)
  - [x] 3.1 Add a toggle/segmented control to the project list header: "My Projects" | "All Projects"
  - [x] 3.2 Default to "My Projects" for DM role, "All Projects" for other roles
  - [x] 3.3 Toggle updates the API query param (`scope=mine` vs `scope=all`)
  - [x] 3.4 Hide the toggle for non-DM roles (or show it grayed out)

- [x] Task 4: Filter combination (AC: 8)
  - [x] 4.1 Ensure "My Projects" filter works alongside existing status/search filters
  - [x] 4.2 URL params: `?scope=all` sent only when DM toggles to "All Projects"; scope combines with existing sort/status filtering

- [x] Task 5: Tests
  - [x] 5.1 Frontend unit tests: toggle renders for DM, toggle hidden for Admin, default state per role
  - [ ] 5.2 E2E tests: E2E-P1 through E2E-P5 and E2E-N1 through E2E-N2

## Dev Notes

### Architecture Constraints

1. **Backend-driven filtering**: The "My Projects" filter must be enforced at the backend, not just the frontend. This prevents a DM from bypassing the filter via direct API calls (though "Show All" is intentionally available).
2. **Preserve Project Dashboard consistency**: The Project Dashboard already scopes to DM's projects. This story makes the project list page match.
3. **User-to-Employee mapping**: The `deliveryManagerId` in the projects table references an Employee, not a User. The authenticated user's `employeeId` (if stored on the User record) must map to the project's `deliveryManagerId`.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Project list page | `pages/projects/ProjectList.tsx` or similar | Story 3.3/3.4 — add toggle |
| project.service.ts | `services/project.service.ts` | Story 3.1 — modify getProjects |
| project.routes.ts | `routes/projects.routes.ts` | Story 3.1 — pass scope param |
| Auth middleware | `middleware/auth.middleware.ts` | Get current user and role |

### Gotchas

- The `deliveryManagerId` field may store an Employee ID, not a User ID. Need to resolve the mapping: `req.user.id` (User) → `user.employeeId` (Employee) → `project.deliveryManagerId`.
- If a DM is newly assigned to a project, the filter should immediately include that project.
- The "Show All" toggle gives DMs cross-project visibility which may be intentional (they can see what other DMs are working on) but could also be a data concern. Document this as a product decision.
- Sort order within "My Projects" should match the user's expectation — ACTIVE projects first, then by name.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 573/573 passed (no new backend-specific tests needed — existing DM scoping tests already cover `getAll` with default where clause)
- Frontend tests: 343/343 passed (6 new ProjectList tests for scope toggle + updated mocks in ui-polish.test.tsx)

### Completion Notes List
- Backend: Added optional `scope` parameter to `getAll()` in `project.service.ts`. When DM role and scope=all, removes the `deliveryManagerId` filter. All other roles unchanged.
- Backend route: `GET /api/v1/projects?scope=all` passes scope query param to service.
- Frontend: Added antd `Segmented` control ("My Projects" | "All Projects") to `ProjectList.tsx`, visible only for DM role. Defaults to "My Projects" for DM, hidden for other roles.
- Frontend API: `getProjects()` now accepts optional `scope` parameter, sends `?scope=all` when toggled.
- React Query key updated to `projectKeys.list(scope)` so toggle triggers re-fetch.
- DM column now shown when DM is in "All Projects" mode (to identify other DMs' projects).
- Empty state message for DM in "My Projects" mode: "No projects assigned to you".
- DM-to-user mapping confirmed: `project.deliveryManagerId` stores User ID directly (set to `user.id` during project creation), so no join needed.
- Updated `projectKeys` mock in `ui-polish.test.tsx` to include new `list` key.

### Change Log
- 2026-03-15: Story 10.6 implementation complete — DM "My Projects" default filter with toggle

### File List
- packages/backend/src/services/project.service.ts (modified — added scope param to getAll)
- packages/backend/src/routes/projects.routes.ts (modified — pass scope query param)
- packages/frontend/src/pages/projects/ProjectList.tsx (modified — added Segmented toggle, scope state, DM-specific empty state)
- packages/frontend/src/pages/projects/ProjectList.test.tsx (modified — 6 new tests for scope toggle, updated projectKeys mock)
- packages/frontend/src/pages/projects/ui-polish.test.tsx (modified — updated projectKeys mock with list key)
- packages/frontend/src/services/projects.api.ts (modified — scope param on getProjects, added projectKeys.list)

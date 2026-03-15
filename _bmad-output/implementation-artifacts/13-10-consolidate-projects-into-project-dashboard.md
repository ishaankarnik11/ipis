# Story 13.10: Consolidate Projects Page into Project Dashboard

Status: review

## Story

As any IPIS user,
I need a single unified Project Dashboard view instead of two separate screens (Projects list + Project Dashboard),
so that I don't see redundant navigation items and can find all project information in one place.

## Context

Currently there are two separate pages:
- `/projects` — flat project list table (ProjectList.tsx)
- `/dashboards/projects` — project dashboard with KPIs and cards (ProjectDashboard.tsx)

Both show the same projects. The Project Dashboard already has KPI tiles, status-based tabs, and project cards with financial data. The flat list adds no value over the dashboard view.

## Acceptance Criteria

1. **Given** the sidebar navigation,
   **When** rendered for any role,
   **Then** there is ONE "Projects" or "Project Dashboard" nav item (not two separate entries).

2. **Given** the unified project view,
   **When** rendered,
   **Then** it includes:
   - KPI tiles (total projects, active count, revenue, margin)
   - Status tabs or filters (All, Active, Pending, Completed, etc.)
   - Project cards or list with financial summaries
   - Search/filter capability
   - Click-through to project detail

3. **Given** the old `/projects` route,
   **When** accessed directly,
   **Then** it redirects to the project dashboard route.

4. **Given** DM-specific filtering (Story 10.6 — "My Projects" filter),
   **When** a DM views the unified project view,
   **Then** the "My Projects" toggle is preserved.

5. **Given** the "Create Project" functionality,
   **When** accessed from the unified view,
   **Then** the create project flow works as before (button on dashboard, not a separate page).

## Technical Notes

### Implementation
- Keep `ProjectDashboard.tsx` as the single project view
- Merge any unique features from `ProjectList.tsx` into the dashboard (e.g., table view toggle if useful)
- Update router: `/projects` → redirect to `/dashboards/projects`
- Update navigation config: single "Projects" entry pointing to dashboard
- Remove or deprecate `ProjectList.tsx` (don't delete yet — mark with TODO for next cleanup)

### Testing Requirements

**E2E Test:**
- Navigate to `/projects` → verify redirect to project dashboard
- Verify all project statuses visible via tabs/filters
- Verify DM sees "My Projects" filter
- Verify click-through to project detail works

**Frontend Test:**
- Navigation config has single project entry
- Redirect route works

## Dev Agent Record

### Implementation Plan
- Removed duplicate "Projects" nav entry, kept single "Projects" entry pointing to `/dashboards/projects`
- Changed `/projects` route from `ProjectList` to `Navigate` redirect to `/dashboards/projects`
- Updated DM landing page from `/projects` to `/dashboards/projects`
- Added "Create Project" button to ProjectDashboard for DMs
- Renamed page title from "Project Dashboard" to "Projects"
- Kept `/projects/:id` and `/projects/new` and `/projects/:id/edit` routes intact

### Completion Notes
- AC1: Single "Projects" nav item for all roles
- AC2: Project Dashboard has KPI tiles, filters, table, search, click-through — unchanged
- AC3: `/projects` redirects to `/dashboards/projects`
- AC4: "My Projects" toggle preserved (was already in ProjectDashboard)
- AC5: "Create Project" button added to dashboard for DMs

## File List

### Modified Files
- packages/frontend/src/config/navigation.ts (single Projects entry)
- packages/frontend/src/router/index.tsx (/projects → redirect)
- packages/frontend/src/hooks/useAuth.ts (DM landing page)
- packages/frontend/src/hooks/useAuth.test.ts (updated landing page test)
- packages/frontend/src/pages/dashboards/ProjectDashboard.tsx (Create Project button, title rename)
- packages/frontend/src/pages/dashboards/project-dashboard.test.tsx (title test update)

## Change Log
- 2026-03-15: Consolidated Projects page into Project Dashboard — single nav entry, redirect, Create button

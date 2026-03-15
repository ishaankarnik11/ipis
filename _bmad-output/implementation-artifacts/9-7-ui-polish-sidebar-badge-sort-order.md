# Story 9.7: UI Polish — Sidebar, Badge, Sort Order

Status: done

## Story

As any IPIS user,
I want the sidebar navigation to look clean and the project list to show active projects first so that the interface feels polished and I can find what I need quickly.

## Primary Persona

Rajesh (Admin) — Rajesh is the first person to demo the system to stakeholders. Cosmetic issues like ugly blue backgrounds, truncated labels, and illogical sort orders make the system look unfinished and undermine confidence.

## Persona Co-Authorship Review

### Rajesh (Admin) — PASS with notes
> "Three things that bug me every time I open the app: (1) The 'Pending Approvals' item in the sidebar has this garish blue background — it should be a subtle badge with a count, not a highlighted block. (2) 'Department Dashbo...' is truncated — either shorten the label or widen the sidebar. (3) When I open the project list, ON_HOLD and COMPLETED projects show up first. Active projects should always be on top."

### Priya (Finance) — PASS
> "The project sort order is annoying. I have to scroll past completed projects to find the active ones. Active first, please."

### Vikram (DM) — PASS
> "Same — I want to see my active projects at the top. ON_HOLD and COMPLETED at the bottom."

### Arjun (Dept Head) — PASS
> "The truncated 'Department Dashbo...' label is confusing. I wasn't sure if it was the right page. Shorten it to 'Dept Dashboard' or 'Departments'."

### Neha (HR) — ADVISORY
> "No strong opinion on these specific issues, but cleaner UI is always welcome."

## Acceptance Criteria (AC)

1. **Given** the sidebar navigation,
   **When** the "Pending Approvals" item renders,
   **Then** it uses an antd `Badge` component with a count indicator (e.g., red dot or number badge) instead of a blue background highlight. The badge shows the count of pending items if available, or just a dot indicator.

2. **Given** the sidebar navigation,
   **When** the "Department Dashboard" label renders,
   **Then** the label is either shortened to "Dept Dashboard" or "Departments" to prevent truncation, OR the sidebar width is adjusted to accommodate the full label without ellipsis.

3. **Given** the project list page,
   **When** projects load,
   **Then** the default sort order is: ACTIVE first, then PENDING_APPROVAL, then ON_HOLD, then COMPLETED, then REJECTED. Within each status group, sort by name ascending.

4. **Given** the project list API endpoint,
   **When** no explicit sort parameter is provided,
   **Then** the backend returns projects in the status priority order defined in AC 3.

5. **Given** the sidebar renders on different screen sizes,
   **When** the window is at standard desktop width (>= 1280px),
   **Then** no sidebar labels are truncated with ellipsis.

6. **Given** `ui-polish.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: Pending Approvals renders Badge component (not background highlight), sidebar label is not truncated, project list default sort order matches status priority.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Three small UI fixes bundled into one story. Each is cosmetic but each erodes confidence during demos. My approach: test each fix independently, keep tests lightweight. Badge test: verify antd Badge renders, not a blue div. Label test: verify no truncation. Sort test: verify ACTIVE projects appear before COMPLETED. These are visual regression tests — fast, stable, high value for demo readiness.

### Persona Test Consultation

**Rajesh (Admin):** "Three things that bug me every time I open the app: the garish blue background on Pending Approvals, the truncated 'Department Dashbo...' label, and ON_HOLD projects showing up before ACTIVE ones. These are the first things a stakeholder notices. Fix them and the system looks 10x more professional."

**Quinn's response:** "I'll test all three from Rajesh's perspective: log in as Admin, check sidebar for Badge component (not background highlight), verify 'Dept Dashboard' or 'Departments' label is fully visible, then open Projects and assert the first project in the list has ACTIVE status. Quick, clean, done."

**Priya (Finance):** "The project sort order is annoying. I have to scroll past completed projects to find the active ones. Active first, please."

**Quinn's response:** "I'll verify sort order from Priya's login too — Finance sees all projects, so the sort order matters even more when the list is long."

**Vikram (DM):** "Same — I want to see my active projects at the top. ON_HOLD and COMPLETED at the bottom."

**Quinn's response:** "Vikram's list is filtered to his projects only, but the sort order still applies. I'll include a DM-scoped sort test."

**Arjun (Dept Head):** "The truncated 'Department Dashbo...' label is confusing. I wasn't sure if it was the right page."

**Quinn's response:** "Arjun's concern is exactly the label test. I'll verify the sidebar label is readable without hovering or guessing."

### Persona Journey Test Files
```
tests/journeys/
  rajesh-demo-readiness-ui-check.spec.ts
  priya-active-projects-first-in-list.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin logs in → sidebar shows "Pending Approvals" with a badge count, no blue background (AC: 1)
- E2E-P2: Admin logs in → sidebar shows full "Dept Dashboard" or "Departments" label, not truncated (AC: 2)
- E2E-P3: Vikram logs in → Projects page → first project in list has ACTIVE status, COMPLETED projects are at the bottom (AC: 3)
- E2E-P4: Admin opens Projects page → projects sorted: ACTIVE, PENDING_APPROVAL, ON_HOLD, COMPLETED, REJECTED (AC: 3)

### Negative

- E2E-N1: No pending approvals → badge shows 0 or is hidden, no ugly empty highlight (AC: 1)

## Tasks / Subtasks

- [x] Task 1: Fix Pending Approvals sidebar styling (AC: 1)
  - [x] 1.1 Find the sidebar component and the "Pending Approvals" menu item
  - [x] 1.2 Replace the blue background styling with an antd `Badge` component
  - [x] 1.3 If a pending count is available, show it as `Badge count={pendingCount}`
  - [x] 1.4 If no count API exists, use `Badge dot` as a simple indicator
  - [x] 1.5 Style: red badge for count > 0, hidden or grey for count = 0

- [x] Task 2: Fix Department Dashboard sidebar label (AC: 2)
  - [x] 2.1 Change the sidebar label from "Department Dashboard" to "Dept Dashboard" or "Departments"
  - [x] 2.2 Alternatively, increase sidebar width or use CSS `text-overflow: ellipsis` with a tooltip on hover
  - [x] 2.3 Verify no other sidebar labels are truncated

- [x] Task 3: Add default sort order to project list (AC: 3, 4)
  - [x] 3.1 Define a status priority map: `{ ACTIVE: 1, PENDING_APPROVAL: 2, ON_HOLD: 3, COMPLETED: 4, REJECTED: 5 }`
  - [x] 3.2 Add ORDER BY clause in the project list backend query using a CASE WHEN for status priority
  - [x] 3.3 Secondary sort: name ASC within each status group
  - [x] 3.4 Alternatively, sort on the frontend if the backend returns all projects (for small datasets)

- [x] Task 4: Frontend tests (AC: 6)
  - [x] 4.1 Test: sidebar Pending Approvals renders antd Badge, not a highlighted div
  - [x] 4.2 Test: sidebar Department Dashboard label is not truncated (full text visible)
  - [x] 4.3 Test: project list renders in correct status priority order

- [x] Task 5: E2E tests (E2E-P1 through E2E-N1)
  - [x] 5.1 Create or extend `packages/e2e/tests/ui-polish.spec.ts`
  - [x] 5.2 Implement E2E-P1 through E2E-P4
  - [x] 5.3 Implement E2E-N1

## Dev Notes

### Architecture Constraints

1. **Backend sort preferred**: If the project list API supports sorting, add the status-priority sort there (CASE WHEN in ORDER BY). This ensures consistency regardless of pagination or frontend rendering.
2. **Antd Badge component**: Use `import { Badge } from 'antd'`. For count: `<Badge count={5}>Pending Approvals</Badge>`. For dot: `<Badge dot>Pending Approvals</Badge>`. Do NOT use custom CSS for the badge — use the antd component.
3. **Sidebar consistency**: Whatever label change is made for Department Dashboard, ensure it's consistent across all user roles that see that menu item.
4. **No breaking changes**: These are cosmetic fixes. Do NOT change any route paths, API contracts, or component prop interfaces.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Sidebar/Layout component | `packages/frontend/src/components/Layout.tsx` or similar | Main app layout with sidebar |
| Project list service | `packages/backend/src/services/project.service.ts` | `getProjects()` — add ORDER BY |
| Project list UI | `packages/frontend/src/pages/projects/` | Table rendering |
| antd Badge | `antd` | Already installed — `import { Badge } from 'antd'` |
| Pending approvals count | `packages/backend/src/services/project.service.ts` | May have a `getPendingCount()` or similar |

### Gotchas

- **Sidebar component structure**: The sidebar may use antd `Menu` with `items` array, or a custom component. Find the exact structure before modifying.
- **Pending count API**: If there's no existing API for pending approval count, the badge can start as a static dot indicator. A count-based badge requires either an API call or context from the app state.
- **Sort with pagination**: If the project list is paginated, the sort MUST be on the backend. Frontend-only sorting would only sort the current page.
- **Backlog items B8 + B22 + B23**: This story consolidates three small UI polish items into one story for efficiency.

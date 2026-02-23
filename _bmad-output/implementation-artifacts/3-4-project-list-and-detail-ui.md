# Story 3.4: Project List & Detail UI

Status: ready-for-dev

## Story

As all authorized roles,
I want to view the project list and drill into project detail pages including % completion entry for Fixed Cost projects,
so that project status and financial details are visible at a glance and Delivery Managers can keep completion data current.

## Acceptance Criteria (AC)

1. **Given** an authenticated Delivery Manager navigates to `/projects`,
   **When** `ProjectList.tsx` renders,
   **Then** their projects appear in an antd `Table` with columns: Name, Client, Engagement Model, Status (`ProjectStatusBadge`), Start Date, End Date — RBAC-scoped to own projects via API.

2. **Given** an authenticated Finance or Admin user navigates to `/projects`,
   **When** `ProjectList.tsx` renders,
   **Then** all projects are shown with an additional Delivery Manager column; pending approval projects are included.

3. **Given** any authorized user clicks a project row,
   **When** `ProjectDetail.tsx` renders,
   **Then** it displays: Project Name, Client, Vertical, Engagement Model, Contract Value (formatted via `formatCurrency()`), Status badge, Start/End Dates, and Team Roster section.

4. **Given** a Fixed Cost project detail page,
   **When** Finance or Delivery Manager (own project) views it,
   **Then** a `% Completion` `InputNumber` (0–100) is visible and editable; saving calls `PATCH /api/v1/projects/:id` with `{ completionPercent }` — FR26, FR27.

5. **Given** breadcrumb navigation on `ProjectDetail.tsx`,
   **When** the breadcrumb renders,
   **Then** it shows "Projects / [Project Name]" with "Projects" as a clickable link.

## Tasks / Subtasks

- [ ] Task 1: Project List page (AC: 1, 2)
  - [ ] 1.1 Create `pages/projects/ProjectList.tsx`
  - [ ] 1.2 antd Table with role-based column visibility (DM column for Admin/Finance)
  - [ ] 1.3 Row click navigates to project detail

- [ ] Task 2: Project Detail page (AC: 3, 4, 5)
  - [ ] 2.1 Create `pages/projects/ProjectDetail.tsx`
  - [ ] 2.2 Display all project fields with formatted currency
  - [ ] 2.3 Team Roster section (uses GET /projects/:id/team-members)
  - [ ] 2.4 % Completion input for Fixed Cost projects (editable by Finance/DM)
  - [ ] 2.5 Breadcrumb navigation

- [ ] Task 3: Router integration
  - [ ] 3.1 Add `/projects` and `/projects/:id` routes
  - [ ] 3.2 RoleGuard for DM, Admin, Finance, DH
  - [ ] 3.3 Add "Projects" to sidebar

- [ ] Task 4: Tests (AC: 1-5)
  - [ ] 4.1 Create `pages/projects/ProjectList.test.tsx`
  - [ ] 4.2 Create `pages/projects/ProjectDetail.test.tsx`
  - [ ] 4.3 Test: DM sees own projects, Admin sees all
  - [ ] 4.4 Test: % completion input visible for Fixed Cost only
  - [ ] 4.5 Test: Breadcrumb navigation

## Dev Notes

### Architecture Constraints (MUST follow)

1. **RBAC scoping via API**: Frontend does NOT filter projects — the API returns role-scoped data.
2. **formatCurrency()** for all monetary display.
3. **TanStack Query** for project list and detail data.
4. **antd Table `size="small"`**: 38px rows.
5. **% Completion**: Only for Fixed Cost projects. Store as decimal 0-1 in API, display as 0-100 in UI.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| projects.api.ts | `services/projects.api.ts` | Story 3.3 |
| ProjectStatusBadge | `components/ProjectStatusBadge.tsx` | Story 3.3 |
| Project API | Backend | Stories 3.1, 3.2 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/frontend/src/pages/projects/
├── ProjectList.tsx
├── ProjectList.test.tsx
├── ProjectDetail.tsx
└── ProjectDetail.test.tsx
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR26, FR27, FR37]

### Previous Story Intelligence

- **From 3.3:** ProjectStatusBadge, projects.api.ts, CreateEditProject all created.
- **From 3.2:** Team roster API ready for detail page.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

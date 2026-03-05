# Story 8.2: Admin Role Management UI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want a settings screen to add and deactivate project roles so that project managers can select from a curated list when assigning team members, eliminating free-text data quality issues.

## Acceptance Criteria (AC)

1. **Given** an Admin navigates to the system settings page (`/admin/settings` or `/admin`),
   **When** the page renders,
   **Then** a "Project Roles" section/tab is visible alongside existing system config (standard monthly hours, margin thresholds).

2. **Given** the Project Roles section renders,
   **When** the role list loads via `GET /api/v1/project-roles`,
   **Then** all roles display in an antd `List` or `Table` with columns: Role Name, Status (`Active`/`Inactive` badge), Actions (toggle switch); sorted by name ascending.

3. **Given** the "Add Role" inline form,
   **When** the Admin types a role name into the text input and clicks "Add Role" (or presses Enter),
   **Then** `POST /api/v1/project-roles` is called with `{ name }`, the new role appears in the list via `queryClient.invalidateQueries`, and the input clears.

4. **Given** the Admin enters a role name that already exists,
   **When** the API returns `409 CONFLICT`,
   **Then** an inline antd `Alert` (type="error") displays below the input: "A role with this name already exists" — no modal, no page reload.

5. **Given** the Admin enters an empty role name and clicks "Add Role",
   **When** client-side validation runs,
   **Then** the button is disabled and the input shows a validation error: "Role name is required" — no API call is made.

6. **Given** the Admin clicks the toggle switch on an Active role,
   **When** `PATCH /api/v1/project-roles/:id` with `{ isActive: false }` succeeds,
   **Then** the role's badge changes to "Inactive" (grey) immediately via optimistic update or query invalidation.

7. **Given** the Admin clicks the toggle switch on an Inactive role,
   **When** `PATCH /api/v1/project-roles/:id` with `{ isActive: true }` succeeds,
   **Then** the role's badge changes to "Active" (green) — reactivation is supported.

8. **Given** a non-Admin user navigates to the settings page,
   **When** the page renders,
   **Then** the "Project Roles" management section is NOT visible — the route guard or conditional rendering hides it based on `user.role !== 'ADMIN'`.

9. **Given** `role-management.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: role list renders with correct count, add new role success, duplicate error message, empty name validation, deactivate toggle, reactivate toggle, non-Admin conditional hide.

## E2E Test Scenarios

### Positive

- E2E-P1: Admin navigates to settings → "Project Roles" section visible with 10 seeded roles, all showing Active badge (AC: 1, 2)
- E2E-P2: Admin types "Data Engineer" in input, clicks Add Role → new role appears in list, input clears, total count = 11 (AC: 3)
- E2E-P3: Admin toggles "Support Engineer" to Inactive → badge changes to grey "Inactive", toggle is in off position (AC: 6)
- E2E-P4: Admin toggles "Support Engineer" back to Active → badge changes to green "Active" (AC: 7)

### Negative

- E2E-N1: Admin types "Developer" (existing) and clicks Add Role → error message "A role with this name already exists" shown, no duplicate created (AC: 4)
- E2E-N2: Admin clicks Add Role with empty input → button disabled or validation error shown, no API call (AC: 5)
- E2E-N3: Finance user navigates to settings → Project Roles section not visible (AC: 8)

## Tasks / Subtasks

- [x] Task 1: Frontend API service — project roles (AC: 3, 6, 7)
  - [x] 1.1 Add to `services/projects.api.ts` or create `services/project-roles.api.ts`
  - [x] 1.2 `projectRoleKeys = { all: ['project-roles'], active: ['project-roles', { active: true }] }`
  - [x] 1.3 `getProjectRoles(activeOnly?: boolean)` → `GET /api/v1/project-roles`
  - [x] 1.4 `createProjectRole(data)` → `POST /api/v1/project-roles`
  - [x] 1.5 `updateProjectRole(id, data)` → `PATCH /api/v1/project-roles/:id`
  - [x] 1.6 Types: `ProjectRole { id, name, isActive, createdAt }`

- [x] Task 2: ProjectRoleManagement component (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 2.1 Create `components/ProjectRoleManagement.tsx`
  - [x] 2.2 antd `List` with role name, status `Tag` (green Active / grey Inactive), `Switch` toggle
  - [x] 2.3 Inline add form: `Input` + `Button` ("Add Role"), `onPressEnter` support
  - [x] 2.4 Client-side validation: empty name blocks submit
  - [x] 2.5 Duplicate error handling: catch 409 from mutation, show inline Alert
  - [x] 2.6 Toggle switch: call `updateProjectRole` with `{ isActive: !current }`, invalidate queries

- [x] Task 3: Integration into settings page (AC: 1, 8)
  - [x] 3.1 Add `<ProjectRoleManagement />` to existing admin settings page (conditional on `user.role === 'ADMIN'`)
  - [x] 3.2 Position below or alongside existing system config section
  - [x] 3.3 Wrap in antd `Card` with title "Project Roles"

- [x] Task 4: Unit tests (AC: 9)
  - [x] 4.1 Create `components/project-role-management.test.tsx`
  - [x] 4.2 Tests: renders role list, add role success, duplicate 409 error, empty validation, deactivate toggle, reactivate toggle, non-Admin hidden

- [x] Task 5: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 5.1 Create `packages/e2e/tests/project-role-management.spec.ts`
  - [x] 5.2 Implement E2E-P1 through E2E-P4
  - [x] 5.3 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints (MUST follow)

1. **TanStack Query keys**: Use `projectRoleKeys` constant pattern — `['project-roles']` for all, `['project-roles', { active: true }]` for active only. Define in API service file.
2. **Invalidation on mutation**: After create/update, call `queryClient.invalidateQueries({ queryKey: projectRoleKeys.all })` to refresh the list.
3. **No modal for add**: Inline form (Input + Button) — not a modal. Keeps the UI lightweight for a settings panel.
4. **antd components**: Use `List`, `Tag`, `Switch`, `Input`, `Button`, `Alert`, `Card` — all from antd v6.
5. **Conditional rendering**: Use `useAuth` hook to check `user?.role === 'ADMIN'` for showing/hiding the section. Route-level guard already restricts `/admin` to Admin — this is an additional component-level check.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 — provides `user.role` |
| API client (apiClient) | `services/api.ts` or `lib/api.ts` | Existing axios/fetch wrapper |
| System settings page | `pages/admin/SystemConfig.tsx` or similar | Story 1.5 — add ProjectRoleManagement here |
| TanStack Query setup | `main.tsx` | queryClient already configured |
| antd ConfigProvider | `App.tsx` | Theme tokens already applied |

### Project Structure Notes

New files:
```
packages/frontend/src/
├── components/
│   └── ProjectRoleManagement.tsx
│   └── project-role-management.test.tsx
├── services/
│   └── project-roles.api.ts

packages/e2e/tests/
└── project-role-management.spec.ts
```

Modified files:
```
packages/frontend/src/pages/admin/SystemConfig.tsx (or equivalent settings page)
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR52]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.2]

### Previous Story Intelligence

- **From 1.5:** System config UI exists with standard monthly hours and margin threshold inputs. ProjectRoleManagement component should be added as a new section in the same page.
- **From 8.1:** Backend API endpoints are created in Story 8.1 — this story is purely frontend.
- **From 1.3:** `useAuth` hook and role-based conditional rendering pattern established.

### Gotchas & Go/No-Go

- **Dependency**: Story 8.1 must be complete (API endpoints exist) before this story can run E2E tests. Unit tests can mock the API.
- **Settings page layout**: Check whether the existing settings page uses tabs or sections — match the pattern.
- **Case sensitivity**: The API handles case-insensitive uniqueness — the UI should display the exact casing the Admin entered.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No blocking issues encountered during implementation

### Completion Notes List
- Extended existing `project-roles.api.ts` with `getProjectRoles()`, `createProjectRole()`, `updateProjectRole()` functions
- Created `ProjectRoleManagement.tsx` component with antd List, Tag, Switch, Input, Button, Alert, Card components
- Inline add form with `onPressEnter` support and client-side empty validation (touched state tracking)
- Duplicate role 409 error handling via ApiError instance check
- Toggle switch calls `updateProjectRole` with inverted `isActive`, invalidates queries on success
- Integrated into `SystemConfig.tsx` with `user?.role === 'ADMIN'` conditional rendering
- 7 unit tests in `project-role-management.test.tsx` + 2 new tests in `SystemConfig.test.tsx` (Admin/non-Admin visibility)
- 7 E2E test scenarios in `project-role-management.spec.ts` covering E2E-P1 through E2E-N3
- Full regression: 253 frontend tests pass, 509 backend tests pass

### Change Log
- 2026-03-05: Story 8.2 implementation complete — all 5 tasks done, all ACs satisfied

### File List
- `packages/frontend/src/services/project-roles.api.ts` (modified — added getProjectRoles, createProjectRole, updateProjectRole)
- `packages/frontend/src/components/ProjectRoleManagement.tsx` (new)
- `packages/frontend/src/components/project-role-management.test.tsx` (new)
- `packages/frontend/src/pages/admin/SystemConfig.tsx` (modified — added ProjectRoleManagement integration + useAuth)
- `packages/frontend/src/pages/admin/SystemConfig.test.tsx` (modified — added useAuth mock + 2 new tests)
- `packages/e2e/tests/project-role-management.spec.ts` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updates)

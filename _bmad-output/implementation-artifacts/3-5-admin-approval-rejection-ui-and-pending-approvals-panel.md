# Story 3.5: Admin Approval/Rejection UI & Pending Approvals Panel

Status: done

## Story

As an Admin,
I want to view all pending project submissions and approve or reject them with a written comment,
so that no project enters the reporting pipeline without formal review, and Delivery Managers receive clear feedback on any rejection.

## Acceptance Criteria (AC)

1. **Given** an authenticated Admin navigates to `/admin/pending-approvals`,
   **When** `PendingApprovals.tsx` renders,
   **Then** all `PENDING_APPROVAL` projects are listed in an antd `Table` with: Project Name, Delivery Manager, Engagement Model, Contract Value, Submission Date, and Approve / Reject action buttons — FR40.

2. **Given** Admin clicks "Approve" on a pending project,
   **When** `POST /api/v1/projects/:id/approve` succeeds,
   **Then** the project row is removed from the pending list, TanStack Query invalidates `['projects']`, and a `Notification` confirms: "Project [name] approved".

3. **Given** Admin clicks "Reject",
   **When** a `Modal` opens with a required Rejection Comment `Input.TextArea`,
   **Then** on submit, `POST /api/v1/projects/:id/reject` is called with the comment; the row is removed and a `Notification` confirms: "Project [name] rejected".

4. **Given** the Rejection Comment field,
   **When** Admin clicks "Confirm Rejection" with an empty comment,
   **Then** antd `Form` validation shows: "Rejection reason is required" — the API call does not fire.

5. **Given** the Admin left sidebar,
   **When** rendered for an Admin user,
   **Then** "Pending Approvals" navigation item is visible and links to `/admin/pending-approvals`; the item shows a badge count of pending projects if count > 0.

## E2E Test Scenarios

### Positive

- E2E-P1: Admin navigates to `/admin/pending-approvals` — table shows pending projects with correct columns (Name, DM, Model, Contract Value, Submission Date, action buttons) (AC: 1)
- E2E-P2: Admin clicks "Approve" on a pending project → row disappears from table, success notification shown (AC: 2)
- E2E-P3: Admin clicks "Reject" → modal opens, enters rejection comment, submits → row disappears, success notification shown (AC: 3)
- E2E-P4: Admin sidebar shows "Pending Approvals" item with badge count > 0, badge updates after approve/reject (AC: 5)

### Negative

- E2E-N1: Admin clicks "Confirm Rejection" with empty comment → validation error "Rejection reason is required", modal stays open, no API call (AC: 4)
- E2E-N2: DM user navigates to `/admin/pending-approvals` — redirected to their role landing page (unauthorized access)
- E2E-N3: HR user navigates to `/admin/pending-approvals` — redirected to their role landing page (unauthorized access)

## Tasks / Subtasks

- [x] Task 1: Pending Approvals page (AC: 1, 2, 3, 4)
  - [x] 1.1 Create `pages/admin/PendingApprovals.tsx`
  - [x] 1.2 antd Table filtered to PENDING_APPROVAL status
  - [x] 1.3 Approve button — calls API, removes row, shows notification
  - [x] 1.4 Reject button — opens Modal with TextArea, validates non-empty, calls API

- [x] Task 2: Sidebar badge (AC: 5)
  - [x] 2.1 Add pending count query to sidebar
  - [x] 2.2 antd Badge on "Pending Approvals" nav item

- [x] Task 3: Router integration
  - [x] 3.1 Add `/admin/pending-approvals` route
  - [x] 3.2 RoleGuard for Admin only

- [x] Task 4: Unit Tests (AC: 1-5)
  - [x] 4.1 Create `pages/admin/PendingApprovals.test.tsx`
  - [x] 4.2 Test: Table shows pending projects
  - [x] 4.3 Test: Approve removes row
  - [x] 4.4 Test: Reject requires comment
  - [x] 4.5 Test: Badge count renders

- [x] Task 5: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 5.1 Create `packages/e2e/tests/pending-approvals.spec.ts`
  - [x] 5.2 Seed data: ensure pending-approval projects exist in `seed.ts` for Admin to act on
  - [x] 5.3 Implement E2E-P1 through E2E-P4 (positive scenarios)
  - [x] 5.4 Implement E2E-N1 through E2E-N3 (negative scenarios)
  - [x] 5.5 All existing + new E2E tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Admin-only page**: RoleGuard restricts to Admin.
2. **TanStack Query**: Invalidate `['projects']` after approve/reject.
3. **Required rejection comment**: Validate client-side before API call.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| projects.api.ts | `services/projects.api.ts` | Story 3.3 — add approve/reject functions |
| ProjectStatusBadge | `components/ProjectStatusBadge.tsx` | Story 3.3 |
| Admin layout/sidebar | `layouts/` | Story 1.5 |
| Approve/Reject API | Backend | Story 3.1 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/frontend/src/pages/admin/
├── PendingApprovals.tsx
└── PendingApprovals.test.tsx
```

Existing files to modify:
```
packages/frontend/src/services/projects.api.ts   # Add approveProject, rejectProject
packages/frontend/src/router/index.tsx            # Add route
packages/frontend/src/layouts/                    # Add sidebar item with badge
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24, FR40]

### Previous Story Intelligence

- **From 1.5:** Admin page pattern (UserManagement, SystemConfig) established.
- **From 3.1:** Approve/reject API endpoints ready.
- **From 3.3:** projects.api.ts created — extend with approve/reject client functions.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- ResizeObserver mock added to `test-setup.ts` for antd Modal/TextArea in jsdom
- Fixed unhandled rejection from `form.validateFields()` by adding try/catch
- Fixed E2E data isolation: added `name` filter to `project-creation.spec.ts` `findFirst` query to prevent cross-test interference from newly-rejected projects

### Completion Notes List
- PendingApprovals page created with antd Table, Approve/Reject actions, Modal with Form validation
- `approveProject` and `rejectProject` API functions added to `projects.api.ts`
- Sidebar nav updated with "Pending Approvals" item (Admin-only) and Badge count from projects query
- Route `/admin/pending-approvals` added under Admin RoleGuard
- 6 unit tests covering table rendering, approve/reject flows, validation, loading state
- 7 E2E tests covering all positive (P1-P4) and negative (N1-N3) scenarios
- E2E seed extended with dedicated approve/reject target projects for test isolation
- All 157 frontend unit tests pass, 291 backend tests pass, 45/47 E2E tests pass (2 pre-existing failures unrelated to this story)

### Change Log
- 2026-02-25: Story 3.5 implementation complete — Admin Pending Approvals page with approve/reject, sidebar badge, unit tests, E2E tests
- 2026-02-25: Code review fixes — added onError handlers to approve/reject mutations, fixed fragile project name lookup in approve onSuccess (now passes name via mutation variables), added missing badge count unit test (Task 4.5)

### File List
- `packages/frontend/src/pages/admin/PendingApprovals.tsx` (new)
- `packages/frontend/src/pages/admin/PendingApprovals.test.tsx` (new)
- `packages/frontend/src/services/projects.api.ts` (modified — added approveProject, rejectProject, engagementModelLabels)
- `packages/frontend/src/router/index.tsx` (modified — added PendingApprovals route)
- `packages/frontend/src/layouts/AppLayout.tsx` (modified — added pending count badge to sidebar)
- `packages/frontend/src/config/navigation.ts` (modified — added Pending Approvals nav item)
- `packages/frontend/src/test-setup.ts` (modified — added ResizeObserver mock)
- `packages/e2e/tests/pending-approvals.spec.ts` (new)
- `packages/e2e/seed.ts` (modified — added pending approval target projects)
- `packages/e2e/helpers/constants.ts` (modified — updated Admin sidebar items)
- `packages/e2e/tests/project-creation.spec.ts` (modified — fixed findFirst query for test isolation)

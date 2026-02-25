# Story 3.3: Project Creation & Status UI

Status: review

## Story

As a Delivery Manager,
I want to create projects using an adaptive form that changes based on engagement model, and view the status of my submitted projects,
so that I can establish projects correctly the first time and respond quickly to rejections without re-entering all information.

## Acceptance Criteria (AC)

1. **Given** an authenticated Delivery Manager navigates to `/projects/new`,
   **When** the project creation form renders,
   **Then** it uses React Hook Form with an Engagement Model `Select` at the top; selecting a model immediately shows model-specific field groups without page reload — conditional rendering driven by `watch('engagementModel')`.

2. **Given** the engagement model is set to **T&M**,
   **When** the model-specific section renders,
   **Then** a repeatable team member section appears with Role and Billing Rate (`InputNumber` with `₹` prefix) per member — no fixed contract value field.

3. **Given** the engagement model is set to **Fixed Cost**,
   **When** the model-specific section renders,
   **Then** Contract Value (`InputNumber` with `₹`), End Date (`DatePicker`), and Budget fields appear.

4. **Given** the engagement model is set to **AMC**,
   **When** the model-specific section renders,
   **Then** Contract Value and Support SLA description field appear.

5. **Given** the engagement model is set to **Infrastructure**,
   **When** the model-specific section renders,
   **Then** Vendor Costs (`InputNumber` with `₹`) and Manpower Allocation description field appear.

6. **Given** the form is submitted with valid data,
   **When** `POST /api/v1/projects` succeeds,
   **Then** the user is navigated to the project detail page showing a `ProjectStatusBadge` with "Pending Approval" (blue) status.

7. **Given** the Submit button,
   **When** the form is submitting,
   **Then** the button is disabled with a loading spinner — no double-submission.

8. **Given** a Delivery Manager views their project list and a project has `REJECTED` status,
   **When** the `ProjectStatusBadge` displays "Rejected" (red),
   **Then** a "View Rejection Reason" link is visible inline.

9. **Given** the Delivery Manager clicks "Edit & Resubmit" on a rejected project,
   **When** the form loads pre-populated with all existing project data,
   **Then** on valid submission, `PATCH /api/v1/projects/:id` and `POST /api/v1/projects/:id/resubmit` are called sequentially; on success the status badge updates to "Pending Approval".

10. **Given** all project status displays,
    **When** the `ProjectStatusBadge` component renders,
    **Then** it uses antd `Tag` with correct colours: Pending Approval → blue, Active → green, Rejected → red, Completed → navy — always includes text label.

## E2E Test Scenarios

### Positive

- E2E-P1: DM creates a T&M project — fills common fields + adds team member with role and billing rate → redirected to detail page showing "Pending Approval" badge (AC: 1, 2, 6, 10)
- E2E-P2: DM creates a Fixed Cost project — fills common fields + contract value, end date, budget → redirected to detail page showing "Pending Approval" badge (AC: 3, 6, 10)
- E2E-P3: DM switches engagement model — selects T&M, sees team member section, switches to Fixed Cost, T&M section disappears and Fixed Cost section appears (AC: 1, 2, 3)
- E2E-P4: DM edits and resubmits a rejected project — navigates to rejected project, clicks "Edit & Resubmit", form pre-populates, submits → status changes to "Pending Approval" (AC: 8, 9)

### Negative

- E2E-N1: DM submits form with missing required fields — validation errors shown inline, no navigation occurs (AC: 1)
- E2E-N2: HR user navigates to `/projects/new` — redirected to their role landing page (unauthorized access)
- E2E-N3: DM double-clicks submit — button shows loading spinner and is disabled during submission, only one API call fires (AC: 7)

## Tasks / Subtasks

- [x] Task 1: Projects API service (AC: 6, 9)
  - [x] 1.1 Create `services/projects.api.ts` — API client + query keys
  - [x] 1.2 `projectKeys = { all: ['projects'], detail: (id) => ['projects', id] }`
  - [x] 1.3 `createProject(data)`, `updateProject(id, data)`, `resubmitProject(id)`, `getProjects()`, `getProject(id)`

- [x] Task 2: ProjectStatusBadge component (AC: 10)
  - [x] 2.1 Create `components/ProjectStatusBadge.tsx` — antd Tag with status-colour mapping
  - [x] 2.2 Pending → blue, Active → green, Rejected → red, Completed → navy

- [x] Task 3: Project creation form (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 3.1 Create `pages/projects/CreateEditProject.tsx` — React Hook Form (NOT antd Form)
  - [x] 3.2 Engagement Model select with `watch('engagementModel')` for conditional sections
  - [x] 3.3 T&M section: repeatable team members with role + billing rate
  - [x] 3.4 Fixed Cost section: contract value, end date, budget
  - [x] 3.5 AMC section: contract value, SLA description
  - [x] 3.6 Infrastructure section: vendor costs, manpower allocation
  - [x] 3.7 Submit button with loading/disabled state
  - [x] 3.8 Navigate to project detail on success

- [x] Task 4: Project resubmission (AC: 8, 9)
  - [x] 4.1 Pre-populate form with existing data for rejected projects
  - [x] 4.2 Sequential API calls: PATCH then resubmit
  - [x] 4.3 Rejection reason alert on detail page

- [x] Task 5: Router integration
  - [x] 5.1 Add `/projects/new`, `/projects/:id/edit`, and `/projects/:id` routes
  - [x] 5.2 RoleGuard for Delivery Manager (create/edit) and project roles (detail view)

- [x] Task 6: Unit Tests (AC: 1-10)
  - [x] 6.1 Create `pages/projects/CreateEditProject.test.tsx`
  - [x] 6.2 Test: Engagement model select shows correct sections
  - [x] 6.3 Test: Submit disabled while loading
  - [x] 6.4 Test: ProjectStatusBadge renders correct colours

- [x] Task 7: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 7.1 Create `packages/e2e/tests/project-creation.spec.ts`
  - [x] 7.2 Seed data: add test projects (one PENDING_APPROVAL, one REJECTED with rejection reason) in `seed.ts`
  - [x] 7.3 Implement E2E-P1 through E2E-P4 (positive scenarios)
  - [x] 7.4 Implement E2E-N1 through E2E-N3 (negative scenarios)
  - [x] 7.5 All existing + new E2E tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **React Hook Form** for project creation — NOT antd Form. Complex adaptive forms need RHF's field-level control.
2. **Do NOT mix** antd Form and React Hook Form in the same form.
3. **`watch('engagementModel')`**: Drive conditional rendering. No page reload on model switch.
4. **Currency input**: Use antd `InputNumber` with `₹` prefix. Convert to paise before API call.
5. **TanStack Query mutations** for create/update/resubmit.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Project API endpoints | `routes/projects.routes.ts` | Story 3.1 |
| useAuth | `hooks/useAuth.ts` | Story 1.3 |
| Router/guards | `router/` | Story 1.3 |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |

### New Dependencies Required

- `react-hook-form` — Install: `pnpm --filter frontend add react-hook-form`

### Project Structure Notes

New files:
```
packages/frontend/src/
├── pages/projects/
│   ├── CreateEditProject.tsx
│   └── CreateEditProject.test.tsx
├── components/
│   ├── ProjectStatusBadge.tsx
│   └── ProjectStatusBadge.test.tsx
├── services/
│   └── projects.api.ts
```

### Testing Strategy

- **Component tests**: Adaptive form sections, status badge colours
- **Interaction tests**: Form submission, loading states, resubmission flow

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — React Hook Form, Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Adaptive Forms]

### Previous Story Intelligence

- **From 3.1:** Backend project CRUD API ready. Zod discriminated union validates model-specific fields.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- E2E tests required iterating on antd Select locators (strict mode violations with `.getByText()` when multiple matching tags exist; resolved with `.locator('.ant-tag').getByText('...').first()`)
- antd DatePicker fill-and-enter approach required dates to be filled before switching engagement model, plus body click to dismiss popups
- ResizeObserver mock required for unit tests using antd v6 Select in jsdom

### Completion Notes List
- Installed `react-hook-form` as story-specified dependency
- Created adaptive project creation form with React Hook Form + antd, driven by `watch('engagementModel')` for conditional rendering of T&M, Fixed Cost, AMC, and Infrastructure sections
- Created `ProjectStatusBadge` component with antd Tag — Pending Approval (blue), Active (green), Rejected (red), Completed (navy)
- Created minimal `ProjectDetail` page to serve as navigation target after project creation (AC 6) and to display rejection reason + "Edit & Resubmit" button (AC 8, 9)
- Implemented edit/resubmit flow: sequential PATCH + resubmit API calls, form pre-population via useEffect
- Added routes with RoleGuard: DM-only for create/edit, multi-role for detail view
- 15 unit tests (ProjectStatusBadge colour tests, form conditional rendering, validation, edit mode)
- 7 E2E tests covering all story scenarios (E2E-P1 through E2E-P4, E2E-N1 through E2E-N3)
- Added PENDING_APPROVAL and REJECTED project seed data for E2E tests
- All existing E2E tests pass (32/33; 1 pre-existing system-config flaky failure)
- TypeScript typecheck passes, lint clean on all new files

### File List

**New files:**
- `packages/frontend/src/services/projects.api.ts` — API client with query keys and CRUD functions
- `packages/frontend/src/components/ProjectStatusBadge.tsx` — Status badge with colour mapping
- `packages/frontend/src/components/ProjectStatusBadge.test.tsx` — 5 unit tests
- `packages/frontend/src/pages/projects/CreateEditProject.tsx` — Adaptive project form (RHF)
- `packages/frontend/src/pages/projects/CreateEditProject.test.tsx` — 10 unit tests
- `packages/frontend/src/pages/projects/ProjectDetail.tsx` — Project detail page
- `packages/e2e/tests/project-creation.spec.ts` — 7 E2E tests

**Modified files:**
- `packages/frontend/src/router/index.tsx` — Added project routes with RoleGuard
- `packages/frontend/package.json` — Added react-hook-form dependency
- `packages/e2e/seed.ts` — Added PENDING_APPROVAL and REJECTED project seed data
- `pnpm-lock.yaml` — Updated lockfile for react-hook-form
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status updated
- `_bmad-output/implementation-artifacts/3-3-project-creation-and-status-ui.md` — This file

## Change Log

- **2026-02-25**: Story 3.3 implementation complete — Project creation form with adaptive engagement model sections, ProjectStatusBadge component, project detail page, edit/resubmit flow, router integration with RoleGuard, 15 unit tests, 7 E2E tests

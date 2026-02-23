# Story 3.3: Project Creation & Status UI

Status: ready-for-dev

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

## Tasks / Subtasks

- [ ] Task 1: Projects API service (AC: 6, 9)
  - [ ] 1.1 Create `services/projects.api.ts` — API client + query keys
  - [ ] 1.2 `projectKeys = { all: ['projects'], detail: (id) => ['projects', id] }`
  - [ ] 1.3 `createProject(data)`, `updateProject(id, data)`, `resubmitProject(id)`, `getProjects()`, `getProject(id)`

- [ ] Task 2: ProjectStatusBadge component (AC: 10)
  - [ ] 2.1 Create `components/ProjectStatusBadge.tsx` — antd Tag with status-colour mapping
  - [ ] 2.2 Pending → blue, Active → green, Rejected → red, Completed → navy

- [ ] Task 3: Project creation form (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] 3.1 Create `pages/projects/CreateEditProject.tsx` — React Hook Form (NOT antd Form)
  - [ ] 3.2 Engagement Model select with `watch('engagementModel')` for conditional sections
  - [ ] 3.3 T&M section: repeatable team members with role + billing rate
  - [ ] 3.4 Fixed Cost section: contract value, end date, budget
  - [ ] 3.5 AMC section: contract value, SLA description
  - [ ] 3.6 Infrastructure section: vendor costs, manpower allocation
  - [ ] 3.7 Submit button with loading/disabled state
  - [ ] 3.8 Navigate to project detail on success

- [ ] Task 4: Project resubmission (AC: 8, 9)
  - [ ] 4.1 Pre-populate form with existing data for rejected projects
  - [ ] 4.2 Sequential API calls: PATCH then resubmit
  - [ ] 4.3 Rejection reason alert on detail page

- [ ] Task 5: Router integration
  - [ ] 5.1 Add `/projects/new` and `/projects/:id/edit` routes
  - [ ] 5.2 RoleGuard for Delivery Manager

- [ ] Task 6: Tests (AC: 1-10)
  - [ ] 6.1 Create `pages/projects/CreateEditProject.test.tsx`
  - [ ] 6.2 Test: Engagement model select shows correct sections
  - [ ] 6.3 Test: Submit disabled while loading
  - [ ] 6.4 Test: ProjectStatusBadge renders correct colours

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
### Debug Log References
### Completion Notes List
### File List

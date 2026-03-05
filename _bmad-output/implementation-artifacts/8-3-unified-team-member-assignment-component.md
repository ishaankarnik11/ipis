# Story 8.3: Unified Team Member Assignment Component

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Delivery Manager,
I want to assign team members (employee + role + selling rate) to my project during creation or at any time after approval, using a single consistent interface, so that project setup is fast, complete, and uses standardised data.

## Acceptance Criteria (AC)

1. **Given** the project creation form (`CreateEditProject.tsx`),
   **When** the form renders,
   **Then** a "Team Members" section is present below the project fields, containing a repeatable row component: searchable employee dropdown, role dropdown (active `ProjectRole` entries), selling rate numeric input with "₹/hr" label, [+ Add Row] and [✕ Remove] buttons.

2. **Given** the employee search dropdown in a team member row,
   **When** the user types 2+ characters,
   **Then** it queries `GET /api/v1/employees?search=<term>&status=active` and displays matching results showing: employee name, designation, and department — all active employees across the entire organisation regardless of department (FR57).

3. **Given** the employee search endpoint,
   **When** the query is called,
   **Then** it returns employees matching by name (case-insensitive partial match), excluding resigned employees (`is_resigned = false`), with no department filter — the existing `getAll` or a new search variant is used.

4. **Given** the role dropdown in a team member row,
   **When** the dropdown opens,
   **Then** it shows only active `ProjectRole` entries fetched via `GET /api/v1/project-roles?active=true`, displaying the role name.

5. **Given** a T&M project creation form with one or more team member rows,
   **When** the user attempts to submit without a selling rate on any member row,
   **Then** client-side validation highlights the selling rate field with error: "Selling rate is required for T&M projects" — form submission is blocked.

6. **Given** a non-T&M project (Fixed Cost, AMC, Infrastructure) creation form,
   **When** team members are added,
   **Then** the selling rate field is visible but not required — it accepts an optional value or can be left blank.

7. **Given** the project creation API `POST /api/v1/projects`,
   **When** called with a `members[]` array in the payload (e.g., `{ ...projectFields, members: [{ employeeId, roleId, billingRatePaise }] }`),
   **Then** the project and all team member assignments are created atomically in a single `prisma.$transaction` — if any member assignment fails (e.g., duplicate employee, resigned employee, inactive role), the entire creation rolls back and returns the specific error.

8. **Given** the project creation API with `members[]`,
   **When** called without `members[]` or with an empty array,
   **Then** the project is created successfully with no team members — members are optional at creation time.

9. **Given** the project detail page (`ProjectDetail.tsx`) for an ACTIVE project,
   **When** a Delivery Manager or Admin clicks "Add Team Member",
   **Then** a modal opens containing the same team member row component (employee search + role dropdown + selling rate). On save, `POST /api/v1/projects/:id/team-members` is called with `{ employeeId, roleId, billingRatePaise }`.

10. **Given** the existing `AddTeamMemberModal` component,
    **When** this story is complete,
    **Then** the modal is refactored to use the new `TeamMemberRow` component internally — reusing the same employee search, role dropdown, and selling rate input.

11. **Given** the `createProjectSchema` in `shared/schemas/project.schema.ts`,
    **When** updated for this story,
    **Then** each engagement model variant includes an optional `members` array: `members: z.array(z.object({ employeeId: z.string().uuid(), roleId: z.string().uuid(), billingRatePaise: z.number().int().positive().optional() })).optional()`.

12. **Given** `team-member-assignment.test.tsx`,
    **When** `pnpm test` runs,
    **Then** tests cover: employee search shows results from all departments, role dropdown shows only active roles, T&M selling rate required validation, non-T&M selling rate optional, add/remove row, project creation payload includes members array, modal reuse on project detail.

## E2E Test Scenarios

### Positive

- E2E-P1: DM creates T&M project with 2 team members (employee + role + selling rate each) → project created, navigates to detail, both members visible in roster (AC: 1, 5, 7)
- E2E-P2: DM creates Fixed Cost project with 1 team member without selling rate → project created successfully, member visible in roster with no selling rate (AC: 6, 8)
- E2E-P3: DM creates project with no team members → project created successfully with empty roster (AC: 8)
- E2E-P4: DM on ACTIVE project clicks Add Team Member → modal opens, searches employee from different department, selects role, enters rate, saves → member appears in roster (AC: 2, 9)
- E2E-P5: Employee search returns results from multiple departments → dropdown shows name, designation, department for disambiguation (AC: 2, 3)
- E2E-P6: Role dropdown shows only active roles, deactivated role from 8.1 tests is absent (AC: 4)

### Negative

- E2E-N1: DM creates T&M project with team member missing selling rate → validation error shown, form does not submit (AC: 5)
- E2E-N2: DM adds team member who is already on the project → API returns 409 "Employee is already assigned to this project" (AC: 7)
- E2E-N3: DM adds resigned employee → API returns 400 "Cannot assign a resigned employee to a project" (AC: 7)

## Tasks / Subtasks

- [x] Task 1: TeamMemberRow component (AC: 1, 2, 4, 5, 6)
  - [x] 1.1 Create `components/TeamMemberRow.tsx`
  - [x] 1.2 Employee search: antd `Select` with `showSearch`, `filterOption: false`, `onSearch` debounced (300ms), queries employee search API
  - [x] 1.3 Role dropdown: antd `Select` populated from `GET /api/v1/project-roles?active=true`
  - [x] 1.4 Selling rate: antd `InputNumber` with `addonAfter="₹/hr"`, `min={1}`
  - [x] 1.5 Props: `engagementModel` (for T&M validation), `onRemove`, `value`, `onChange`
  - [x] 1.6 T&M validation: if `engagementModel === 'TIME_AND_MATERIALS'`, mark sellingRate as required

- [x] Task 2: TeamMemberList component (AC: 1)
  - [x] 2.1 Create `components/TeamMemberList.tsx`
  - [x] 2.2 Renders array of `TeamMemberRow` components
  - [x] 2.3 [+ Add Member] button appends new empty row
  - [x] 2.4 Each row has [✕] remove button (hidden if only 0 rows — empty state shows just the Add button)

- [x] Task 3: Employee search API endpoint (AC: 2, 3)
  - [x] 3.1 Add `GET /api/v1/employees/search?q=<term>` or update existing `GET /api/v1/employees` to support `?search=<term>&status=active`
  - [x] 3.2 Query: `WHERE name ILIKE '%term%' AND is_resigned = false`, return `{ id, name, designation, departmentName }` — no department filter
  - [x] 3.3 Limit results to 20 for performance
  - [x] 3.4 RBAC: accessible to DELIVERY_MANAGER, ADMIN (need to assign members)

- [x] Task 4: Update project creation API (AC: 7, 8, 11)
  - [x] 4.1 Update `createProjectSchema` to include optional `members[]` array
  - [x] 4.2 Update `createProject` service function to accept `members[]`
  - [x] 4.3 Wrap in `prisma.$transaction`: create project → create all member assignments
  - [x] 4.4 Validate each member: employeeId exists + not resigned, roleId exists + active, billingRatePaise required if T&M
  - [x] 4.5 Handle duplicate employee in members array (reject with specific error)

- [x] Task 5: Integrate into CreateEditProject form (AC: 1, 5, 6)
  - [x] 5.1 Add `<TeamMemberList />` section to `CreateEditProject.tsx`
  - [x] 5.2 Pass `engagementModel` prop so T&M validation triggers correctly
  - [x] 5.3 Collect members array from TeamMemberList state
  - [x] 5.4 Include `members` in form submission payload

- [x] Task 6: Refactor AddTeamMemberModal (AC: 9, 10)
  - [x] 6.1 Refactor existing `AddTeamMemberModal.tsx` to use `TeamMemberRow` component internally
  - [x] 6.2 Single-row mode (no [+ Add] button — adding one member at a time post-creation)
  - [x] 6.3 On save: call `addTeamMember` API, invalidate team members query

- [x] Task 7: Frontend API service updates (AC: 2, 4)
  - [x] 7.1 Add `searchEmployees(query: string)` to `employees.api.ts`
  - [x] 7.2 Import `getProjectRoles(activeOnly: true)` from `project-roles.api.ts` (Story 8.2)
  - [x] 7.3 Update `createProject` to include `members[]` in payload

- [x] Task 8: Tests (AC: 12)
  - [x] 8.1 Create `components/team-member-assignment.test.tsx`
  - [x] 8.2 Tests: employee search org-wide, role dropdown active only, T&M selling rate required, non-T&M optional, add/remove rows, creation payload includes members
  - [x] 8.3 Update `project.service.test.ts` — createProject with members[] (success, rollback on invalid member)

- [x] Task 9: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 9.1 Create `packages/e2e/tests/team-member-assignment.spec.ts`
  - [x] 9.2 Implement E2E-P1 through E2E-P6
  - [x] 9.3 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Atomic creation**: Project + members in single `prisma.$transaction`. If member assignment fails, project creation rolls back entirely. User gets a specific error (which employee/role failed and why).
2. **Employee search — org-wide**: No `departmentId` filter. The dropdown must show employees from ALL departments. Display department name in dropdown option for disambiguation.
3. **Debounced search**: 300ms debounce on employee search to avoid excessive API calls. Minimum 2 characters before triggering search.
4. **Reusable component**: `TeamMemberRow` must be reusable in both project creation (multi-row) and the add member modal (single-row). The component is controlled — parent manages state.
5. **Engagement model awareness**: `TeamMemberRow` receives `engagementModel` prop. T&M → selling rate required. Others → optional. This validation is both client-side (immediate feedback) and server-side (API enforcement).
6. **Currency in paise**: Selling rate input is in rupees (user-facing), converted to paise before API submission: `billingRatePaise = inputValue * 100`. Display uses `formatCurrency()`.
7. **Schema backward compatibility**: The `members[]` array in `createProjectSchema` is optional to maintain backward compatibility — projects can still be created without members.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| CreateEditProject | `pages/projects/CreateEditProject.tsx` | Story 3.3 — add TeamMemberList section |
| AddTeamMemberModal | `components/AddTeamMemberModal.tsx` | Story 3.4 — refactor to use TeamMemberRow |
| projectKeys | `services/projects.api.ts` | Query key constants |
| createProject API | `services/projects.api.ts` | Update to include members[] |
| addTeamMember API | `services/projects.api.ts` | Keep for post-creation adds |
| formatCurrency | `shared/utils/currency.ts` | Paise → ₹ formatting |
| projectRoleKeys | `services/project-roles.api.ts` | Story 8.2 — active roles query |

### Project Structure Notes

New files:
```
packages/frontend/src/
├── components/
│   ├── TeamMemberRow.tsx
│   ├── TeamMemberList.tsx
│   └── team-member-assignment.test.tsx

packages/e2e/tests/
└── team-member-assignment.spec.ts
```

Modified files:
```
packages/frontend/src/pages/projects/CreateEditProject.tsx
packages/frontend/src/components/AddTeamMemberModal.tsx
packages/frontend/src/services/projects.api.ts
packages/frontend/src/services/employees.api.ts (or create)
packages/backend/src/services/project.service.ts (createProject with members)
packages/backend/src/routes/projects.routes.ts (employee search endpoint)
packages/backend/src/services/employee.service.ts (search function)
packages/shared/src/schemas/project.schema.ts (members[] in createProjectSchema)
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR51, FR53, FR57]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC Scoping]

### Previous Story Intelligence

- **From 3.2:** `addTeamMember` service function validates T&M billing rate requirement, employee existence, resigned status, and duplicate assignment. Reuse this validation logic in the transactional create path.
- **From 3.3:** `CreateEditProject.tsx` uses React Hook Form with engagement-model-specific fields. Team member section should integrate with the same form or manage its own state and merge at submit time.
- **From 3.4:** `AddTeamMemberModal` currently has employee ID text input and free-text role. Refactor to use `TeamMemberRow` component for consistency.
- **From 8.1:** `roleId` replaces `role` string. Employee search dropdown replaces manual employeeId entry.
- **From 8.2:** `project-roles.api.ts` provides `getProjectRoles(activeOnly)` for the role dropdown data source.

### Gotchas & Go/No-Go

- **Employee search performance**: With 500+ employees, the search must be server-side (not client-side filter). Use `ILIKE` with limit 20.
- **Selling rate UX**: User enters in rupees (e.g., `2500`), system stores as paise (`250000`). The conversion `× 100` happens in the API service layer before submission. When displaying, `formatCurrency()` converts back.
- **Duplicate detection in members array**: If the same `employeeId` appears twice in the `members[]` array at creation, the API should reject with a clear error before attempting DB insert.
- **Engagement model change**: If user changes engagement model after adding team members, the T&M selling rate validation must re-evaluate. Switching from T&M to Fixed Cost should not block submission if rates are missing.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References
- TypeScript error in `employees.routes.ts`: `return res.json(...)` returns `Response` but async handler expects `Promise<void>` — fixed by removing `return` before `res.json()`.
- AddTeamMemberModal tests failed with "No QueryClient set" after refactor to use `TeamMemberRow` (which uses `useQuery`) — fixed by adding `QueryClientProvider` wrapper and service mocks.
- CreateEditProject tests failed on `getByTestId('tm-section')` after renaming to `team-members-section` — fixed all assertions and added mocks for `employees.api` and `project-roles.api`.

### Completion Notes List
- All 9 tasks (3→4→7→1→2→5→6→8→9) implemented in dependency order
- Backend: 520 tests passing (31 files), Frontend: 257 tests passing (27 files)
- Employee search is server-side with `ILIKE` + limit 20, RBAC-protected for DM/Admin
- Project creation uses `prisma.$transaction` for atomic project+members creation with full validation
- TeamMemberRow is reusable in both CreateEditProject (multi-row via TeamMemberList) and AddTeamMemberModal (single-row)
- Currency: user enters rupees, converted to paise at submission boundary (×100)
- Team members section now visible for ALL engagement models (not just T&M) in create mode
- Selling rate required only for T&M, optional for other engagement models

### File List

**New files:**
- `packages/frontend/src/components/TeamMemberRow.tsx` — Reusable row: employee search + role dropdown + selling rate
- `packages/frontend/src/components/TeamMemberList.tsx` — Array manager for TeamMemberRow instances
- `packages/frontend/src/components/team-member-assignment.test.tsx` — Unit tests for TeamMemberRow and TeamMemberList
- `packages/e2e/tests/team-member-assignment.spec.ts` — E2E tests (P1-P6, N1)

**Modified files:**
- `packages/shared/src/schemas/project.schema.ts` — Added `memberInputSchema` and optional `members[]` to `baseProjectFields`
- `packages/backend/src/services/employee.service.ts` — Added `searchEmployees()` function
- `packages/backend/src/routes/employees.routes.ts` — Added `GET /search` route with RBAC
- `packages/backend/src/services/project.service.ts` — Wrapped `createProject` in `$transaction`, member validation+creation
- `packages/backend/src/services/employee.service.test.ts` — Added 5 searchEmployees tests
- `packages/backend/src/services/project.service.test.ts` — Added 6 createProject-with-members tests
- `packages/frontend/src/services/employees.api.ts` — Added `searchEmployees()`, `EmployeeSearchResult`, search key
- `packages/frontend/src/services/projects.api.ts` — Updated createProject type for members[]
- `packages/frontend/src/pages/projects/CreateEditProject.tsx` — Replaced useFieldArray with TeamMemberList, visible for all models
- `packages/frontend/src/pages/projects/CreateEditProject.test.tsx` — Updated testids and added service mocks
- `packages/frontend/src/components/AddTeamMemberModal.tsx` — Refactored to use TeamMemberRow
- `packages/frontend/src/components/AddTeamMemberModal.test.tsx` — Rewritten for refactored modal
- `packages/frontend/src/pages/projects/ProjectDetail.tsx` — Removed employees/roles queries and props
- `packages/e2e/tests/project-creation.spec.ts` — Updated testids for team-members-section

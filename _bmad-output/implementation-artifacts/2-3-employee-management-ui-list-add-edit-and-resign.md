# Story 2.3: Employee Management UI — List, Add, Edit & Resign

Status: ready-for-dev

## Story

As an HR user,
I want to view the employee list, add individual employees, edit their details, and mark them as resigned through the application,
so that I can maintain accurate employee records without requiring database access.

## Acceptance Criteria (AC)

1. **Given** an authenticated HR user navigates to `/employees`,
   **When** the Employee List page renders,
   **Then** all employees are displayed in an antd `Table` (`size="small"`) with columns: Employee Code, Name, Designation, Department, Billable (Yes/No), Status (`Active` / `Resigned` badge) — `annualCtcPaise` is not shown to HR in the table.

2. **Given** an authenticated Finance or Admin user navigates to `/employees`,
   **When** the Employee List page renders,
   **Then** an Annual CTC column is additionally visible, values formatted via `formatCurrency()` (e.g., `"₹8,40,000"`), right-aligned with `tabular-nums`.

3. **Given** the Employee List page,
   **When** HR clicks "Add Employee",
   **Then** an antd `Modal` opens with antd `Form` fields: Employee Code (required), Name (required), Department `Select` (required), Designation (required), Annual CTC `InputNumber` with `prefix="₹"` (required, positive integer only), Joining Date `DatePicker`, Billable checkbox (default checked).

4. **Given** the Add Employee form is submitted with valid data,
   **When** `POST /api/v1/employees` succeeds,
   **Then** the Modal closes, TanStack Query invalidates `['employees']`, the table refreshes, and a `Notification` confirms: "Employee [name] added successfully".

5. **Given** an active employee row,
   **When** HR clicks "Edit",
   **Then** the same Modal opens pre-populated with current data; on save, `PATCH /api/v1/employees/:id` is called; form validates Annual CTC as a positive number on blur.

6. **Given** an active employee row,
   **When** HR clicks "Mark as Resigned" and confirms the confirmation `Modal` ("Mark [name] as resigned? This cannot be undone."),
   **Then** `PATCH /api/v1/employees/:id/resign` is called; the row's Status badge updates to "Resigned"; the Edit and Mark as Resigned actions disappear for that row.

7. **Given** the employee list,
   **When** HR types in the Search input above the table,
   **Then** the table filters instantly (debounced 300ms) by Employee Code or Name — no search button required.

8. **Given** form validation on any required field,
   **When** the user blurs a required field left empty,
   **Then** an inline error message appears below the field — validation fires on blur, not on keystroke.

## Tasks / Subtasks

- [ ] Task 1: API client functions (AC: 1, 4, 5, 6)
  - [ ] 1.1 Create `services/employees.api.ts` — `getAll()`, `create(data)`, `update(id, data)`, `resign(id)`
  - [ ] 1.2 Define query keys: `employeeKeys = { all: ['employees'] as const, detail: (id) => ['employees', id] as const }`
  - [ ] 1.3 Export query keys as constants — never inline in components

- [ ] Task 2: Employee List page (AC: 1, 2, 7)
  - [ ] 2.1 Create `pages/employees/EmployeeList.tsx`
  - [ ] 2.2 antd `Table` with `size="small"`, columns: Employee Code, Name, Designation, Department, Billable, Status
  - [ ] 2.3 Conditional CTC column: visible only if `useAuth()` returns Finance or Admin role; formatted via `formatCurrency()`, right-aligned, `tabular-nums`
  - [ ] 2.4 Status column: antd `Tag` — green "Active" / red "Resigned"
  - [ ] 2.5 Action buttons visible on row hover: Edit, Mark as Resigned (only for active employees)
  - [ ] 2.6 Search input above table: debounced 300ms, filters by employeeCode or name (client-side filter)

- [ ] Task 3: Add/Edit Employee Modal (AC: 3, 4, 5, 8)
  - [ ] 3.1 Create `pages/employees/EmployeeFormModal.tsx` — antd `Modal` + `Form`
  - [ ] 3.2 Fields: Employee Code (required, disabled on edit), Name (required), Department Select (required, fetched from GET /api/v1/departments), Designation (required), Annual CTC InputNumber with ₹ prefix (required, positive integer), Joining Date DatePicker, Billable Checkbox (default: true)
  - [ ] 3.3 On blur validation for required fields
  - [ ] 3.4 On submit: POST (create) or PATCH (edit), close modal, invalidate `['employees']`, show Notification

- [ ] Task 4: Resign confirmation (AC: 6)
  - [ ] 4.1 Resign button opens antd `Modal.confirm` with message "Mark [name] as resigned? This cannot be undone."
  - [ ] 4.2 On confirm: call `PATCH /api/v1/employees/:id/resign`, invalidate `['employees']`
  - [ ] 4.3 After resign: Edit and Resign actions disappear for that row

- [ ] Task 5: Route + navigation (AC: 1)
  - [ ] 5.1 Add `/employees` route in `router/index.tsx`
  - [ ] 5.2 Add "Employees" to sidebar navigation for HR, Admin, Finance roles
  - [ ] 5.3 Add `RoleGuard` for employee pages

- [ ] Task 6: Tests (AC: 1-8)
  - [ ] 6.1 Create `pages/employees/EmployeeList.test.tsx`
  - [ ] 6.2 Test: HR sees table without CTC column
  - [ ] 6.3 Test: Finance sees table with CTC column formatted correctly
  - [ ] 6.4 Test: Add Employee modal opens with correct fields
  - [ ] 6.5 Test: Edit modal pre-populates data
  - [ ] 6.6 Test: Resign confirmation modal appears
  - [ ] 6.7 Test: Search filters table by name/code
  - [ ] 6.8 Test: Required field blur validation

## Dev Notes

### Architecture Constraints (MUST follow)

1. **TanStack Query for all server state**: Use `useQuery` and `useMutation` — never manual `useState` for API data.
2. **Query keys as constants**: Defined in `employees.api.ts`, never inline.
3. **antd v6**: Use ConfigProvider token system. All tables `size="small"` (38px rows).
4. **formatCurrency()**: Import from `@bmad101/shared` — never ad-hoc `toLocaleString()`.
5. **Right-aligned numeric columns**: CTC column right-aligned with `font-variant-numeric: tabular-nums`.
6. **Role-based column visibility**: Check `useAuth()` role in component — show CTC only for Finance/Admin.
7. **Frontend guards are UX only**: `RoleGuard` redirects, but API RBAC is the actual security.
8. **antd Form for standard forms**: Employee add/edit uses antd `Form` (NOT React Hook Form).
9. **Validation on blur**: antd Form `validateTrigger="onBlur"` for required fields.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 — provides user role |
| api.ts | `services/api.ts` | Story 1.3 — fetch wrapper |
| auth.api.ts | `services/auth.api.ts` | Story 1.3 — auth API functions |
| RoleGuard | `router/guards.tsx` | Story 1.3 — role-based route guard |
| Router | `router/index.tsx` | Story 1.3 — add new routes here |
| App layout | `layouts/` | Story 1.3 — sidebar navigation |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 — paise → ₹ formatting |
| Theme config | `theme/index.ts` | Story 1.1 — antd v6 tokens |
| QueryClient | `main.tsx` | Story 1.3 — TanStack Query provider |

### API Endpoints Used

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/v1/employees` | Story 2.2 — returns employees, CTC filtered by role |
| POST | `/api/v1/employees` | Story 2.2 — create individual employee |
| PATCH | `/api/v1/employees/:id` | Story 2.2 — update employee fields |
| PATCH | `/api/v1/employees/:id/resign` | Story 2.2 — mark as resigned |
| GET | `/api/v1/departments` | Story 1.4 — department list for Select dropdown |

### New Dependencies Required

None — antd, TanStack Query, React Router all already installed.

### Project Structure Notes

New files to create:
```
packages/frontend/src/
├── pages/
│   └── employees/
│       ├── EmployeeList.tsx           # Main employee list page
│       ├── EmployeeList.test.tsx      # Component tests
│       └── EmployeeFormModal.tsx      # Add/Edit modal
├── services/
│   └── employees.api.ts              # API functions + query keys
```

Existing files to modify:
```
packages/frontend/src/router/index.tsx   # Add /employees route
packages/frontend/src/layouts/           # Add Employees nav item for HR/Admin/Finance
```

### Testing Strategy

- **Component tests** (Vitest + React Testing Library): Table rendering, modal interactions, search filtering
- **Role-based tests**: HR sees no CTC column, Finance sees CTC column
- **Interaction tests**: Form submission, validation on blur, resign confirmation
- **Co-located test files**: `*.test.tsx` next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, TanStack Query, antd Form]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Table conventions, form patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14, FR15, FR16]

### Previous Story Intelligence (from Stories 2.1, 2.2)

- **From 2.1:** Employee model and bulk upload API complete. employee.schema.ts has Zod schemas.
- **From 2.2:** Individual CRUD endpoints complete. GET /employees returns CTC for Finance/Admin, omits for HR.
- **From 1.3:** useAuth hook, RoleGuard, router, sidebar layout all established. Follow same patterns.
- **From 1.5:** User management UI pattern: antd Table + Modal + Form for CRUD. Follow same approach.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

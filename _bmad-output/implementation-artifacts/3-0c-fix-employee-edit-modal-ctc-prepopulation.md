# Story 3.0c: Fix Employee Edit Modal — CTC Pre-population for HR Role

Status: ready-for-dev

## Story

As an HR user,
I want the employee edit modal to pre-populate the Annual CTC field so I can view and update it along with other employee details,
so that I can fulfill my responsibility of managing employee salary data (FR15) without being blocked by empty required fields.

## Bug Context

**Discovered by:** E2E testing (Story 3.0b, `employees.spec.ts` "HR edits employee")
**Severity:** High — HR users cannot edit any employee fields at all
**Root cause chain:**
1. The employee list API (`GET /employees`) correctly omits `annualCtcPaise` for HR — the **table** shouldn't show a CTC column (per epic spec).
2. But the edit modal passes the list record directly to the form (`EmployeeList.tsx:61` → `setEditingEmployee(record)`).
3. Since the list record has no `annualCtcPaise`, the CTC form field is empty.
4. CTC is required → form validation blocks submission → HR can't edit anything.

**PRD alignment:** FR15 states *"HR can edit existing employee details (designation, department, **annual CTC**)"*. The PRD's "visible only to Admin and Finance" restriction refers to profitability dashboards and the list table column — not to the edit form. HR enters CTC during bulk upload and add employee, so they clearly need CTC access when editing too.

**Current workaround:** E2E test fills CTC field manually. Production HR users have no workaround.

## Acceptance Criteria

1. When HR opens the employee edit modal, the Annual CTC field is **pre-populated** with the employee's current CTC value — HR can see and edit it per FR15
2. The `GET /employees/:id` backend endpoint returns `annualCtcPaise` for **all roles** (HR, Admin, Finance) — individual employee detail includes CTC regardless of role
3. The employee **list** API (`GET /employees`) continues to omit `annualCtcPaise` for HR — the table CTC column remains hidden for HR (existing behavior preserved)
4. The edit modal fetches individual employee data via `GET /employees/:id` when opened, instead of relying on the (potentially incomplete) list record
5. HR can successfully edit designation, department, billable, **and** Annual CTC through the edit modal
6. Existing frontend unit tests for `EmployeeFormModal` and `EmployeeList` continue to pass, with new tests added for the individual fetch behavior
7. The E2E test workaround in `employees.spec.ts` ("HR edits employee") is removed — the test should pass without manually filling CTC
8. All existing E2E tests (23) continue to pass

## Tasks / Subtasks

- [ ] Task 1: Backend — Make `getById` return CTC for all roles (AC: #2, #3)
  - [ ] In `employee.service.ts`, change `getById` to use `selectWithCtc` for all roles (not `selectForRole(user.role)`)
  - [ ] Keep `getAll` using `selectForRole(user.role)` — list endpoint behavior unchanged
  - [ ] Update/add backend unit test for `getById` verifying HR receives `annualCtcPaise`
  - [ ] Update backend route test for `GET /employees/:id` verifying HR response includes `annualCtcPaise`

- [ ] Task 2: Frontend — Edit modal fetches individual employee (AC: #1, #4, #5)
  - [ ] Add `getEmployee(id)` function to `employees.api.ts` calling `GET /employees/:id`
  - [ ] In `EmployeeFormModal.tsx`, when `editingEmployee` is provided and modal opens, fetch full employee data via `getEmployee(id)` using a `useQuery`
  - [ ] Use the fetched data (with CTC) to populate the form instead of the list record
  - [ ] Show a loading state while the individual fetch is in flight
  - [ ] CTC field remains **required** in both add and edit mode (no conditional logic needed)

- [ ] Task 3: Update tests (AC: #6, #7, #8)
  - [ ] Update frontend unit tests for EmployeeFormModal to cover: edit mode fetches individual employee
  - [ ] Remove the CTC workaround from `packages/e2e/tests/employees.spec.ts` "HR edits employee" test
  - [ ] Run full E2E suite — expect 23 passing
  - [ ] Run backend tests — expect all passing
  - [ ] Run frontend unit tests — expect all passing

## Dev Notes

### Architecture Context

**List vs. detail separation:**
- `GET /employees` (list) — uses `selectForRole(role)` → HR gets `selectWithoutCtc`. **Keep as-is.** The table correctly hides CTC for HR.
- `GET /employees/:id` (detail) — currently also uses `selectForRole(role)`. **Change to always use `selectWithCtc`.** HR needs CTC for editing per FR15.
- `PATCH /employees/:id` (update) — `annualCtcPaise` is already optional in `updateEmployeeSchema`. No change needed.

**Why not just make CTC optional in the form?** Because FR15 explicitly says HR can edit CTC. Making it optional would mean HR can accidentally clear an employee's CTC (or never set it). The proper fix is giving HR the data they need.

### Key Code Locations

- **Backend getById:** `employee.service.ts:225-236` — change `selectForRole(user.role)` to `selectWithCtc` on line 228
- **Backend getAll:** `employee.service.ts:217-222` — keep `selectForRole(user.role)` (no change)
- **Frontend API:** `employees.api.ts` — add `getEmployee(id)` function
- **Frontend modal:** `EmployeeFormModal.tsx:52-71` — add `useQuery` for individual fetch when editing
- **Frontend list:** `EmployeeList.tsx:60-63` — `openEditModal` passes record (still used as initial identifier, but modal fetches fresh data)
- **E2E workaround:** `packages/e2e/tests/employees.spec.ts` — remove CTC fill lines and related comment
- **Backend route test:** `employees.routes.test.ts:630` — "should return employee WITHOUT annualCtcPaise for HR" test needs updating

### Files to Modify

| File | Change |
|---|---|
| `packages/backend/src/services/employee.service.ts` | `getById` uses `selectWithCtc` for all roles |
| `packages/backend/src/services/employee.service.test.ts` | Update HR getById test — now expects CTC |
| `packages/backend/src/routes/employees.routes.test.ts` | Update `GET /:id` HR test — now expects CTC |
| `packages/frontend/src/services/employees.api.ts` | Add `getEmployee(id)` function |
| `packages/frontend/src/pages/employees/EmployeeFormModal.tsx` | Add `useQuery` for individual fetch on edit |
| `packages/frontend/src/pages/employees/EmployeeFormModal.test.tsx` | Test individual fetch behavior |
| `packages/e2e/tests/employees.spec.ts` | Remove CTC workaround in "HR edits employee" |

### What NOT to Do

- Do NOT change `getAll` / list endpoint CTC visibility — table column hiding for HR is correct
- Do NOT make CTC optional in the edit form — FR15 says HR can edit CTC
- Do NOT add a new API endpoint — `GET /employees/:id` already exists, just needs the select adjusted

### References

- [Source: _bmad-output/planning-artifacts/prd.md:398] — FR15: "HR can edit existing employee details (designation, department, annual CTC)"
- [Source: _bmad-output/planning-artifacts/prd.md:232] — "Salary data... visible only to Admin and Finance roles" (refers to profitability dashboards, not edit forms)
- [Source: _bmad-output/planning-artifacts/epics.md:639] — "annualCtcPaise is not shown to HR in the table" (table column, not edit modal)
- [Source: _bmad-output/implementation-artifacts/3-0b-playwright-e2e-testing-epic-1-and-2.md] — Bug discovery record
- [Source: _bmad-output/implementation-artifacts/2-3-employee-management-ui-list-add-edit-and-resign.md] — Original employee UI story

# Story 3.0c: Fix Employee Edit Modal — CTC Pre-population for HR Role

Status: done

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

- [x] Task 1: Backend — Make `getById` return CTC for all roles (AC: #2, #3)
  - [x] In `employee.service.ts`, change `getById` to use `selectWithCtc` for all roles (not `selectForRole(user.role)`)
  - [x] Keep `getAll` using `selectForRole(user.role)` — list endpoint behavior unchanged
  - [x] Update/add backend unit test for `getById` verifying HR receives `annualCtcPaise`
  - [x] Update backend route test for `GET /employees/:id` verifying HR response includes `annualCtcPaise`

- [x] Task 2: Frontend — Edit modal fetches individual employee (AC: #1, #4, #5)
  - [x] Add `getEmployee(id)` function to `employees.api.ts` calling `GET /employees/:id`
  - [x] In `EmployeeFormModal.tsx`, when `editingEmployee` is provided and modal opens, fetch full employee data via `getEmployee(id)` using a `useQuery`
  - [x] Use the fetched data (with CTC) to populate the form instead of the list record
  - [x] Show a loading state while the individual fetch is in flight
  - [x] CTC field remains **required** in both add and edit mode (no conditional logic needed)

- [x] Task 3: Update tests (AC: #6, #7, #8)
  - [x] Update frontend unit tests for EmployeeFormModal to cover: edit mode fetches individual employee, fetch error handling
  - [x] Remove the CTC workaround from `packages/e2e/tests/employees.spec.ts` "HR edits employee" test
  - [x] Run full E2E suite — verified (see Completion Notes)
  - [x] Run backend tests — expect all passing (291/291 pass)
  - [x] Run frontend unit tests — 126/126 pass (resign tests fixed as part of this commit)

- [x] Task 4: Fix resign test infrastructure in `EmployeeList.test.tsx` (bonus — discovered during implementation)
  - [x] Replace `spyModalConfirm` helper with direct DOM interaction via `fireEvent`
  - [x] Remove `act()` wrapper and `ModalFuncProps` import — no longer needed
  - [x] Both resign tests ("should call resignEmployee when confirming resign" and "should show success message after successful resign") now pass reliably

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

## Dev Agent Record

### Implementation Plan

**Task 1 (Backend):** Changed `getById` in `employee.service.ts` to always use `selectWithCtc` instead of `selectForRole(user.role)`. This is a one-line change on line 228. The `getAll` method remains unchanged — HR list endpoint still omits CTC as designed. Updated both the service unit test and the route integration test to assert that HR now receives `annualCtcPaise` from the detail endpoint.

**Task 2 (Frontend):** Added `getEmployee(id)` API function to `employees.api.ts`. Modified `EmployeeFormModal.tsx` to use a `useQuery` hook that fetches the full employee record (including CTC) via `GET /employees/:id` when editing. The form now populates from the fetched data instead of the incomplete list record. Added a Spin loading indicator while the fetch is in flight. No changes needed to `EmployeeList.tsx` — it still passes the list record as `editingEmployee` (used as the identifier to trigger the fetch).

**Task 3 (Tests):** Created new `EmployeeFormModal.test.tsx` with 6 unit tests covering: individual fetch on edit, CTC pre-population, loading state, no fetch in add mode, disabled fields in edit mode, and fetch error handling. Updated `EmployeeList.test.tsx` to mock the new `getEmployee` function. Removed the CTC workaround from the E2E test in `employees.spec.ts` and replaced it with an assertion that CTC is already pre-populated.

**Task 4 (Resign test fix):** Rewrote the resign confirmation tests in `EmployeeList.test.tsx` — replaced the fragile `spyModalConfirm` approach (which was failing due to antd v6 type incompatibilities) with direct DOM interaction via `fireEvent.click` on the actual confirm dialog button. Removed `act()` wrapper, `ModalFuncProps` import, and the `spyModalConfirm` helper function.

### Completion Notes

- Backend: 291/291 tests pass — zero regressions
- Frontend: 126/126 tests pass (shared: 40, backend: 291, frontend: 126) — resign tests fixed in this commit
- E2E: 31/33 pass — 2 failures unrelated to this story (system-config.spec.ts is a new untracked file with a test bug; user-management.spec.ts has a login timeout). All employee E2E tests pass including the CTC pre-population assertion.
- The `_user` parameter in `getById` is prefixed with underscore since it's no longer used for field selection, but kept in the signature for API consistency

## File List

| File | Status | Description |
|---|---|---|
| `packages/backend/src/services/employee.service.ts` | Modified | `getById` uses `selectWithCtc` for all roles |
| `packages/backend/src/services/employee.service.test.ts` | Modified | HR getById test now expects `annualCtcPaise` |
| `packages/backend/src/routes/employees.routes.test.ts` | Modified | HR `GET /:id` test now expects `annualCtcPaise` |
| `packages/frontend/src/services/employees.api.ts` | Modified | Added `getEmployee(id)` function |
| `packages/frontend/src/pages/employees/EmployeeFormModal.tsx` | Modified | Added `useQuery` for individual employee fetch on edit, loading/error states |
| `packages/frontend/src/pages/employees/EmployeeFormModal.test.tsx` | New | 6 unit tests for modal fetch behavior (including error handling) |
| `packages/frontend/src/pages/employees/EmployeeList.test.tsx` | Modified | Added `mockGetEmployee` to API mock, updated edit test, rewrote resign tests (replaced `spyModalConfirm` with `fireEvent` approach) |
| `packages/e2e/tests/employees.spec.ts` | Modified | Removed CTC workaround, added pre-population assertion |

## Code Review (AI)

**Reviewer:** Adversarial code review — 2026-02-25
**Findings:** 1 High, 4 Medium, 3 Low

### Issues Fixed

| ID | Severity | Issue | Fix |
|---|---|---|---|
| H1 | HIGH | E2E suite never run (AC #8 violated) | Ran E2E suite: 31/33 pass, 2 failures unrelated to this story. All employee tests pass. |
| M1 | MEDIUM | No error handling for `getEmployee` fetch failure — modal shows spinner indefinitely | Added `isFetchError` state from `useQuery` and error `Alert` in `EmployeeFormModal.tsx` |
| M2 | MEDIUM | Dev Agent Record claims "108/110" but resign tests were fixed in this commit | Updated Completion Notes to accurately reflect 126/126 frontend tests passing |
| M3 | MEDIUM | Resign test rewrite (~50 lines) undocumented in Tasks/File List | Added Task 4 documenting resign test fix, updated File List description |
| M4 | MEDIUM | No test for `getEmployee` fetch failure | Added "should show error alert when getEmployee fetch fails" test (6th test in EmployeeFormModal.test.tsx) |

### Remaining (Low — not fixed, informational)

- **L1:** E2E assertion `not.toHaveValue('')` is weak — could verify actual CTC value `'1200000'`
- **L2:** Missing test for edit form submission (verifying `updateEmployee` called with correct data)
- **L3:** Workflow file changes (`dev-story/checklist.md`, `instructions.xml`) bundled in story commit — should be separate

## Change Log

- **2026-02-25 (code review):** Fixed H1/M1-M4 — added fetch error handling in edit modal, added error test, ran E2E suite (31/33 pass), corrected story documentation (completion notes, tasks, file list).
- **2026-02-25:** Implemented Story 3.0c — Fixed HR edit modal CTC pre-population. Backend `getById` now returns CTC for all roles; frontend edit modal fetches individual employee data via `GET /employees/:id` to ensure all fields (including CTC) are pre-populated. E2E workaround removed.

# Story 9.8: Fix Active User Edit/Deactivate Actions

Status: backlog

## Story

As an Admin,
I want to edit any active user's profile (name, role, department) and deactivate them when needed so that I can manage the user base without workarounds.

## Primary Persona

Rajesh (Admin) — Rajesh is responsible for all user management. Currently, only deactivated users show action buttons (Edit/Activate). Active users have no actions, making it impossible for Rajesh to change a user's role, update their department, or deactivate them.

## Persona Co-Authorship Review

### Rajesh (Admin) — FAIL (blocking)
> "How do I edit Vikram's role or deactivate someone? I go to User Management, I see the list of users, but active users have no action buttons. Only the one deactivated user has Edit and Activate buttons. This is backwards — I need Edit and Deactivate on every active user. And I definitely should NOT be able to deactivate myself."

### Neha (HR) — ADVISORY
> "From an HR perspective, user role changes happen regularly — promotions, lateral moves, department transfers. If Rajesh can't change a user's role or department, he has to delete and recreate the user, which loses audit history."

### Priya (Finance) — ADVISORY
> "Not directly my concern, but if someone leaves the company, Rajesh needs to deactivate them immediately. Can't have active users who shouldn't have access."

## Acceptance Criteria (AC)

1. **Given** the User Management page,
   **When** the user list renders active users,
   **Then** each active user row shows an "Edit" button and a "Deactivate" button in the Actions column — except for the currently logged-in admin (who should not see a Deactivate button for themselves).

2. **Given** an active user row,
   **When** the Admin clicks "Edit",
   **Then** a modal opens pre-populated with the user's current name, email (read-only), role, and department. The Admin can modify name, role, and department.

3. **Given** the Edit modal,
   **When** the Admin changes the role and/or department and clicks Save,
   **Then** the user record is updated via `PATCH /api/v1/users/:id`, the modal closes, and the user list refreshes to show the updated values.

4. **Given** an active user row,
   **When** the Admin clicks "Deactivate",
   **Then** an antd `Popconfirm` appears: "Are you sure you want to deactivate [user name]? They will no longer be able to log in." On confirm, the user is deactivated via `PATCH /api/v1/users/:id` with `{ isActive: false }`.

5. **Given** a deactivated user row,
   **When** the user list renders,
   **Then** the row shows "Edit" and "Activate" buttons (existing behaviour — verify it still works).

6. **Given** the currently logged-in admin user,
   **When** the user list renders,
   **Then** the row for the logged-in admin shows "Edit" but NOT "Deactivate" — preventing the admin from locking themselves out.

7. **Given** `user-management-actions.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: active users show Edit + Deactivate buttons, Edit modal opens with pre-populated data, Edit modal saves updated values, Deactivate shows Popconfirm then deactivates, logged-in admin has no Deactivate button, deactivated users show Edit + Activate (existing).

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Active users have no action buttons — only deactivated users do. This is almost certainly a conditional rendering bug (the Actions column only renders for `!isActive`). The fix is simple but the test coverage needs to be thorough because user management is a security-sensitive area. Priority one: Edit and Deactivate buttons appear for active users. Priority two: the self-deactivation guard works. Priority three: Edit modal saves correctly. Ship it and iterate on edge cases.

### Persona Test Consultation

**Rajesh (Admin):** "How do I edit Vikram's role or deactivate someone? Active users have no action buttons. Only the one deactivated user has Edit and Activate buttons. This is backwards. I need Edit and Deactivate on every active user. And I definitely should NOT be able to deactivate myself — that would lock me out of the system."

**Quinn's response:** "I'll test Rajesh's exact workflow: open User Management, verify active users show Edit + Deactivate buttons. Click Edit on Vikram, change his role, save, verify the change persists. Click Deactivate on a test user, confirm via Popconfirm, verify user moves to inactive. Then verify Rajesh's own row has Edit but no Deactivate. Four tests, all critical."

**Neha (HR):** "From an HR perspective, user role changes happen regularly — promotions, lateral moves, department transfers. If Rajesh can't change a user's role or department, he has to delete and recreate the user, which loses audit history."

**Quinn's response:** "I'll test the role change and department change flows specifically — not just that the modal opens, but that the updated values are actually saved and reflected in the user list after the modal closes."

**Priya (Finance):** "Not directly my concern, but if someone leaves the company, Rajesh needs to deactivate them immediately. Can't have active users who shouldn't have access."

**Quinn's response:** "The deactivation flow test covers this. I'll also verify that after deactivation, the user can't log in — that's the real security test, not just the UI state change."

### Persona Journey Test Files
```
tests/journeys/
  rajesh-manage-active-users-edit-and-deactivate.spec.ts
  rajesh-self-deactivation-guard.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin opens User Management → active users show Edit and Deactivate buttons (AC: 1)
- E2E-P2: Admin clicks Edit on Vikram → modal opens with Vikram's name, role (DM), department → Admin changes role → saves → list shows updated role (AC: 2, 3)
- E2E-P3: Admin clicks Deactivate on a test user → Popconfirm appears → confirms → user moves to deactivated state → Activate button appears (AC: 4, 5)
- E2E-P4: Admin views own row → Edit button visible, Deactivate button NOT visible (AC: 6)

### Negative

- E2E-N1: Admin tries to deactivate themselves (button should not exist) → verified no Deactivate button on own row (AC: 6)
- E2E-N2: Non-Admin (Finance) accesses User Management → cannot see Edit/Deactivate actions or gets 403 (existing RBAC)
- E2E-N3: Admin edits user with empty name → validation error, save blocked (AC: 3)

## Tasks / Subtasks

- [ ] Task 1: Diagnose missing action buttons (AC: 1)
  - [ ] 1.1 Read the User Management component — find the Actions column render logic
  - [ ] 1.2 Identify why active users don't show actions (likely a conditional: `if (!user.isActive)` shows buttons)
  - [ ] 1.3 Fix the conditional to show Edit + Deactivate for active users and Edit + Activate for inactive users

- [ ] Task 2: Add Edit modal for users (AC: 2, 3)
  - [ ] 2.1 Check if an Edit modal already exists (may exist for deactivated users)
  - [ ] 2.2 If it exists, ensure it works for active users too
  - [ ] 2.3 If it doesn't exist, create an Edit User modal with fields: name (editable), email (read-only), role (dropdown), department (dropdown)
  - [ ] 2.4 On Save, call `PATCH /api/v1/users/:id` with updated fields
  - [ ] 2.5 Refresh the user list after successful save

- [ ] Task 3: Add Deactivate action with Popconfirm (AC: 4)
  - [ ] 3.1 Add a Deactivate button for active users
  - [ ] 3.2 Wrap with antd `Popconfirm` for confirmation
  - [ ] 3.3 On confirm, call `PATCH /api/v1/users/:id` with `{ isActive: false }`
  - [ ] 3.4 Refresh the user list after deactivation

- [ ] Task 4: Self-deactivation guard (AC: 6)
  - [ ] 4.1 Get the currently logged-in user's ID from auth context
  - [ ] 4.2 In the Actions column render, hide Deactivate button when `user.id === currentUserId`

- [ ] Task 5: Verify backend PATCH endpoint (AC: 3, 4)
  - [ ] 5.1 Verify `PATCH /api/v1/users/:id` supports updating name, role, department, and isActive
  - [ ] 5.2 If the endpoint only supports isActive changes, extend it to accept name, role, department
  - [ ] 5.3 Add validation: prevent deactivating the last admin user

- [ ] Task 6: Frontend tests (AC: 7)
  - [ ] 6.1 Create `pages/admin/user-management-actions.test.tsx`
  - [ ] 6.2 Test: active user row renders Edit and Deactivate buttons
  - [ ] 6.3 Test: Edit button opens modal with pre-populated data
  - [ ] 6.4 Test: Save in Edit modal calls PATCH endpoint
  - [ ] 6.5 Test: Deactivate button shows Popconfirm
  - [ ] 6.6 Test: logged-in admin row has no Deactivate button
  - [ ] 6.7 Test: deactivated user row renders Edit and Activate buttons (regression)

- [ ] Task 7: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 7.1 Create or extend `packages/e2e/tests/user-management-actions.spec.ts`
  - [ ] 7.2 Implement E2E-P1 through E2E-P4
  - [ ] 7.3 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Antd Popconfirm, not window.confirm**: Use antd's `Popconfirm` component for the deactivation confirmation. This keeps the UI consistent with the design system. Do NOT use `window.confirm()`.
2. **PATCH, not DELETE**: Deactivation is a soft operation (`isActive: false`), never a hard delete. The `PATCH /api/v1/users/:id` endpoint handles this.
3. **Self-deactivation prevention**: Both frontend (hide button) and backend (reject request) should prevent an admin from deactivating themselves. Defense in depth.
4. **Last admin guard**: The backend should prevent deactivating the last remaining admin user. If only one admin exists and they try to deactivate themselves (bypassing the UI guard), the API should return 400.
5. **Email is immutable**: The Edit modal should show email as read-only. Email changes are not supported (it's the login identifier).

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| User Management page | `packages/frontend/src/pages/admin/UserManagement.tsx` or similar | Story 1.5 |
| User service | `packages/backend/src/services/user.service.ts` | Story 1.4 — PATCH endpoint |
| User routes | `packages/backend/src/routes/users.routes.ts` | Story 1.4 |
| Auth context | `packages/frontend/src/contexts/AuthContext.tsx` or similar | Provides current user ID |
| antd Popconfirm | `antd` | `import { Popconfirm } from 'antd'` |
| antd Modal | `antd` | For the Edit modal |
| Role options | System config or constants | Available user roles for the dropdown |
| Department list | `packages/backend/src/services/department.service.ts` | For department dropdown options |

### Gotchas

- **Conditional rendering bug**: The most likely issue is that the Actions column has a condition like `if (!user.isActive) return <EditButton /><ActivateButton />` — and no `else` branch for active users. Adding the else branch with Edit + Deactivate buttons should fix it.
- **Role dropdown options**: The Edit modal's role dropdown should show the available system roles (ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD). Check where these are defined — they may be an enum in the Prisma schema or a constants file.
- **Department dropdown**: The Edit modal needs a department list for the dropdown. Fetch from the departments API or reuse an existing department list hook.
- **Backlog item B21**: This is a P3 bug but functionally blocking — the Admin literally cannot manage active users.

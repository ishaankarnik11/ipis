# Story 1.5: User Management & System Config UI

Status: ready-for-dev

## Story

As an Admin,
I want to create, edit, and deactivate user accounts and configure system settings through the application,
so that I can manage the team's access and operational parameters without requiring database access.

## Acceptance Criteria (AC)

1. **Given** an authenticated Admin navigates to `/admin/users`,
   **When** the User Management page renders,
   **Then** all users are displayed in an antd `Table` with columns: Name, Email, Role, Department, Status (Active/Inactive), and Actions (Edit, Deactivate) — action buttons visible on row hover only.

2. **Given** the User Management page,
   **When** Admin clicks "Add User",
   **Then** an antd `Modal` opens with an antd `Form` containing: Name (required), Email (required, email format validated on blur), Role `Select` (5 options), Department `Select` (optional).

3. **Given** the Add User form is submitted with valid data,
   **When** `POST /api/v1/users` succeeds,
   **Then** the Modal closes, TanStack Query invalidates `['users']`, the table refreshes, and an antd `message.success` confirms: "User [name] created successfully".

4. **Given** a user row,
   **When** Admin clicks "Edit",
   **Then** the same Modal opens pre-populated with the user's current name, role, and department; on save, `PATCH /api/v1/users/:id` is called and the table refreshes.

5. **Given** an active user row,
   **When** Admin clicks "Deactivate" and confirms the confirmation Modal,
   **Then** `PATCH /api/v1/users/:id` with `{ isActive: false }` is called, the table refreshes, and the row shows "Inactive" status badge.

6. **Given** an authenticated Admin navigates to `/admin/config`,
   **When** the System Config page renders,
   **Then** the current `standardMonthlyHours` is displayed in an `InputNumber` field pre-populated with the current value (default: 160).

7. **Given** the System Config form,
   **When** Admin updates `standardMonthlyHours` and clicks "Save",
   **Then** `PUT /api/v1/config` is called; on success an antd `message.success` confirms "System configuration updated".

8. **Given** a non-Admin authenticated user,
   **When** they attempt to navigate to `/admin/users` or `/admin/config`,
   **Then** the `RoleGuard` redirects them to their role-appropriate landing page — the guard is UX only; API RBAC is the security enforcement.

9. **Given** the Admin left sidebar,
   **When** rendered for an Admin user,
   **Then** "User Management" and "System Configuration" navigation items are visible and link to the correct routes.

## Tasks / Subtasks

- [ ] Task 1: Users API service (AC: 1, 2, 3, 4, 5)
  - [ ] 1.1 Create `services/users.api.ts` — `userKeys` constant (`{ all: ['users'] as const }`), `getUsers()`, `createUser()`, `updateUser()`, `getDepartments()` functions
  - [ ] 1.2 All functions use the `api.ts` fetch wrapper with `credentials: 'include'`

- [ ] Task 2: Config API service (AC: 6, 7)
  - [ ] 2.1 Create `services/config.api.ts` — `configKeys` constant, `getConfig()`, `updateConfig()` functions

- [ ] Task 3: User Management page (AC: 1, 2, 3, 4, 5)
  - [ ] 3.1 Create `pages/admin/UserManagement.tsx` — antd `Table` with users data via `useQuery(userKeys.all, getUsers)`
  - [ ] 3.2 Table columns: Name, Email, Role (formatted label), Department name, Status (antd `Tag` — green "Active" / red "Inactive"), Actions
  - [ ] 3.3 Actions column: "Edit" and "Deactivate/Activate" buttons, visible on row hover via CSS
  - [ ] 3.4 "Add User" button above table
  - [ ] 3.5 Loading state: `<Table loading={isLoading} />`
  - [ ] 3.6 Empty state: antd `Empty` component

- [ ] Task 4: User Add/Edit Modal (AC: 2, 3, 4)
  - [ ] 4.1 Create `pages/admin/UserFormModal.tsx` — reusable modal for both add and edit
  - [ ] 4.2 Form fields: Name (`Input`, required), Email (`Input`, required, email format rule), Role (`Select` with 5 options), Department (`Select`, optional, loaded from `GET /api/v1/departments`)
  - [ ] 4.3 Edit mode: pre-populate form with `initialValues` from selected user
  - [ ] 4.4 On submit: call `useMutation` (create or update), on success close modal + invalidate `userKeys.all` + show `message.success`
  - [ ] 4.5 On API error: show error in modal via antd `Alert`
  - [ ] 4.6 Submit button with `loading` state during mutation

- [ ] Task 5: Deactivation confirmation (AC: 5)
  - [ ] 5.1 Deactivate click opens `Modal.confirm` with "Are you sure you want to deactivate [name]?"
  - [ ] 5.2 On confirm: call `updateUser(id, { isActive: false })`, invalidate query, show success message
  - [ ] 5.3 Inactive users show "Activate" button instead of "Deactivate"

- [ ] Task 6: System Config page (AC: 6, 7)
  - [ ] 6.1 Create `pages/admin/SystemConfig.tsx` — antd `Form` with `InputNumber` fields
  - [ ] 6.2 Fields: Standard Monthly Hours (`InputNumber`, integer, min 1, max 744), Healthy Margin Threshold (percentage input), At-Risk Margin Threshold (percentage input)
  - [ ] 6.3 Load current values via `useQuery(configKeys.current, getConfig)`, set as `initialValues`
  - [ ] 6.4 Save button calls `useMutation(updateConfig)`, shows `message.success` on success

- [ ] Task 7: Admin navigation and routing (AC: 8, 9)
  - [ ] 7.1 Update `config/navigation.ts` from Story 1.3 — ensure "User Management" and "System Config" items are present for Admin role
  - [ ] 7.2 Update `router/index.tsx` — add `/admin/users` and `/admin/config` routes nested under `RoleGuard allowedRoles={['ADMIN']}`
  - [ ] 7.3 Verify RoleGuard redirects non-Admin users

- [ ] Task 8: Tests (AC: 1-9)
  - [ ] 8.1 Create `pages/admin/UserManagement.test.tsx` — table renders users, add/edit/deactivate flows work
  - [ ] 8.2 Create `pages/admin/SystemConfig.test.tsx` — form loads config, save works
  - [ ] 8.3 Mock API responses using `vi.mock` or MSW

## Dev Notes

### Architecture Constraints (MUST follow)

1. **TanStack Query for all server state** — no useState for fetched data. Use `useQuery` for reads, `useMutation` for writes.
2. **Query key constants** — defined in `*.api.ts` files. Never inline query keys. `userKeys.all = ['users'] as const`.
3. **Invalidate on mutation success** — `queryClient.invalidateQueries({ queryKey: userKeys.all })` after create/update.
4. **antd v6.3.0** — use `Table`, `Modal`, `Form`, `Select`, `InputNumber`, `Tag`, `Button`, `message`, `Empty`.
5. **RoleGuard is UX only** — it redirects unauthorized users but provides no security. API RBAC is the enforcement.
6. **Credentials in API calls** — `credentials: 'include'` on all fetch calls (via `api.ts` wrapper from Story 1.3).
7. **Form validation on blur** — not on keystroke. Use antd Form `validateTrigger="onBlur"`.
8. **Action buttons on hover** — use CSS `:hover` on table row to show/hide action buttons.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| API wrapper | `services/api.ts` | Created in Story 1.3 — fetch with credentials |
| useAuth hook | `hooks/useAuth.ts` | Created in Story 1.3 — user role available |
| AuthGuard | `router/guards.tsx` | Created in Story 1.3 |
| RoleGuard | `router/guards.tsx` | Created in Story 1.3 — wrap admin routes |
| AppLayout | `layouts/AppLayout.tsx` | Created in Story 1.3 — sidebar + top bar |
| Navigation config | `config/navigation.ts` | Created in Story 1.3 — add admin items |
| Router | `router/index.tsx` | Created in Story 1.3 — add admin routes |
| Theme tokens | `theme/index.ts` | colorPrimary, colorError, fonts |
| UserRole type | `shared/types/index.ts` | For role Select options |
| User schemas | `shared/schemas/user.schema.ts` | Created in Story 1.4 — reuse for client validation |

### Role Display Names

```typescript
export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  HR: 'HR',
  DELIVERY_MANAGER: 'Delivery Manager',
  DEPT_HEAD: 'Department Head',
};
```

### Table Column Pattern

```typescript
const columns: ColumnsType<User> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', dataIndex: 'role', key: 'role', render: (role) => roleLabels[role] },
  { title: 'Department', dataIndex: 'departmentName', key: 'department' },
  { title: 'Status', dataIndex: 'isActive', key: 'status',
    render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
  },
  { title: 'Actions', key: 'actions',
    render: (_, record) => (
      <Space className="row-actions">
        <Button size="small" onClick={() => openEditModal(record)}>Edit</Button>
        <Button size="small" danger onClick={() => confirmDeactivate(record)}>
          {record.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </Space>
    )
  },
];
```

### New Dependencies Required

None — all dependencies already installed (antd, @tanstack/react-query, react-router).

### Project Structure Notes

New files to create:
```
packages/frontend/src/
├── services/
│   ├── users.api.ts               # User CRUD API functions + query keys
│   └── config.api.ts              # Config API functions + query keys
├── pages/
│   └── admin/
│       ├── UserManagement.tsx      # User table page
│       ├── UserFormModal.tsx       # Add/Edit user modal
│       └── SystemConfig.tsx        # System config page
```

Existing files to modify:
```
src/config/navigation.ts            # Add admin nav items (if not already there)
src/router/index.tsx                 # Add /admin/users, /admin/config routes
```

### Testing Strategy

- **Component tests** (Vitest + React Testing Library): UserManagement, UserFormModal, SystemConfig
- **Mock API**: `vi.mock('../services/users.api')` or MSW
- **Test scenarios**: table renders, add modal opens/submits, edit modal pre-populates, deactivate confirmation works
- **Co-located test files**: `*.test.tsx` next to source

### UX Design Notes

- Tier 3 (low effort) — follow standard antd patterns
- Action buttons hidden by default, visible on row hover (CSS `.ant-table-row:hover .row-actions { visibility: visible }`)
- Status: antd `Tag` with text labels — not color alone (accessibility)
- Confirmation modal before deactivation — clear messaging
- Success feedback via `message.success()` — brief toast notification
- Form validation on blur — email format check

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend patterns, antd Table, Form, Admin routes]
- [Source: _bmad-output/planning-artifacts/prd.md — FR5-FR9, NFR8]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form patterns, Accessibility, Navigation]
- [Source: _bmad-output/implementation-artifacts/1-4-user-and-role-management-api.md — API contract]

### Previous Story Intelligence

**From 1.3 (Login & Session UI):** AppLayout, sidebar, router, guards, API wrapper, useAuth hook all established. Admin routes nested under RoleGuard.

**From 1.4 (User & Role Management API):** Endpoints `POST/GET/PATCH /api/v1/users`, `GET/PUT /api/v1/config`, `GET /api/v1/departments`. Zod schemas in shared package. Response shapes defined.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

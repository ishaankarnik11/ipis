# Story 8.1: Project Role Management — Schema & Admin API

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to manage a configurable list of project roles (add/deactivate) so that team member assignments use standardised role names instead of free text, improving data quality for downstream reporting and practice-level breakdowns.

## Acceptance Criteria (AC)

1. **Given** the Prisma schema,
   **When** the migration runs,
   **Then** a `project_roles` table exists with columns: `id` (UUID PK), `name` (VARCHAR unique), `is_active` (BOOLEAN default true), `created_at` (TIMESTAMPTZ default now()); the `employee_projects` table gains a new column `role_id` (UUID FK → `project_roles.id`, nullable initially for migration) while retaining the existing `role` column temporarily for data migration.

2. **Given** the migration runs on a database with existing `employee_projects` rows,
   **When** the migration completes,
   **Then** a data migration step creates `ProjectRole` entries for each unique `role` string found in existing `employee_projects` rows, sets `role_id` on each row to the matching `ProjectRole.id`, and after successful backfill the `role` column is dropped and `role_id` is made non-nullable.

3. **Given** the migration includes seed data,
   **When** a fresh database is migrated,
   **Then** the following default roles are seeded: `Developer`, `Senior Developer`, `Tech Lead`, `QA Engineer`, `Business Analyst`, `Project Manager`, `Designer`, `DevOps Engineer`, `Architect`, `Support Engineer` — all with `is_active: true`.

4. **Given** an authenticated Admin,
   **When** `POST /api/v1/project-roles` is called with `{ name: "Data Engineer" }`,
   **Then** a new role is created and returned as `{ data: { id, name, isActive, createdAt } }` with `201 CREATED`.

5. **Given** an authenticated Admin,
   **When** `POST /api/v1/project-roles` is called with a name that already exists (case-insensitive),
   **Then** `409 CONFLICT` is returned with `{ error: { code: "CONFLICT", message: "A project role with this name already exists" } }`.

6. **Given** an authenticated Admin,
   **When** `GET /api/v1/project-roles` is called,
   **Then** all roles are returned sorted by name ascending: `{ data: [{ id, name, isActive, createdAt }], meta: { total: N } }` — includes both active and inactive roles.

7. **Given** an authenticated Admin,
   **When** `GET /api/v1/project-roles?active=true` is called,
   **Then** only roles with `is_active = true` are returned — this is the query used by the role dropdown in team member assignment.

8. **Given** an authenticated Admin,
   **When** `PATCH /api/v1/project-roles/:id` is called with `{ isActive: false }`,
   **Then** the role is soft-deactivated. Existing `employee_projects` rows with this `role_id` are unaffected. The role no longer appears in `?active=true` queries.

9. **Given** a non-Admin user (Finance, HR, DM, DH),
   **When** any `POST/PATCH` project-roles endpoint is called,
   **Then** `403 FORBIDDEN` is returned.

10. **Given** the `GET /api/v1/project-roles?active=true` endpoint,
    **When** any authenticated user calls it,
    **Then** the active roles list is returned — this endpoint is read-accessible to all roles (needed for team member assignment dropdowns by DMs).

11. **Given** the `addTeamMemberSchema` in `shared/schemas/project.schema.ts`,
    **When** updated for this story,
    **Then** the `role` field is replaced with `roleId: z.string().uuid()` — validated as a UUID. The service layer additionally checks that the referenced `ProjectRole` exists and `isActive = true`.

12. **Given** `project-role.service.test.ts` and `project-roles.routes.test.ts`,
    **When** `pnpm test` runs,
    **Then** tests cover: create role, duplicate conflict (case-insensitive), list all roles, list active only, deactivate role, reactivate role, RBAC 403 for non-Admin on mutations, read access for all roles, addTeamMember with valid roleId, addTeamMember with inactive roleId (400), addTeamMember with non-existent roleId (400).

## E2E Test Scenarios

### Positive

- E2E-P1: Admin navigates to settings → sees Project Roles section with 10 seeded roles, all showing Active status (AC: 3, 6)
- E2E-P2: Admin adds a new role "Data Engineer" → role appears in list immediately, count increases (AC: 4)
- E2E-P3: Admin deactivates "Support Engineer" → badge changes to Inactive, role no longer in active-only filter (AC: 8)
- E2E-P4: DM opens Add Team Member modal → role dropdown shows only active roles; deactivated "Support Engineer" is absent (AC: 7, 10)
- E2E-P5: DM adds team member with valid active role → assignment succeeds, member appears in roster with role name (AC: 11)

### Negative

- E2E-N1: Admin adds role with duplicate name "Developer" → inline error "A project role with this name already exists" (AC: 5)
- E2E-N2: Non-Admin (Finance) navigates to settings → Project Roles management section is not visible or returns 403 (AC: 9)
- E2E-N3: DM adds team member selecting a role that was deactivated between page load and submit → API returns 400 with "Invalid or inactive project role" (AC: 11)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — ProjectRole model and EmployeeProject migration (AC: 1, 2, 3)
  - [x] 1.1 Add `ProjectRole` model: `id`, `name` (unique), `isActive` (default true), `createdAt`; `@@map("project_roles")`
  - [x] 1.2 Add `roleId` (UUID, FK → ProjectRole) to `EmployeeProject`; initially nullable
  - [x] 1.3 Create migration with data migration SQL: INSERT unique roles from `employee_projects.role` into `project_roles`, UPDATE `employee_projects` SET `role_id` = matched `project_roles.id`
  - [x] 1.4 After backfill: drop `role` column from `employee_projects`, make `role_id` non-nullable
  - [x] 1.5 Seed default roles in `prisma/seed.ts`

- [x] Task 2: Zod schemas (AC: 11)
  - [x] 2.1 Create `shared/schemas/project-role.schema.ts` — `createProjectRoleSchema` (`name: z.string().min(1).max(100)`), `updateProjectRoleSchema` (`isActive: z.boolean()`)
  - [x] 2.2 Update `addTeamMemberSchema` — replace `role: z.string()` with `roleId: z.string().uuid()`
  - [x] 2.3 Export types: `CreateProjectRoleInput`, `UpdateProjectRoleInput`

- [x] Task 3: Project role service (AC: 4, 5, 6, 7, 8)
  - [x] 3.1 Create `services/project-role.service.ts`
  - [x] 3.2 `createRole(data)` — case-insensitive uniqueness check via `findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })`
  - [x] 3.3 `getAllRoles(activeOnly?: boolean)` — sorted by name ascending
  - [x] 3.4 `updateRole(id, data)` — soft deactivate/reactivate
  - [x] 3.5 Validate roleId in `addTeamMember` — check exists + isActive before creating assignment

- [x] Task 4: Routes (AC: 4, 5, 6, 7, 8, 9, 10)
  - [x] 4.1 Create `routes/project-roles.routes.ts`
  - [x] 4.2 `POST /api/v1/project-roles` — Admin only
  - [x] 4.3 `GET /api/v1/project-roles` — all authenticated users (with `?active=true` filter)
  - [x] 4.4 `PATCH /api/v1/project-roles/:id` — Admin only
  - [x] 4.5 Register in `routes/index.ts`

- [x] Task 5: Update project service (AC: 11)
  - [x] 5.1 Modify `addTeamMember` to accept `roleId` instead of `role`
  - [x] 5.2 Validate `roleId` references active ProjectRole before creating assignment
  - [x] 5.3 Update `getTeamMembers` to join through `ProjectRole` and return `roleName` in response
  - [x] 5.4 Update `removeTeamMember` — no changes needed (operates on composite key)

- [x] Task 6: Backend tests (AC: 12)
  - [x] 6.1 Create `services/project-role.service.test.ts`
  - [x] 6.2 Tests: create, duplicate conflict (case-insensitive), list all, list active only, deactivate, reactivate
  - [x] 6.3 Update `services/project.service.test.ts` — addTeamMember with roleId (valid, inactive, non-existent)
  - [x] 6.4 RBAC tests: Admin mutations pass, non-Admin mutations 403, all roles can read

- [x] Task 7: E2E Tests (E2E-P1 through E2E-N3)
  - [x] 7.1 Update `packages/e2e/seed.ts` — seed ProjectRole data, update employee_projects with roleId
  - [x] 7.2 Implement E2E-P1 through E2E-P5 (positive scenarios — API-level, UI tests deferred to Story 8.2)
  - [x] 7.3 Implement E2E-N1 through E2E-N3 (negative scenarios)

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Case-insensitive uniqueness**: Role names are unique case-insensitively (`Developer` and `developer` are the same). Use Prisma `mode: 'insensitive'` on findFirst — do NOT use a unique index with `LOWER()` as Prisma doesn't support function-based unique indexes natively.
2. **Soft delete, never hard delete**: Roles are deactivated (`isActive: false`), never deleted. FK integrity on existing `employee_projects` rows must be preserved.
3. **Two-phase migration**: Phase 1 adds `role_id` nullable + creates `project_roles` table + backfills. Phase 2 (same migration) drops `role` column and makes `role_id` NOT NULL. Use raw SQL in the migration for the data migration step — Prisma `migrate` supports `-- SQL` blocks.
4. **All currency values in paise**: Selling rate stored as `billingRatePaise` (BigInt) — no change to the column name. UI labels change from "billing rate" to "selling rate".
5. **RBAC**: Mutations (POST/PATCH) are Admin-only. Reads (GET) are available to all authenticated users — DMs need the active role list for team member assignment dropdowns.
6. **Logger redaction**: Role names are not sensitive — no pino redaction needed for this service.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth/RBAC middleware | `middleware/auth.middleware.ts`, `middleware/rbac.middleware.ts` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.1 |
| Error classes | `lib/errors.ts` | ConflictError, ValidationError, NotFoundError |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| addTeamMemberSchema | `shared/schemas/project.schema.ts` | Modify in place — change `role` → `roleId` |
| project.service.ts | `services/project.service.ts` | Modify addTeamMember, getTeamMembers |
| Test utilities | `test-utils/db.ts` | Prisma test helpers |

### Prisma Schema Additions

```prisma
model ProjectRole {
  id        String   @id @default(uuid())
  name      String   @unique @db.VarChar(100)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  employeeProjects EmployeeProject[]

  @@map("project_roles")
}

// Updated EmployeeProject:
model EmployeeProject {
  projectId        String      @map("project_id")
  project          Project     @relation(fields: [projectId], references: [id])
  employeeId       String      @map("employee_id")
  employee         Employee    @relation(fields: [employeeId], references: [id])
  roleId           String      @map("role_id")
  projectRole      ProjectRole @relation(fields: [roleId], references: [id])
  billingRatePaise BigInt?     @map("billing_rate_paise")
  assignedAt       DateTime    @default(now()) @map("assigned_at")

  @@id([projectId, employeeId])
  @@map("employee_projects")
}
```

### Project Structure Notes

New files:
```
packages/backend/src/
├── services/
│   ├── project-role.service.ts
│   └── project-role.service.test.ts
├── routes/
│   └── project-roles.routes.ts

packages/shared/src/
├── schemas/
│   └── project-role.schema.ts
```

Modified files:
```
packages/backend/prisma/schema.prisma
packages/backend/prisma/seed.ts
packages/backend/src/routes/index.ts
packages/backend/src/services/project.service.ts
packages/backend/src/services/project.service.test.ts
packages/shared/src/schemas/project.schema.ts
packages/shared/src/schemas/index.ts
packages/e2e/seed.ts
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR51, FR52]
- [Source: _bmad-output/planning-artifacts/architecture.md — Database Schema, RBAC]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.1]

### Previous Story Intelligence

- **From 3.2:** `addTeamMember` function accepts `role: string` (free text). This is the field being replaced with `roleId: UUID`.
- **From 3.2:** `getTeamMembers` returns `role` as string. Must now join through `ProjectRole` and return `roleName`.
- **From 4.2:** T&M calculation uses `billingRatePaise` from `employee_projects` — renaming to "selling rate" is UI-only, no schema change needed for this column.
- **From 1.5:** System config UI page exists at `pages/admin/SystemConfig.tsx` — the Role Management UI (Story 8.2) can be added as a section here or as a sibling page.

### Gotchas & Go/No-Go

- **CRITICAL**: The migration must handle existing data. If `employee_projects` has rows with `role` values that don't match any seeded `ProjectRole`, the migration must create those roles dynamically before backfilling `role_id`.
- **BREAKING CHANGE**: The `addTeamMemberSchema` changes from `role: string` to `roleId: string(uuid)`. Frontend must be updated simultaneously (Story 8.3) — coordinate deployment.
- **E2E seed data**: All E2E test seed data that creates `employee_projects` must be updated to use `roleId` instead of `role`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

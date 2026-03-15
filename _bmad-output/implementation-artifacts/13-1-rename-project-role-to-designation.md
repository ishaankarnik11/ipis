# Story 13.1: Rename ProjectRole → Designation + Schema Migration

Status: ready-for-dev

## Story

As a system administrator,
I need the concept of "Project Role" renamed to "Designation" throughout the system,
so that the terminology is consistent with what users see on the Employee form ("Designation") and aligns with how the business actually thinks about job designations (e.g., "Senior Python Developer" is a designation, not a "role").

## Context

Currently the system has two competing terms:
- **Employee form**: uses "Designation" field (free-text on Employee model)
- **Team member assignment**: uses "Role" (from `ProjectRole` table)
- **Admin config screen**: shows "Project Role Management"

Users see "Designation" when creating employees but "Role" when assigning team members. This causes confusion — they appear to be the same concept used inconsistently. Renaming `ProjectRole` → `Designation` and updating all references makes the system consistent.

## Acceptance Criteria

1. **Given** the database schema,
   **When** migrations are applied,
   **Then** the `ProjectRole` table is renamed to `Designation`, with columns: `id`, `name`, `departmentId` (nullable FK → Department), `isActive`, `createdAt`.

2. **Given** the `EmployeeProject` junction table,
   **When** queried,
   **Then** the foreign key column is renamed from `roleId` to `designationId`.

3. **Given** the backend API,
   **When** `/api/v1/project-roles` endpoints are called,
   **Then** they are accessible at `/api/v1/designations` (old route returns 301 redirect for backwards compat during transition, or removed entirely).

4. **Given** the frontend Admin config screen,
   **When** rendered,
   **Then** the section is labeled "Designation Management" (not "Project Role Management").

5. **Given** the Add Team Member modal,
   **When** the user selects a team member,
   **Then** the dropdown is labeled "Designation" (not "Role").

6. **Given** the shared Zod schemas,
   **When** referenced anywhere in the codebase,
   **Then** all references to `projectRole`, `roleId`, `ProjectRole` are renamed to `designation`, `designationId`, `Designation`.

7. **Given** all existing tests,
   **When** `pnpm test` runs after the rename,
   **Then** all tests pass with updated references. No test uses the old `projectRole` / `roleId` terminology.

## Technical Notes

### Database Migration
```sql
ALTER TABLE "ProjectRole" RENAME TO "Designation";
ALTER TABLE "Designation" ADD COLUMN "departmentId" UUID REFERENCES "Department"("id");
ALTER TABLE "EmployeeProject" RENAME COLUMN "roleId" TO "designationId";
-- Update FK constraint names accordingly
```

### Files to Update (non-exhaustive)
- `packages/backend/prisma/schema.prisma` — model rename + relation updates
- `packages/backend/src/services/project-role.service.ts` → `designation.service.ts`
- `packages/backend/src/routes/project-roles.routes.ts` → `designations.routes.ts`
- `packages/backend/src/routes/index.ts` — route registration
- `packages/shared/src/schemas/` — Zod schema renames
- `packages/frontend/src/services/project-roles.api.ts` → `designations.api.ts`
- `packages/frontend/src/components/ProjectRoleManagement.tsx` → `DesignationManagement.tsx`
- All test files referencing the old names
- Seed data (`seed.ts`)

### Testing Requirements

**Backend Integration:**
- Verify Prisma migration runs cleanly
- Verify all designation CRUD operations work with new table/column names
- Verify `EmployeeProject` queries use `designationId`

**E2E Consequence Test:**
- Create a designation via Admin → assign it to a team member on a project → verify it appears correctly on the project detail page with label "Designation"

**No Mocks Allowed:**
- All tests must use real database operations

# Story 3.2: Team Roster Management API

Status: done

## Story

As a Delivery Manager,
I want to assign employees to my projects and manage the team roster after approval,
so that only formally assigned team members can log time against a project, preventing unauthorised cost attribution.

## Acceptance Criteria (AC)

1. **Given** an authenticated Delivery Manager for their own approved project,
   **When** `POST /api/v1/projects/:id/team-members` is called with `{ employeeId, role, billingRatePaise? }`,
   **Then** an `employee_projects` record is created and the response returns `{ data: { employeeId, role, billingRatePaise, assignedAt } }`.

2. **Given** a `TIME_AND_MATERIALS` project,
   **When** `POST /api/v1/projects/:id/team-members` is called without `billingRatePaise`,
   **Then** the response is `400 VALIDATION_ERROR`: `"billingRatePaise is required for T&M projects"` — Zod validates based on parent project's `engagementModel`.

3. **Given** an authenticated Delivery Manager,
   **When** `GET /api/v1/projects/:id/team-members` is called for their own project,
   **Then** the response returns all assigned employees: `{ data: [{ employeeId, name, designation, role, billingRatePaise, assignedAt }] }`.

4. **Given** an authenticated Delivery Manager,
   **When** `DELETE /api/v1/projects/:id/team-members/:employeeId` is called,
   **Then** the `employee_projects` record is removed.

5. **Given** the `employee_projects` table migration,
   **When** this story's Prisma migration runs,
   **Then** the table is created with: `project_id` (FK → projects), `employee_id` (FK → employees), `role` (VARCHAR), `billing_rate_paise` (BIGINT nullable), `assigned_at` (TIMESTAMP DEFAULT now()); composite PK: `(project_id, employee_id)`.

6. **Given** a Delivery Manager attempting to manage team members for another DM's project,
   **When** the service checks `project.deliveryManagerId !== req.user.id`,
   **Then** the response is `403 FORBIDDEN` — service-level ownership check.

7. **Given** roles `[finance, hr, dept_head]`,
   **When** `POST /api/v1/projects/:id/team-members` is called,
   **Then** `rbacMiddleware(['delivery_manager', 'admin'])` returns `403 FORBIDDEN`.

8. **Given** adding an employee who is already on the roster,
   **When** `POST /api/v1/projects/:id/team-members` is called with a duplicate `employeeId`,
   **Then** the response is `409 CONFLICT`: `"Employee is already assigned to this project"`.

## Tasks / Subtasks

- [x] Task 1: Prisma migration for employee_projects (AC: 5)
  - [x] 1.1 Add `EmployeeProject` model with composite PK
  - [x] 1.2 Add relations to Employee and Project models
  - [x] 1.3 Run migration

- [x] Task 2: Zod schemas for team roster (AC: 1, 2)
  - [x] 2.1 Add `addTeamMemberSchema` to `project.schema.ts` — employeeId, role, billingRatePaise optional
  - [x] 2.2 Validation: billingRatePaise required when project is T&M (validate at service level after loading project)

- [x] Task 3: Team roster service methods (AC: 1, 2, 3, 4, 6, 8)
  - [x] 3.1 Add `addTeamMember(projectId, data, user)` to `project.service.ts` — ownership check, T&M billing rate check
  - [x] 3.2 Add `getTeamMembers(projectId, user)` — with employee join for name/designation
  - [x] 3.3 Add `removeTeamMember(projectId, employeeId, user)` — ownership check
  - [x] 3.4 Handle duplicate assignment → ConflictError
  - [x] 3.5 Tests in `project.service.test.ts`

- [x] Task 4: Team roster routes (AC: 1, 3, 4, 7)
  - [x] 4.1 Add nested routes to `projects.routes.ts`
  - [x] 4.2 `POST /:id/team-members` — `rbacMiddleware(['delivery_manager', 'admin'])`
  - [x] 4.3 `GET /:id/team-members` — `rbacMiddleware(['delivery_manager', 'admin', 'finance'])`
  - [x] 4.4 `DELETE /:id/team-members/:employeeId` — `rbacMiddleware(['delivery_manager', 'admin'])`

- [x] Task 5: Integration tests (AC: 1-8)
  - [x] 5.1 Test: DM adds team member — 201
  - [x] 5.2 Test: T&M project without billing rate — 400
  - [x] 5.3 Test: DM lists team — includes employee details
  - [x] 5.4 Test: DM removes team member — 200
  - [x] 5.5 Test: Other DM's project — 403
  - [x] 5.6 Test: Duplicate assignment — 409
  - [x] 5.7 Test: HR/Finance/DH cannot add members — 403

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Ownership check in service layer**: Check `project.deliveryManagerId === user.id` inside service, not route.
2. **T&M billing rate validation**: Load project first, check engagementModel, then validate billingRatePaise.
3. **Currency as paise**: `billingRatePaise` stored as BIGINT. Redact from logs.
4. **Composite PK**: `(project_id, employee_id)` — use Prisma `@@id([projectId, employeeId])`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| project.service.ts | `services/project.service.ts` | Story 3.1 — extend with team methods |
| projects.routes.ts | `routes/projects.routes.ts` | Story 3.1 — add nested routes |
| project.schema.ts | `shared/schemas/project.schema.ts` | Story 3.1 — add team schema |
| Employee model | Prisma schema | Story 2.1 |

### Prisma Schema — New Migration Required

```prisma
model EmployeeProject {
  projectId       String   @map("project_id")
  project         Project  @relation(fields: [projectId], references: [id])
  employeeId      String   @map("employee_id")
  employee        Employee @relation(fields: [employeeId], references: [id])
  role            String
  billingRatePaise BigInt?  @map("billing_rate_paise")
  assignedAt      DateTime @default(now()) @map("assigned_at")

  @@id([projectId, employeeId])
  @@map("employee_projects")
}
```

### New Dependencies Required

None.

### Project Structure Notes

Existing files to modify:
```
packages/backend/src/services/project.service.ts       # Add team roster methods
packages/backend/src/services/project.service.test.ts   # Add team roster tests
packages/backend/src/routes/projects.routes.ts          # Add nested team routes
packages/backend/src/routes/projects.routes.test.ts     # Add team integration tests
packages/shared/src/schemas/project.schema.ts           # Add addTeamMemberSchema
packages/backend/prisma/schema.prisma                   # Add EmployeeProject model
```

### Testing Strategy

- **Unit tests**: Service methods — ownership check, T&M validation, duplicate handling
- **Integration tests**: Full HTTP cycle for team roster CRUD
- **RBAC tests**: DM + Admin can manage; others get 403

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Employee Projects, RBAC Scoping]
- [Source: _bmad-output/planning-artifacts/prd.md — FR28, FR45]

### Previous Story Intelligence

- **From 3.1:** Project model, service, routes all created. Ownership check pattern established.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No blocking issues encountered.

### Completion Notes List
- **Task 1:** Created `EmployeeProject` model in Prisma schema with composite PK `(projectId, employeeId)`, added relations on Employee and Project models, ran migration `20260224183142_add_employee_projects` successfully.
- **Task 2:** Added `addTeamMemberSchema` to `project.schema.ts` with Zod validation for employeeId (UUID), role (string), and optional billingRatePaise (positive int). T&M billing rate enforcement handled at service level.
- **Task 3:** Implemented `addTeamMember`, `getTeamMembers`, `removeTeamMember` in `project.service.ts`. Shared `loadProjectForTeam` helper handles ownership check, project status validation, and role-based access bypasses. Resigned employee guard added. 15 unit tests covering ownership, T&M validation, duplicates, not-found cases, non-ACTIVE project rejection, Finance read access, and resigned employee rejection.
- **Task 4:** Added three nested routes under `projects.routes.ts`: POST, GET, DELETE for `/:id/team-members`. RBAC: DM+Admin for POST/DELETE, DM+Admin+Finance for GET.
- **Task 5:** Added 14 integration tests covering all 8 ACs: add member (201), T&M without rate (400), list with employee details (200), remove (200), other DM (403), duplicate (409), HR/Finance/DH RBAC blocks (403), Admin add (201), Admin GET (200), Finance GET (200), resigned employee (400).

### Change Log
- 2026-02-25: Story 3.2 implementation complete — team roster CRUD API with full test coverage
- 2026-02-25: Code review fixes — added project ACTIVE status check (AC1), fixed Finance GET access, fixed TOCTOU race condition on duplicate check (P2002), added Admin/Finance test coverage
- 2026-02-25: Code review round 2 — added resigned employee guard on addTeamMember, corrected test counts in dev notes

### File List
- packages/backend/prisma/schema.prisma (modified — added EmployeeProject model, Employee/Project relations)
- packages/backend/prisma/migrations/20260224183142_add_employee_projects/migration.sql (new)
- packages/backend/src/services/project.service.ts (modified — added team roster methods, code review fixes)
- packages/backend/src/services/project.service.test.ts (modified — 15 team roster unit tests)
- packages/backend/src/routes/projects.routes.ts (modified — added team-members routes)
- packages/backend/src/routes/projects.routes.test.ts (modified — 14 team roster integration tests)
- packages/shared/src/schemas/project.schema.ts (modified — added addTeamMemberSchema)
- packages/shared/src/schemas/index.ts (modified — exported new schema/type)

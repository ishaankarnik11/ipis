# Story 3.1: Project Management API — Create, Approve & Reject

Status: done

## Story

As a Delivery Manager and Admin,
I want to create projects, submit them for approval, and review and decide on pending submissions,
so that every project is formally established with the right commercial details before resources log time against it.

## Acceptance Criteria (AC)

1. **Given** an authenticated Delivery Manager,
   **When** `POST /api/v1/projects` is called with `{ name, client, vertical, engagementModel, contractValuePaise, startDate, endDate }` plus model-specific fields,
   **Then** a project is created with `status: 'PENDING_APPROVAL'`, `deliveryManagerId` set to `req.user.id`, and the response returns `{ data: { id, name, engagementModel, status: 'PENDING_APPROVAL' } }`.

2. **Given** a new project is created,
   **When** the service writes the record,
   **Then** an email is dispatched via AWS SES to all Admin users with subject: "New project pending approval: [name]" — FR46; email dispatch is fire-and-forget and does not block the API response.

3. **Given** a project with status `PENDING_APPROVAL`,
   **When** any dashboard or reporting query runs,
   **Then** the project is excluded from all profitability calculations and reporting — only `ACTIVE` projects appear in dashboards.

4. **Given** an authenticated Admin,
   **When** `POST /api/v1/projects/:id/approve` is called,
   **Then** project `status` changes to `ACTIVE`, an SES email is sent to the Delivery Manager: "Your project [name] has been approved" — FR47, and the response returns `{ success: true }`.

5. **Given** an authenticated Admin,
   **When** `POST /api/v1/projects/:id/reject` is called with `{ rejectionComment }`,
   **Then** project `status` changes to `REJECTED`, `rejection_comment` is stored, an SES email notifies the Delivery Manager with the comment — FR47, and the response returns `{ success: true }`; empty `rejectionComment` returns `400 VALIDATION_ERROR`.

6. **Given** an authenticated Delivery Manager with a `REJECTED` project,
   **When** `PATCH /api/v1/projects/:id` is called with corrections followed by `POST /api/v1/projects/:id/resubmit`,
   **Then** project `status` returns to `PENDING_APPROVAL`, `rejection_comment` is cleared, and Admin is notified again via SES.

7. **Given** an authenticated Delivery Manager,
   **When** `GET /api/v1/projects` is called,
   **Then** only projects where `delivery_manager_id = req.user.id` are returned — RBAC scoping applied in `project.service.getAll(req.user)`, never in the route handler.

8. **Given** an authenticated Finance or Admin user,
   **When** `GET /api/v1/projects` is called,
   **Then** all projects regardless of `delivery_manager_id` are returned.

9. **Given** the `projects` table migration,
   **When** this story's Prisma migration runs,
   **Then** the table is created with: `id` (UUID PK), `name`, `client`, `vertical`, `engagement_model` (enum), `status` (enum), `contract_value_paise` (BIGINT), `delivery_manager_id` (FK → users), `rejection_comment` (TEXT nullable), `completion_percent` (DECIMAL nullable), `start_date`, `end_date`, `created_at`, `updated_at`.

10. **Given** `shared/schemas/project.schema.ts`,
    **When** `POST /api/v1/projects` validates the request body,
    **Then** `createProjectSchema` uses a Zod discriminated union on `engagementModel` to enforce model-specific required fields.

11. **Given** any non-Delivery Manager role attempting `POST /api/v1/projects`,
    **When** the request is received,
    **Then** `rbacMiddleware(['delivery_manager'])` returns `403 FORBIDDEN`.

12. **Given** the `pino` logger,
    **When** any project-related log entry is written,
    **Then** `contract_value_paise` and `billing_rate_paise` are redacted (NFR9).

## Tasks / Subtasks

- [x] Task 1: Prisma migration for projects table (AC: 9)
  - [x] 1.1 Add `EngagementModel` enum: `TIME_AND_MATERIALS`, `FIXED_COST`, `AMC`, `INFRASTRUCTURE`
  - [x] 1.2 Add `ProjectStatus` enum: `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `ON_HOLD`, `COMPLETED`, `CANCELLED`
  - [x] 1.3 Add `Project` model with all columns
  - [x] 1.4 Run migration

- [x] Task 2: Zod schemas (AC: 10)
  - [x] 2.1 Create `shared/schemas/project.schema.ts` — `createProjectSchema` with Zod discriminated union on `engagementModel`
  - [x] 2.2 Add `rejectProjectSchema` (rejectionComment required string)
  - [x] 2.3 Add `updateProjectSchema` (partial fields)
  - [x] 2.4 Export from shared index

- [x] Task 3: Email utility (AC: 2, 4, 5, 6)
  - [x] 3.1 Create `lib/email.ts` — AWS SES wrapper with `sendEmail({ to, subject, body })`
  - [x] 3.2 Fire-and-forget pattern: `sendEmail().catch(logger.error)` — never await in request path
  - [x] 3.3 Use env var `AWS_SES_FROM_EMAIL` for sender; skip in dev if not configured

- [x] Task 4: Project service (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] 4.1 Create `services/project.service.ts`
  - [x] 4.2 `createProject(data, user)` — set status PENDING_APPROVAL, deliveryManagerId = user.id, fire SES to admins
  - [x] 4.3 `getAll(user)` — RBAC scoped: DM own, Admin/Finance all, DH department
  - [x] 4.4 `getById(id, user)` — with ownership check
  - [x] 4.5 `approveProject(id)` — set ACTIVE, email DM
  - [x] 4.6 `rejectProject(id, comment)` — set REJECTED, store comment, email DM
  - [x] 4.7 `updateProject(id, data, user)` — partial update, ownership check
  - [x] 4.8 `resubmitProject(id, user)` — set PENDING_APPROVAL, clear comment, email admins
  - [x] 4.9 Create `services/project.service.test.ts`

- [x] Task 5: Project routes (AC: 1, 4, 5, 6, 7, 8, 11)
  - [x] 5.1 Create `routes/projects.routes.ts` — mount at `/api/v1/projects`
  - [x] 5.2 `POST /` — `rbacMiddleware(['DELIVERY_MANAGER'])`, validate body, create
  - [x] 5.3 `GET /` — `rbacMiddleware(['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'])`, scoped getAll
  - [x] 5.4 `GET /:id` — auth + ownership check via service
  - [x] 5.5 `PATCH /:id` — `rbacMiddleware(['DELIVERY_MANAGER'])`, ownership check, update
  - [x] 5.6 `POST /:id/approve` — `rbacMiddleware(['ADMIN'])`
  - [x] 5.7 `POST /:id/reject` — `rbacMiddleware(['ADMIN'])`, validate rejectionComment
  - [x] 5.8 `POST /:id/resubmit` — `rbacMiddleware(['DELIVERY_MANAGER'])`, ownership check
  - [x] 5.9 Register in `routes/index.ts`

- [x] Task 6: Integration tests (AC: 1-12)
  - [x] 6.1 Create `routes/projects.routes.test.ts`
  - [x] 6.2 Test: DM creates project — 201, status PENDING_APPROVAL
  - [x] 6.3 Test: Admin approves — status ACTIVE
  - [x] 6.4 Test: Admin rejects with comment — status REJECTED
  - [x] 6.5 Test: DM resubmits — status PENDING_APPROVAL, comment cleared
  - [x] 6.6 Test: DM sees own projects only
  - [x] 6.7 Test: Finance/Admin sees all projects
  - [x] 6.8 Test: Non-DM cannot create — 403
  - [x] 6.9 Test: Empty rejectionComment — 400

## Dev Notes

### Architecture Constraints (MUST follow)

1. **RBAC scoping in service layer**: `getAll(user)` applies ownership filter based on role. Never in route handler.
2. **Email is fire-and-forget**: Never await email send in the request path. Use `.catch(logger.error)`.
3. **Zod discriminated union**: `createProjectSchema` validates model-specific fields based on `engagementModel`.
4. **Currency as paise**: `contractValuePaise` is BIGINT.
5. **Audit hooks**: Structure service functions so `logAuditEvent` can be appended in Epic 7 Story 7.4 after primary `prisma.$transaction` commits.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth/RBAC middleware | `middleware/` | Story 1.2 |
| Error classes | `lib/errors.ts` | ValidationError, ForbiddenError, NotFoundError |
| asyncHandler | `middleware/async-handler.ts` | Story 1.2 |
| Logger | `lib/logger.ts` | Pino with redact — add contract_value_paise, billing_rate_paise |
| User model | Prisma schema | Story 1.1 — for deliveryManagerId FK |

### Prisma Schema — New Migration Required

```prisma
enum EngagementModel {
  TIME_AND_MATERIALS
  FIXED_COST
  AMC
  INFRASTRUCTURE
}

enum ProjectStatus {
  PENDING_APPROVAL
  ACTIVE
  REJECTED
  ON_HOLD
  COMPLETED
  CANCELLED
}

model Project {
  id                 String          @id @default(uuid())
  name               String
  client             String
  vertical           String
  engagementModel    EngagementModel @map("engagement_model")
  status             ProjectStatus   @default(PENDING_APPROVAL)
  contractValuePaise BigInt?         @map("contract_value_paise")
  deliveryManagerId  String          @map("delivery_manager_id")
  deliveryManager    User            @relation(fields: [deliveryManagerId], references: [id])
  rejectionComment   String?         @map("rejection_comment")
  completionPercent  Decimal?        @map("completion_percent")
  startDate          DateTime        @map("start_date")
  endDate            DateTime        @map("end_date")
  createdAt          DateTime        @default(now()) @map("created_at")
  updatedAt          DateTime        @updatedAt @map("updated_at")

  @@map("projects")
}
```

### New Dependencies Required

- `@aws-sdk/client-ses` — AWS SES for email. Install: `pnpm --filter backend add @aws-sdk/client-ses`

### Project Structure Notes

New files to create:
```
packages/backend/src/
├── services/
│   ├── project.service.ts           # Project CRUD + approve/reject/resubmit
│   └── project.service.test.ts
├── routes/
│   ├── projects.routes.ts           # All project endpoints
│   └── projects.routes.test.ts
├── lib/
│   └── email.ts                     # AWS SES wrapper

packages/shared/src/
├── schemas/
│   └── project.schema.ts            # createProjectSchema (discriminated union)
```

Existing files to modify:
```
packages/backend/src/routes/index.ts     # Mount project routes
packages/backend/src/lib/logger.ts       # Add contract_value_paise to redact
packages/shared/src/schemas/index.ts     # Export project schemas
```

### Testing Strategy

- **Unit tests**: project.service — CRUD, RBAC scoping, email mocking
- **Integration tests**: projects.routes — full HTTP with supertest
- **RBAC tests**: DM creates, Admin approves/rejects, Finance reads all
- **Email tests**: Mock SES, verify fire-and-forget

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC Scoping, Email, Project Schema]
- [Source: _bmad-output/planning-artifacts/prd.md — FR22-FR25, FR46, FR47]

### Previous Story Intelligence

- **From Epic 1:** Auth, RBAC, error handling, middleware chain all established.
- **From Epic 2:** Service layer pattern, route pattern, Zod schema pattern well-established.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Prisma generate had a transient EPERM file lock on Windows — resolved by retrying after brief delay
- Pre-existing TS errors for `@ipis/shared` module resolution and Express 5 `req.params` type widening — consistent with existing codebase patterns, not introduced by this story

### Completion Notes List
- Implemented full project lifecycle API: create (DM), approve/reject (Admin), update/resubmit (DM)
- RBAC scoping done entirely in service layer (`getAll(user)`) — DM sees own projects, Admin/Finance see all, DEPT_HEAD sees department projects
- Email is fire-and-forget using `.then().catch(logger.error)` pattern — never blocks API response
- Zod discriminated union on `engagementModel` enforces model-specific required fields (e.g., FIXED_COST requires contractValuePaise)
- AWS SES email wrapper (`lib/email.ts`) gracefully skips in dev when `AWS_SES_FROM_EMAIL` not configured, uses lazy singleton SES client
- Logger redact list extended with `contractValuePaise`, `contract_value_paise`, `billingRatePaise`, `billing_rate_paise`
- Atomic status transitions prevent TOCTOU races in approve/reject/resubmit (compound where clause + P2025 catch)
- Status guard on updateProject — only REJECTED projects can be edited
- Date validation on createProjectSchema — ISO date format + endDate > startDate refinement
- 29 tests: 22 unit (service) + 13 integration (routes) — all 273 tests pass (237 backend + 36 shared), 0 regressions

### Code Review Record (R1)
Review model: Claude Opus 4.6

**Findings fixed:**
- H1: TOCTOU race in approve/reject/resubmit — fixed with `atomicStatusTransition()` using compound where clause
- H2: updateProject had no status guard — added `status !== 'REJECTED'` check
- M1: SES client instantiated per call — fixed with lazy singleton pattern
- M2: DEPT_HEAD got unrestricted access — now scoped to department via `deliveryManager.departmentId`
- M3: No date format/range validation — added `isoDateString` refine and endDate > startDate
- M4: Missing GET /:id integration test — added 3 tests (owning DM, non-owning DM 403, not found 404)
- L1: serializeProject loose typing — fixed with `Prisma.ProjectGetPayload` type

### File List
New files:
- packages/backend/prisma/migrations/20260224101916_add_project_management/migration.sql
- packages/backend/src/lib/email.ts
- packages/backend/src/services/project.service.ts
- packages/backend/src/services/project.service.test.ts
- packages/backend/src/routes/projects.routes.ts
- packages/backend/src/routes/projects.routes.test.ts
- packages/shared/src/schemas/project.schema.ts

Modified files:
- packages/backend/prisma/schema.prisma (added EngagementModel, ProjectStatus enums, Project model, User.managedProjects relation)
- packages/backend/src/routes/index.ts (mounted project routes at /api/v1/projects)
- packages/backend/src/lib/logger.ts (added contract_value_paise and billing_rate_paise to redact list)
- packages/shared/src/schemas/index.ts (exported project schemas)
- packages/backend/package.json (added @aws-sdk/client-ses dependency)

## Change Log
- 2026-02-24: Story 3.1 implemented — Project Management API with create, approve, reject, update, resubmit endpoints. Full RBAC, fire-and-forget email, Zod discriminated union validation. 25 tests added.
- 2026-02-24: Code review (R1) — Fixed 7 findings (2H, 4M, 1L): TOCTOU race, status guard, SES singleton, DEPT_HEAD scoping, date validation, GET /:id tests, type safety. Tests updated to 29 (22 unit + 13 integration). All 273 pass.

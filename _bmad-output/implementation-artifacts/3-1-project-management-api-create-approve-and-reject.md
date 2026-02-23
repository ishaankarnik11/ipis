# Story 3.1: Project Management API — Create, Approve & Reject

Status: ready-for-dev

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

- [ ] Task 1: Prisma migration for projects table (AC: 9)
  - [ ] 1.1 Add `EngagementModel` enum: `TIME_AND_MATERIALS`, `FIXED_COST`, `AMC`, `INFRASTRUCTURE`
  - [ ] 1.2 Add `ProjectStatus` enum: `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `ON_HOLD`, `COMPLETED`, `CANCELLED`
  - [ ] 1.3 Add `Project` model with all columns
  - [ ] 1.4 Run migration

- [ ] Task 2: Zod schemas (AC: 10)
  - [ ] 2.1 Create `shared/schemas/project.schema.ts` — `createProjectSchema` with Zod discriminated union on `engagementModel`
  - [ ] 2.2 Add `rejectProjectSchema` (rejectionComment required string)
  - [ ] 2.3 Add `updateProjectSchema` (partial fields)
  - [ ] 2.4 Export from shared index

- [ ] Task 3: Email utility (AC: 2, 4, 5, 6)
  - [ ] 3.1 Create `lib/email.ts` — AWS SES wrapper with `sendEmail({ to, subject, body })`
  - [ ] 3.2 Fire-and-forget pattern: `sendEmail().catch(logger.error)` — never await in request path
  - [ ] 3.3 Use env var `AWS_SES_FROM_EMAIL` for sender; skip in dev if not configured

- [ ] Task 4: Project service (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] 4.1 Create `services/project.service.ts`
  - [ ] 4.2 `createProject(data, user)` — set status PENDING_APPROVAL, deliveryManagerId = user.id, fire SES to admins
  - [ ] 4.3 `getAll(user)` — RBAC scoped: DM own, Admin/Finance all, DH department
  - [ ] 4.4 `getById(id, user)` — with ownership check
  - [ ] 4.5 `approveProject(id)` — set ACTIVE, email DM
  - [ ] 4.6 `rejectProject(id, comment)` — set REJECTED, store comment, email DM
  - [ ] 4.7 `updateProject(id, data, user)` — partial update, ownership check
  - [ ] 4.8 `resubmitProject(id, user)` — set PENDING_APPROVAL, clear comment, email admins
  - [ ] 4.9 Create `services/project.service.test.ts`

- [ ] Task 5: Project routes (AC: 1, 4, 5, 6, 7, 8, 11)
  - [ ] 5.1 Create `routes/projects.routes.ts` — mount at `/api/v1/projects`
  - [ ] 5.2 `POST /` — `rbacMiddleware(['delivery_manager'])`, validate body, create
  - [ ] 5.3 `GET /` — `rbacMiddleware(['admin', 'finance', 'delivery_manager', 'dept_head'])`, scoped getAll
  - [ ] 5.4 `GET /:id` — auth + ownership check via service
  - [ ] 5.5 `PATCH /:id` — `rbacMiddleware(['delivery_manager'])`, ownership check, update
  - [ ] 5.6 `POST /:id/approve` — `rbacMiddleware(['admin'])`
  - [ ] 5.7 `POST /:id/reject` — `rbacMiddleware(['admin'])`, validate rejectionComment
  - [ ] 5.8 `POST /:id/resubmit` — `rbacMiddleware(['delivery_manager'])`, ownership check
  - [ ] 5.9 Register in `routes/index.ts`

- [ ] Task 6: Integration tests (AC: 1-12)
  - [ ] 6.1 Create `routes/projects.routes.test.ts`
  - [ ] 6.2 Test: DM creates project — 201, status PENDING_APPROVAL
  - [ ] 6.3 Test: Admin approves — status ACTIVE
  - [ ] 6.4 Test: Admin rejects with comment — status REJECTED
  - [ ] 6.5 Test: DM resubmits — status PENDING_APPROVAL, comment cleared
  - [ ] 6.6 Test: DM sees own projects only
  - [ ] 6.7 Test: Finance/Admin sees all projects
  - [ ] 6.8 Test: Non-DM cannot create — 403
  - [ ] 6.9 Test: Empty rejectionComment — 400

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
### Debug Log References
### Completion Notes List
### File List

# Story 1.4: User & Role Management API

Status: done

## Story

As an Admin,
I want API endpoints to create, edit, and deactivate users, assign roles, and configure system settings,
so that access control and operational parameters are managed programmatically and securely.

## Acceptance Criteria (AC)

1. **Given** an authenticated Admin,
   **When** `POST /api/v1/users` is called with `{ name, email, role, departmentId? }`,
   **Then** a new user is created with a bcrypt-hashed temporary password, `is_active: true`, `must_change_password: true`, and returns `{ data: { id, name, email, role, isActive } }`.

2. **Given** an authenticated Admin,
   **When** `GET /api/v1/users` is called,
   **Then** all users are returned in `{ data: [...], meta: { total } }` format with fields: `id, name, email, role, departmentId, isActive`.

3. **Given** an authenticated Admin,
   **When** `PATCH /api/v1/users/:id` is called with `{ name?, role?, departmentId? }`,
   **Then** only the provided fields are updated and the updated user is returned.

4. **Given** an authenticated Admin,
   **When** `PATCH /api/v1/users/:id` is called with `{ isActive: false }`,
   **Then** `users.is_active` is set to `false`; subsequent login attempts for that user return `401`.

5. **Given** an authenticated Admin,
   **When** `GET /api/v1/config` is called,
   **Then** the response returns `{ data: { standardMonthlyHours, healthyMarginThreshold, atRiskMarginThreshold } }`.

6. **Given** an authenticated Admin,
   **When** `PUT /api/v1/config` is called with `{ standardMonthlyHours: 176 }`,
   **Then** the `system_config` record is updated and confirmed with `{ success: true }` — validated via Zod, integer only.

7. **Given** any non-Admin role (finance, hr, delivery_manager, dept_head),
   **When** any user management or config endpoint is called,
   **Then** `rbacMiddleware(['admin'])` returns `403 FORBIDDEN` — verified by RBAC unit tests for all four non-admin roles.

8. **Given** every protected route,
   **When** the middleware chain is applied,
   **Then** the order is always: `authMiddleware` -> `rbacMiddleware([...roles])` -> `asyncHandler(routeHandler)` — no exceptions.

9. **Given** all user management service functions,
   **When** they execute,
   **Then** they call Prisma only from within `user.service.ts` — route handlers in `users.routes.ts` never import Prisma directly.

## Tasks / Subtasks

- [x] Task 1: Zod schemas for user CRUD and config (AC: 1, 3, 6)
  - [x] 1.1 Create `shared/src/schemas/user.schema.ts` — `createUserSchema` (name, email, role, departmentId?), `updateUserSchema` (all optional), `systemConfigSchema` (standardMonthlyHours integer)
  - [x] 1.2 Export from `shared/src/schemas/index.ts`
  - [x] 1.3 Export from `shared/src/index.ts`

- [x] Task 2: User service (AC: 1, 2, 3, 4, 9)
  - [x] 2.1 Create `services/user.service.ts` — `createUser({ name, email, role, departmentId? })`: generate temp password, bcrypt hash, create user with `mustChangePassword: true`
  - [x] 2.2 Add `getAll()` — return all users with `id, name, email, role, departmentId, isActive`
  - [x] 2.3 Add `updateUser(id, { name?, role?, departmentId?, isActive? })` — partial update, return updated user
  - [x] 2.4 Add `generateTemporaryPassword()` — returns a random secure string (crypto.randomUUID or similar)
  - [x] 2.5 Create `services/user.service.test.ts` — unit tests with mocked Prisma

- [x] Task 3: Config service (AC: 5, 6)
  - [x] 3.1 Create `services/config.service.ts` — `getConfig()`: fetch the single `system_config` row, return camelCase fields
  - [x] 3.2 Add `updateConfig({ standardMonthlyHours?, healthyMarginThreshold?, atRiskMarginThreshold? })` — upsert the config row
  - [x] 3.3 Create `services/config.service.test.ts` — unit tests

- [x] Task 4: User routes (AC: 1, 2, 3, 4, 7, 8)
  - [x] 4.1 Create `routes/users.routes.ts` — mount at `/api/v1/users`
  - [x] 4.2 `POST /` — `authMiddleware`, `rbacMiddleware(['admin'])`, validate body with `createUserSchema`, call `userService.createUser()`
  - [x] 4.3 `GET /` — `authMiddleware`, `rbacMiddleware(['admin'])`, call `userService.getAll()`
  - [x] 4.4 `PATCH /:id` — `authMiddleware`, `rbacMiddleware(['admin'])`, validate body with `updateUserSchema`, call `userService.updateUser()`
  - [x] 4.5 Register in `routes/index.ts`

- [x] Task 5: Config routes (AC: 5, 6, 7, 8)
  - [x] 5.1 Create `routes/config.routes.ts` — mount at `/api/v1/config`
  - [x] 5.2 `GET /` — `authMiddleware`, `rbacMiddleware(['admin'])`, call `configService.getConfig()`
  - [x] 5.3 `PUT /` — `authMiddleware`, `rbacMiddleware(['admin'])`, validate body with `systemConfigSchema`, call `configService.updateConfig()`
  - [x] 5.4 Register in `routes/index.ts`

- [x] Task 6: Department list endpoint (AC: 1)
  - [x] 6.1 Add `GET /api/v1/departments` — `authMiddleware`, `rbacMiddleware(['admin'])`, return all departments
  - [x] 6.2 This supports the department dropdown in the user creation form (Story 1.5)

- [x] Task 7: Seed data for departments (AC: 2)
  - [x] 7.1 Update `prisma/seed.ts` (from Story 1.2) to also seed 3-5 departments for testing
  - [x] 7.2 Seed a department head user linked to a department

- [x] Task 8: Integration tests (AC: 1-9)
  - [x] 8.1 Create `routes/users.routes.test.ts` — integration tests with supertest
  - [x] 8.2 Test: Admin creates user — returns 201 with user data (no password in response)
  - [x] 8.3 Test: Admin lists users — returns all with meta.total
  - [x] 8.4 Test: Admin updates user — returns updated user
  - [x] 8.5 Test: Admin deactivates user — isActive becomes false
  - [x] 8.6 Test: Non-admin (Finance, HR, DM, DH) gets 403 on all endpoints
  - [x] 8.7 Test: Duplicate email returns 409 CONFLICT
  - [x] 8.8 Test: Invalid body returns 400 VALIDATION_ERROR
  - [x] 8.9 Create `routes/config.routes.test.ts` — Admin reads/updates config, non-admin gets 403

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Layer separation**: Routes -> Services -> Prisma. Route handlers in `users.routes.ts` NEVER import Prisma.
2. **asyncHandler**: Wrap ALL async route handlers with `asyncHandler()`. Never try/catch in routes.
3. **Middleware chain order**: `authMiddleware` -> `rbacMiddleware([...roles])` -> `asyncHandler(handler)` — always.
4. **RBAC middleware**: Admin-only on all user management and config endpoints. Use `rbacMiddleware(['admin'])`.
5. **Data scoping**: For this story, all endpoints are Admin-only (no per-role data filtering needed). Future stories will add scoped queries.
6. **Error response shape**: `{ error: { code, message, details? } }` — reuse existing error classes.
7. **camelCase in API responses**: Prisma maps `snake_case` DB columns to `camelCase` automatically via `@map()`.
8. **Null for absent optional fields**: Return `null` (never `""` or `undefined`) for optional `departmentId`.
9. **Temporary passwords**: Generate a random string (e.g., `crypto.randomUUID().slice(0, 12)`), bcrypt hash it, set `mustChangePassword: true`. The plaintext temporary password is returned to Admin in the creation response ONLY (for communication to the user).
10. **Audit hooks**: Structure service functions so `logAuditEvent` calls can be appended in Epic 7 Story 7.4 without refactoring.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth middleware | `middleware/auth.middleware.ts` | Created in Story 1.2 — validates JWT, attaches req.user |
| RBAC middleware | `middleware/rbac.middleware.ts` | Created in Story 1.2 — checks role against allowed list |
| Validate middleware | `middleware/validate.middleware.ts` | Created in Story 1.2 — Zod validation factory |
| asyncHandler | `middleware/async-handler.ts` | Wraps async route handlers |
| Error classes | `lib/errors.ts` | `ValidationError`, `ConflictError`, `ForbiddenError`, `NotFoundError` |
| Error middleware | `middleware/error.middleware.ts` | Formats all AppError subclasses |
| Prisma client | `lib/prisma.ts` | Singleton |
| Config | `lib/config.ts` | Typed env vars |
| Logger | `lib/logger.ts` | Pino with redact |
| bcrypt | Already installed | `import bcrypt from 'bcrypt'` |
| UserRole type | `shared/types/index.ts` | Reuse for validation |

### Prisma Schema — Already Complete

The existing schema has all required models:
- `User`: id, email, passwordHash, name, role (UserRole enum), departmentId?, isActive, mustChangePassword, createdAt, updatedAt
- `Department`: id, name (unique), headUserId?, createdAt, users[]
- `SystemConfig`: id, standardMonthlyHours (default 160), healthyMarginThreshold, atRiskMarginThreshold, updatedAt

No new migration needed.

### API Response Patterns

```typescript
// Create user — 201
res.status(201).json({ data: { id, name, email, role, isActive, temporaryPassword } });

// List users — 200
res.json({ data: users, meta: { total: users.length } });

// Update user — 200
res.json({ data: updatedUser });

// Get config — 200
res.json({ data: { standardMonthlyHours, healthyMarginThreshold, atRiskMarginThreshold } });

// Update config — 200
res.json({ success: true });
```

### Zod Schema Patterns

```typescript
// shared/src/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
  departmentId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const systemConfigSchema = z.object({
  standardMonthlyHours: z.number().int().min(1).max(744).optional(),
  healthyMarginThreshold: z.number().min(0).max(1).optional(),
  atRiskMarginThreshold: z.number().min(0).max(1).optional(),
});
```

### Duplicate Email Handling

```typescript
// In user.service.ts
import { ConflictError } from '../lib/errors.js';

async function createUser(data: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('A user with this email already exists');
  // ... create user
}
```

### New Dependencies Required

None — all dependencies (`bcrypt`, `prisma`, `zod`) already installed.

### Project Structure Notes

New files to create:
```
packages/backend/src/
├── services/
│   ├── user.service.ts            # User CRUD business logic
│   ├── user.service.test.ts       # Unit tests
│   ├── config.service.ts          # System config logic
│   └── config.service.test.ts     # Unit tests
├── routes/
│   ├── users.routes.ts            # POST, GET, PATCH /api/v1/users
│   ├── users.routes.test.ts       # Integration tests
│   ├── config.routes.ts           # GET, PUT /api/v1/config
│   └── config.routes.test.ts      # Integration tests

packages/shared/src/
├── schemas/
│   └── user.schema.ts             # createUserSchema, updateUserSchema, systemConfigSchema
```

Existing files to modify:
```
packages/backend/src/routes/index.ts    # Mount users + config routes
packages/shared/src/schemas/index.ts    # Export user schemas
packages/shared/src/index.ts            # Export user schemas
packages/backend/prisma/seed.ts         # Add department seed data
```

### Testing Strategy

- **Unit tests** (Vitest, mocked Prisma): user.service, config.service
- **Integration tests** (Vitest + supertest): users.routes, config.routes — full HTTP request/response
- **RBAC tests**: Every endpoint tested with all 5 roles (Admin succeeds, other 4 get 403)
- **Validation tests**: Invalid body returns 400, duplicate email returns 409
- **Co-located test files**: `*.test.ts` next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — User CRUD, RBAC, Middleware Chain, Data Scoping]
- [Source: _bmad-output/planning-artifacts/prd.md — FR5-FR10, NFR8, RBAC Matrix]
- [Source: _bmad-output/implementation-artifacts/1-2-authentication-api-login-session-and-logout.md — Middleware patterns]

### Previous Story Intelligence (from Stories 1.1 and 1.2)

**From 1.1:** Prisma schema has User, Department, SystemConfig models ready. Error classes in `lib/errors.ts` cover all needed HTTP status codes. asyncHandler wrapper in place.

**From 1.2 (ready-for-dev):** Auth middleware and RBAC middleware will be created. Validate middleware (Zod) will be created. bcrypt utility for password hashing. These are dependencies — Story 1.2 must be implemented first.

**Issues to avoid:**
- Never use `console.log` — use `logger` from `lib/logger.ts`
- jose is v5 (not v6), bcrypt hash with salt rounds 10
- Prisma auto-maps `snake_case` to `camelCase` — don't manually transform

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Integration test failures due to incorrect Prisma mock setup — auth middleware does NOT call `prisma.user.findUnique` (only verifies JWT). Removed unnecessary mocks that were being consumed by wrong service calls. Fixed by having each test call `loginAs()` inline instead of using shared `beforeEach` cookies with extra mock layers.

### Completion Notes List

- **Task 1**: Created Zod schemas (`createUserSchema`, `updateUserSchema`, `systemConfigSchema`) with 24 unit tests covering all validation rules, edge cases, and all 5 valid roles.
- **Task 2**: Implemented `user.service.ts` with `createUser` (bcrypt hashing, temp password, duplicate check), `getAll`, `updateUser`, and `getAllDepartments`. 9 unit tests with mocked Prisma.
- **Task 3**: Implemented `config.service.ts` with `getConfig` (returns defaults if no row), `updateConfig` (upsert). 4 unit tests.
- **Task 4**: Created `users.routes.ts` with POST/GET/PATCH endpoints, correct middleware chain: `authMiddleware` → `rbacMiddleware(['ADMIN'])` → `validate(schema)` → `asyncHandler(handler)`.
- **Task 5**: Created `config.routes.ts` with GET/PUT endpoints, same middleware chain pattern.
- **Task 6**: Added `GET /api/v1/departments` endpoint via `departments.routes.ts`, uses `userService.getAllDepartments()` to maintain layer separation.
- **Task 7**: Updated seed.ts with 5 departments (Engineering, Finance, Human Resources, Delivery, Operations) and a DEPT_HEAD user linked to Engineering.
- **Task 8**: Created comprehensive integration tests — 22 tests for users/departments routes (CRUD, RBAC for all 4 non-admin roles, duplicate email 409, validation 400) and 11 tests for config routes (read/update, validation, RBAC). All 114 tests pass across both packages.

### Change Log

- 2026-02-24: Implemented Story 1.4 — User & Role Management API. Added Zod schemas, user/config services, CRUD routes, department endpoint, seed data, and comprehensive test suite. 114 total tests pass (78 backend + 36 shared).
- 2026-02-24: **Code Review Fixes** — Added department join to USER_SELECT + flattenUser helper (departmentName in responses); replaced `as never` with proper Prisma/shared types; added P2025 → NotFoundError handling in updateUser; added 404 test + updated all mocks with department data in unit and integration tests. 223 total tests pass (133 backend + 36 shared + 54 frontend).

### File List

New files:
- `packages/shared/src/schemas/user.schema.ts`
- `packages/shared/src/schemas/user.schema.test.ts`
- `packages/backend/src/services/user.service.ts`
- `packages/backend/src/services/user.service.test.ts`
- `packages/backend/src/services/config.service.ts`
- `packages/backend/src/services/config.service.test.ts`
- `packages/backend/src/routes/users.routes.ts`
- `packages/backend/src/routes/users.routes.test.ts`
- `packages/backend/src/routes/config.routes.ts`
- `packages/backend/src/routes/config.routes.test.ts`
- `packages/backend/src/routes/departments.routes.ts`

Modified files:
- `packages/shared/src/schemas/index.ts` (added user schema exports)
- `packages/backend/src/routes/index.ts` (mounted users, config, departments routes)
- `packages/backend/prisma/seed.ts` (added 4 more departments and dept_head user)

Modified files (code review):
- `packages/backend/src/services/user.service.ts` (department join, flattenUser, proper types, NotFoundError)
- `packages/backend/src/services/user.service.test.ts` (department mock data, 404 test)
- `packages/backend/src/routes/users.routes.test.ts` (department mock data, departmentName assertions)

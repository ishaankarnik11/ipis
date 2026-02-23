# Story 2.2: Individual Employee Management API

Status: ready-for-dev

## Story

As an HR user,
I want to add individual employees, update their details, and mark them as resigned via API,
so that new joiners and salary revisions are reflected in cost calculations immediately without a full bulk re-upload.

## Acceptance Criteria (AC)

1. **Given** an authenticated HR user,
   **When** `POST /api/v1/employees` is called with `{ employeeCode, name, departmentId, designation, annualCtcPaise, joiningDate, isBillable? }`,
   **Then** a new employee is created and the response returns `{ data: { id, employeeCode, name, designation, annualCtcPaise, isBillable, isResigned: false } }`.

2. **Given** an authenticated HR user,
   **When** `PATCH /api/v1/employees/:id` is called with `{ designation?, annualCtcPaise?, departmentId?, isBillable? }`,
   **Then** only the provided fields are updated; `annualCtcPaise` must be a positive integer (Zod validation).

3. **Given** an authenticated HR user,
   **When** `PATCH /api/v1/employees/:id/resign` is called,
   **Then** `is_resigned` is set to `true` and the employee is excluded from future cost calculations for new uploads.

4. **Given** an authenticated Admin or Finance user,
   **When** `GET /api/v1/employees` is called,
   **Then** all employees (active and resigned) are returned including `annualCtcPaise` — Finance has full salary data access per RBAC matrix; pino redacts CTC from logs.

5. **Given** an authenticated HR user,
   **When** `GET /api/v1/employees` is called,
   **Then** employees are returned without `annualCtcPaise` — HR manages records but does not view financial data per RBAC matrix.

6. **Given** `POST /api/v1/employees` is called with a duplicate `employee_code`,
   **When** the database constraint fires,
   **Then** the response is `409 CONFLICT` with `{ error: { code: "CONFLICT", message: "Employee code [code] already exists" } }`.

7. **Given** a resigned employee,
   **When** `PATCH /api/v1/employees/:id` is called,
   **Then** the service rejects the update with `400 VALIDATION_ERROR`: `"Cannot edit a resigned employee"` — resigned status is terminal.

8. **Given** any non-HR user attempting `POST /api/v1/employees` or `PATCH /api/v1/employees/:id`,
   **When** the request is received,
   **Then** `rbacMiddleware(['hr'])` returns `403 FORBIDDEN` — RBAC test confirms all non-HR roles receive `403`.

9. **Given** `GET /api/v1/employees/:id` is called,
   **When** the employee does not exist,
   **Then** the response is `404 NOT_FOUND` with `{ error: { code: "NOT_FOUND", message: "Employee not found" } }`.

## Tasks / Subtasks

- [ ] Task 1: Extend Zod schemas (AC: 1, 2)
  - [ ] 1.1 Add `updateEmployeeSchema` to `shared/src/schemas/employee.schema.ts` — `designation?`, `annualCtcPaise?` (int, positive), `departmentId?` (uuid), `isBillable?`
  - [ ] 1.2 Ensure `createEmployeeSchema` from Story 2.1 covers all fields

- [ ] Task 2: Employee service — individual CRUD (AC: 1, 2, 3, 4, 5, 6, 7, 9)
  - [ ] 2.1 Add `createEmployee(data)` to `employee.service.ts` — check duplicate employee_code, create employee, return data
  - [ ] 2.2 Add `getAll(user: AuthUser)` — return all employees; if `user.role === 'HR'`, omit `annualCtcPaise` from select; Finance/Admin see all fields
  - [ ] 2.3 Add `getById(id, user)` — single employee lookup with same RBAC field filtering
  - [ ] 2.4 Add `updateEmployee(id, data)` — check `isResigned`, reject if true; partial update
  - [ ] 2.5 Add `resignEmployee(id)` — set `isResigned: true`
  - [ ] 2.6 Update `employee.service.test.ts` — test CRUD, duplicate handling, resigned rejection, RBAC field filtering

- [ ] Task 3: Employee routes — CRUD endpoints (AC: 1, 2, 3, 4, 5, 8, 9)
  - [ ] 3.1 Add to `routes/employees.routes.ts`:
    - `POST /` — `authMiddleware`, `rbacMiddleware(['hr'])`, validate body, call `createEmployee()`
    - `GET /` — `authMiddleware`, `rbacMiddleware(['hr', 'admin', 'finance'])`, call `getAll(req.user)`
    - `GET /:id` — `authMiddleware`, `rbacMiddleware(['hr', 'admin', 'finance'])`, call `getById()`
    - `PATCH /:id` — `authMiddleware`, `rbacMiddleware(['hr'])`, validate body, call `updateEmployee()`
    - `PATCH /:id/resign` — `authMiddleware`, `rbacMiddleware(['hr'])`, call `resignEmployee()`

- [ ] Task 4: Integration tests (AC: 1-9)
  - [ ] 4.1 Update `routes/employees.routes.test.ts`
  - [ ] 4.2 Test: HR creates employee — 201 with correct response shape
  - [ ] 4.3 Test: HR updates employee — only provided fields change
  - [ ] 4.4 Test: HR resigns employee — isResigned becomes true
  - [ ] 4.5 Test: HR edits resigned employee — 400 VALIDATION_ERROR
  - [ ] 4.6 Test: Finance/Admin GET — annualCtcPaise included
  - [ ] 4.7 Test: HR GET — annualCtcPaise excluded
  - [ ] 4.8 Test: Duplicate employee_code — 409 CONFLICT
  - [ ] 4.9 Test: Non-existent employee — 404
  - [ ] 4.10 Test: Non-HR roles (DM, DH) get 403 on write endpoints

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Layer separation**: Routes → Services → Prisma. Never import Prisma in route handlers.
2. **asyncHandler**: Wrap ALL async route handlers.
3. **Middleware chain**: `authMiddleware` → `rbacMiddleware([...roles])` → `asyncHandler(handler)`.
4. **RBAC field filtering**: The GET /employees endpoint returns different fields based on role. This logic lives in the SERVICE layer (employee.service.getAll), NOT in the route handler.
5. **Resigned = terminal**: Once `isResigned: true`, no updates allowed. Service must check before any mutation.
6. **Currency as paise**: `annualCtcPaise` is BIGINT integer paise.
7. **pino redact**: `annual_ctc_paise` stripped from all log output.
8. **Null for absent fields**: Return `null` (never `""` or `undefined`) for optional fields.
9. **Audit hooks**: Structure functions so `logAuditEvent` can be appended in Epic 7.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth middleware | `middleware/auth.middleware.ts` | Story 1.2 |
| RBAC middleware | `middleware/rbac.middleware.ts` | Story 1.2 |
| Validate middleware | `middleware/validate.middleware.ts` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.2 |
| Error classes | `lib/errors.ts` | ValidationError, ConflictError, NotFoundError |
| Error middleware | `middleware/error.middleware.ts` | Story 1.2 |
| Prisma client | `lib/prisma.ts` | Singleton |
| Logger | `lib/logger.ts` | Pino with redact |
| Employee model | Prisma schema | Created in Story 2.1 |
| employee.service.ts | `services/employee.service.ts` | Bulk upload from Story 2.1 — extend, don't recreate |
| employees.routes.ts | `routes/employees.routes.ts` | Bulk upload routes from Story 2.1 — extend |
| Zod schemas | `shared/schemas/employee.schema.ts` | From Story 2.1 — extend |

### Prisma Schema — No New Migration

The `Employee` model was created in Story 2.1 with all required columns. No additional migration needed.

### API Response Patterns

```typescript
// Create employee — 201
res.status(201).json({ data: { id, employeeCode, name, designation, annualCtcPaise, isBillable, isResigned: false } });

// List employees (Finance/Admin) — 200
res.json({ data: employees, meta: { total: employees.length } });
// employees include: id, employeeCode, name, designation, departmentId, annualCtcPaise, isBillable, isResigned

// List employees (HR) — 200
res.json({ data: employees, meta: { total: employees.length } });
// employees include: id, employeeCode, name, designation, departmentId, isBillable, isResigned
// NOTE: annualCtcPaise is OMITTED for HR

// Update employee — 200
res.json({ data: updatedEmployee });

// Resign employee — 200
res.json({ success: true });

// Duplicate — 409
res.status(409).json({ error: { code: "CONFLICT", message: "Employee code EMP042 already exists" } });

// Resign then edit — 400
res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot edit a resigned employee" } });
```

### New Dependencies Required

None — all dependencies already installed in Story 2.1.

### Project Structure Notes

Files to modify (all created in Story 2.1):
```
packages/backend/src/services/employee.service.ts      # Add CRUD methods
packages/backend/src/services/employee.service.test.ts  # Add CRUD tests
packages/backend/src/routes/employees.routes.ts         # Add CRUD routes
packages/backend/src/routes/employees.routes.test.ts    # Add integration tests
packages/shared/src/schemas/employee.schema.ts          # Add updateEmployeeSchema
```

### Testing Strategy

- **Unit tests** (Vitest, mocked Prisma): CRUD operations, RBAC field filtering, resigned rejection
- **Integration tests** (Vitest + supertest): Full HTTP request/response
- **RBAC tests**: HR can write, Finance/Admin can read with CTC, HR reads without CTC, DM/DH get 403
- **Co-located test files**: `*.test.ts` next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC Scoping, Service Layer, Data Format Rules]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14, FR15, FR16, NFR9]

### Previous Story Intelligence (from Story 2.1)

- **From 2.1:** Employee model, employee.service.ts, employees.routes.ts, employee.schema.ts all created. Extend these files — do NOT create new ones.
- **From 2.1:** multer + xlsx installed. Excel parsing in lib/excel.ts.
- **From 2.1:** RBAC pattern: `rbacMiddleware(['hr'])` for write endpoints.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

# Story 2.1: Employee Salary Master — Bulk Upload API

Status: done

## Story

As an HR user,
I want to upload an Excel file containing all employee salary data and have valid records imported automatically while failed rows are returned for correction,
so that the complete salary master is available for profitability calculations without requiring manual entry of every record.

## Acceptance Criteria (AC)

1. **Given** an authenticated HR user,
   **When** `POST /api/v1/employees/bulk-upload` is called with a multipart Excel file,
   **Then** the file is parsed server-side using `xlsx` (SheetJS) and each row is validated independently using the row-level model — the upload is never fully rejected; valid rows proceed regardless of invalid rows.

2. **Given** a bulk upload containing valid rows,
   **When** valid rows are processed,
   **Then** they are inserted via `prisma.employee.createMany({ data: validRows })` and the response returns `{ data: { imported: N, failed: M, failedRows: [{ row, employeeCode, error }] } }`.

3. **Given** a bulk upload with some invalid rows (missing required field, invalid department code, duplicate `employee_code`),
   **When** processing occurs,
   **Then** valid rows are imported immediately and invalid rows are returned with their row number and a specific error message — never a generic "row failed".

4. **Given** an HR user correcting failed rows,
   **When** `POST /api/v1/employees/bulk-upload` is called with only the corrected rows,
   **Then** corrected rows are validated and imported; existing employee records are not affected; duplicate `employee_code` rows return `409 CONFLICT` in the `failedRows` array.

5. **Given** a request to `GET /api/v1/employees/sample-template`,
   **When** called by any authenticated HR user,
   **Then** a pre-formatted `.xlsx` file is returned as a download with correct column headers: `employee_code`, `name`, `department`, `designation`, `annual_ctc`, `joining_date`, `is_billable`.

6. **Given** the `employees` table migration,
   **When** this story's Prisma migration runs,
   **Then** the `employees` table is created with columns: `id` (UUID PK), `employee_code` (VARCHAR UNIQUE), `name`, `department_id` (FK → departments), `designation`, `annual_ctc_paise` (BIGINT), `overhead_paise` (BIGINT DEFAULT 18000000), `joining_date`, `is_billable` (BOOLEAN DEFAULT true), `is_resigned` (BOOLEAN DEFAULT false), `created_at`, `updated_at`.

7. **Given** the `shared/schemas/employee.schema.ts` Zod schema,
   **When** the upload endpoint validates a parsed row,
   **Then** `employeeRowSchema` enforces: `employee_code` (non-empty string), `name` (non-empty), `department` (must match existing department name), `designation` (non-empty), `annual_ctc` (positive number); `joining_date` and `is_billable` are optional.

8. **Given** any non-HR user (admin, finance, delivery_manager, dept_head),
   **When** `POST /api/v1/employees/bulk-upload` is called,
   **Then** `rbacMiddleware(['hr'])` returns `403 FORBIDDEN` — verified by RBAC unit tests for all four non-HR roles.

9. **Given** the employee upload service,
   **When** it executes,
   **Then** Prisma is called only from `employee.service.ts` — `employees.routes.ts` never imports Prisma directly.

10. **Given** the `pino` logger is active,
    **When** any employee-related log entry is written,
    **Then** `annual_ctc_paise` is redacted from all log output (NFR9).

## Tasks / Subtasks

- [x] Task 1: Prisma migration for employees table (AC: 6)
  - [x] 1.1 Add `Employee` model to `schema.prisma` with all columns from AC 6
  - [x] 1.2 Add `employee_code` unique constraint
  - [x] 1.3 Add `department_id` foreign key relation to `Department` model
  - [x] 1.4 Run `pnpm --filter backend migrate` and verify migration

- [x] Task 2: Zod schemas for employee (AC: 7)
  - [x] 2.1 Create `shared/src/schemas/employee.schema.ts` — `employeeRowSchema`, `bulkUploadResponseSchema`
  - [x] 2.2 Export from `shared/src/schemas/index.ts`
  - [x] 2.3 Export from `shared/src/index.ts`

- [x] Task 3: Employee service — bulk upload (AC: 1, 2, 3, 4, 9)
  - [x] 3.1 Create `services/employee.service.ts`
  - [x] 3.2 Add `bulkUpload(file: Buffer)` — parse Excel via `xlsx`, validate each row against `employeeRowSchema`, batch-lookup departments, collect valid/invalid
  - [x] 3.3 Insert valid rows via `prisma.employee.createMany({ data: validRows })`
  - [x] 3.4 Return `{ imported, failed, failedRows }` — each failed row includes row number and specific error
  - [x] 3.5 Handle duplicate `employee_code` as `409 CONFLICT` in failedRows
  - [x] 3.6 Create `services/employee.service.test.ts` — unit tests with mocked Prisma

- [x] Task 4: Excel parsing utility (AC: 1, 5)
  - [x] 4.1 Create `lib/excel.ts` — `parseExcelToRows(buffer: Buffer): ParsedRow[]` using `xlsx` package
  - [x] 4.2 Add `generateSampleTemplate(): Buffer` — returns `.xlsx` buffer with correct headers
  - [x] 4.3 Write tests for parsing and template generation

- [x] Task 5: Employee routes — bulk upload + template (AC: 1, 5, 8)
  - [x] 5.1 Create `routes/employees.routes.ts` — mount at `/api/v1/employees`
  - [x] 5.2 `POST /bulk-upload` — `authMiddleware`, `rbacMiddleware(['hr'])`, multer single file upload, call `employeeService.bulkUpload()`
  - [x] 5.3 `GET /sample-template` — `authMiddleware`, `rbacMiddleware(['hr'])`, return `.xlsx` download
  - [x] 5.4 Register in `routes/index.ts`

- [x] Task 6: Upload middleware (multer) (AC: 1)
  - [x] 6.1 Create `middleware/upload.middleware.ts` — multer config for `.xlsx` files, memory storage, 10MB limit
  - [x] 6.2 File type validation (reject non-xlsx)

- [x] Task 7: Integration tests (AC: 1-10)
  - [x] 7.1 Create `routes/employees.routes.test.ts`
  - [x] 7.2 Test: HR uploads valid file — all rows imported, response shape correct
  - [x] 7.3 Test: HR uploads mixed valid/invalid — valid imported, invalid returned with specific errors
  - [x] 7.4 Test: HR re-uploads corrected rows — new rows imported
  - [x] 7.5 Test: Duplicate employee_code — 409 in failedRows
  - [x] 7.6 Test: Non-HR roles (Admin, Finance, DM, DH) get 403
  - [x] 7.7 Test: Sample template download returns xlsx
  - [x] 7.8 Test: CTC not in log output (pino redact)

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Row-level validation model** — NOT atomic. Valid rows import regardless of invalid rows. Never reject the entire file.
2. **Layer separation**: Routes → Services → Prisma. Route handlers NEVER import Prisma directly.
3. **asyncHandler**: Wrap ALL async route handlers with `asyncHandler()`.
4. **Middleware chain**: `authMiddleware` → `rbacMiddleware(['hr'])` → `asyncHandler(handler)`.
5. **Error response shape**: `{ error: { code, message, details? } }`.
6. **Currency as paise**: `annual_ctc_paise` is BIGINT integer paise. Never store decimal currency.
7. **pino redact**: `annual_ctc_paise` stripped from all log output (NFR9).
8. **Audit hooks**: Structure service functions so `logAuditEvent` calls can be appended in Epic 7 Story 7.4.
9. **Server-side parsing only**: All Excel parsing happens on the server via `xlsx` (SheetJS). No client-side data processing.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth middleware | `middleware/auth.middleware.ts` | Story 1.2 — validates JWT, attaches req.user |
| RBAC middleware | `middleware/rbac.middleware.ts` | Story 1.2 — checks role against allowed list |
| Validate middleware | `middleware/validate.middleware.ts` | Story 1.2 — Zod validation factory |
| asyncHandler | `middleware/async-handler.ts` | Wraps async route handlers |
| Error classes | `lib/errors.ts` | `ValidationError`, `ConflictError`, `ForbiddenError`, `NotFoundError` |
| Error middleware | `middleware/error.middleware.ts` | Formats all AppError subclasses |
| Prisma client | `lib/prisma.ts` | Singleton |
| Config | `lib/config.ts` | Typed env vars |
| Logger | `lib/logger.ts` | Pino with redact |
| Department model | Prisma schema | Created in Story 1.1 |

### Prisma Schema — New Migration Required

Add `Employee` model:
```prisma
model Employee {
  id              String   @id @default(uuid())
  employeeCode    String   @unique @map("employee_code")
  name            String
  departmentId    String   @map("department_id")
  department      Department @relation(fields: [departmentId], references: [id])
  designation     String
  annualCtcPaise  BigInt   @map("annual_ctc_paise")
  overheadPaise   BigInt   @default(18000000) @map("overhead_paise")
  joiningDate     DateTime? @map("joining_date")
  isBillable      Boolean  @default(true) @map("is_billable")
  isResigned      Boolean  @default(false) @map("is_resigned")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("employees")
}
```

### API Response Patterns

```typescript
// Bulk upload — 200
res.json({
  data: {
    imported: 45,
    failed: 3,
    failedRows: [
      { row: 12, employeeCode: "EMP042", error: "Department 'Sales' not found" },
      { row: 28, employeeCode: "EMP015", error: "Employee code already exists" },
      { row: 33, employeeCode: "", error: "employee_code is required" },
    ]
  }
});

// Sample template download — 200
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=employee-salary-template.xlsx');
res.send(templateBuffer);
```

### Zod Schema Patterns

```typescript
// shared/src/schemas/employee.schema.ts
import { z } from 'zod';

export const employeeRowSchema = z.object({
  employee_code: z.string().min(1, 'employee_code is required'),
  name: z.string().min(1, 'name is required'),
  department: z.string().min(1, 'department is required'),
  designation: z.string().min(1, 'designation is required'),
  annual_ctc: z.number().positive('annual_ctc must be positive'),
  joining_date: z.string().optional(),
  is_billable: z.boolean().optional().default(true),
});

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().uuid(),
  designation: z.string().min(1),
  annualCtcPaise: z.number().int().positive(),
  joiningDate: z.string().optional(),
  isBillable: z.boolean().optional().default(true),
});
```

### New Dependencies Required

- `xlsx` (SheetJS) — server-side Excel parsing. Install: `pnpm --filter backend add xlsx`
- `multer` + `@types/multer` — file upload middleware. Install: `pnpm --filter backend add multer && pnpm --filter backend add -D @types/multer`

### Project Structure Notes

New files to create:
```
packages/backend/src/
├── services/
│   ├── employee.service.ts          # Bulk upload + CRUD business logic
│   └── employee.service.test.ts     # Unit tests
├── routes/
│   ├── employees.routes.ts          # POST /bulk-upload, GET /sample-template
│   └── employees.routes.test.ts     # Integration tests
├── middleware/
│   └── upload.middleware.ts         # multer config
├── lib/
│   └── excel.ts                    # xlsx parse helpers + template generator

packages/shared/src/
├── schemas/
│   └── employee.schema.ts          # employeeRowSchema, createEmployeeSchema
```

Existing files to modify:
```
packages/backend/src/routes/index.ts    # Mount employees routes
packages/shared/src/schemas/index.ts    # Export employee schemas
packages/shared/src/index.ts            # Export employee schemas
```

### Testing Strategy

- **Unit tests** (Vitest, mocked Prisma): employee.service — valid upload, mixed rows, duplicate handling
- **Integration tests** (Vitest + supertest): employees.routes — full HTTP request/response with real file uploads
- **RBAC tests**: Every endpoint tested with all 5 roles (HR succeeds, other 4 get 403)
- **Excel tests**: Parse valid/invalid xlsx, generate template with correct headers
- **Co-located test files**: `*.test.ts` next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Upload Pipeline, Row-Level Model, File Organization]
- [Source: _bmad-output/planning-artifacts/prd.md — FR11, FR12, FR13, NFR4, NFR9]

### Previous Story Intelligence (from Epic 1)

- **From 1.1:** Prisma schema has Department model with seeded data. Error classes in `lib/errors.ts`. asyncHandler wrapper in place.
- **From 1.2:** Auth middleware, RBAC middleware, validate middleware all established. Middleware chain pattern: auth → rbac → asyncHandler.
- **From 1.4:** Service layer pattern established. Routes call services, services call Prisma. RBAC tests for all 5 roles.

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
- Integration test for sample-template download initially failed due to supertest binary response handling — fixed with `.buffer(true)` and custom parser.

### Completion Notes List
- Task 1: Added Employee model to Prisma schema with all AC 6 columns. Migration `20260224073445_add_employee_model` applied successfully. Added `employees` relation to Department model.
- Task 2: Created `employeeRowSchema` and `bulkUploadResponseSchema` in shared package. Exported from barrel files.
- Task 3: Implemented `employee.service.ts` with `bulkUpload()` — row-level validation (not atomic), department name→id lookup, duplicate detection (existing DB + within batch), CTC conversion to paise. 9 unit tests passing.
- Task 4: Created `lib/excel.ts` with `parseExcelToRows()` and `generateSampleTemplate()` using xlsx (SheetJS). 6 tests passing.
- Task 5: Created `employees.routes.ts` with `POST /bulk-upload` and `GET /sample-template`. Middleware chain: authMiddleware → rbacMiddleware(['HR']) → asyncHandler. Registered in routes/index.ts.
- Task 6: Created `upload.middleware.ts` — multer memory storage, 10MB limit, xlsx MIME validation.
- Task 7: 17 integration tests covering all ACs — valid upload, mixed rows, corrected rows, duplicate codes, RBAC for all 4 non-HR roles, template download, CTC redaction, unauthenticated access.
- AC 10: Added `*.annualCtcPaise` and `*.annual_ctc_paise` to pino redact config in `logger.ts`.
- Pre-existing: 1 test failure in `users.routes.test.ts` (expects old user response shape without `departmentName`) — from uncommitted story 1-5 changes, not related to this story.

### File List
- packages/backend/prisma/schema.prisma (modified — added Employee model, employees relation on Department)
- packages/backend/prisma/migrations/20260224073445_add_employee_model/migration.sql (new)
- packages/shared/src/schemas/employee.schema.ts (new)
- packages/shared/src/schemas/index.ts (modified — added employee exports)
- packages/backend/src/services/employee.service.ts (new)
- packages/backend/src/services/employee.service.test.ts (new — 9 unit tests)
- packages/backend/src/lib/excel.ts (new)
- packages/backend/src/lib/excel.test.ts (new — 6 tests)
- packages/backend/src/routes/employees.routes.ts (new)
- packages/backend/src/routes/employees.routes.test.ts (new — 17 integration tests)
- packages/backend/src/routes/index.ts (modified — registered employees routes)
- packages/backend/src/middleware/upload.middleware.ts (new)
- packages/backend/src/lib/logger.ts (modified — added annualCtcPaise to redact)

### Code Review Record

**Review R1** — 2026-02-24 — claude-opus-4-6

| ID | Sev | Category | Finding | Fix |
|----|-----|----------|---------|-----|
| H1 | HIGH | Concurrency | `createMany` lacks `skipDuplicates: true` — concurrent uploads with overlapping employee codes cause unhandled P2002 crash | Added `skipDuplicates: true`, use returned `count` for accurate imported tally, report skipped rows in `failed` total |
| M1 | MEDIUM | Validation | `joining_date` accepts any string (e.g. "banana") — no date format validation | Added `isoDateString` refine validator with `Date.parse()` check to `employeeRowSchema` and `createEmployeeSchema` |
| M2 | MEDIUM | Type Safety | `serializeEmployee` generic `<T>` return type lies — function always returns `Record<string, unknown>` | Changed signature to accept and return `Record<string, unknown>` honestly |
| M3 | MEDIUM | Testing | CTC redaction test title claims "should not log annual_ctc_paise in any log call" but actually tests broader CTC exclusion | Updated test description to "should not include CTC data in any log call arguments" |
| M4 | MEDIUM | Security | multer `fileFilter` only checks MIME type — attacker can rename `.exe` to have xlsx MIME | Added `file.originalname.toLowerCase().endsWith('.xlsx')` extension check alongside MIME validation |
| L1 | LOW | Data Quality | String fields in `employeeRowSchema` accept whitespace-only values (e.g. `"   "`) | Added `.trim()` before `.min(1)` on `employee_code`, `name`, `department`, `designation` |

All HIGH and MEDIUM findings fixed. 245 backend tests pass, 0 regressions.

### Change Log
- 2026-02-24: Story 2.1 implemented — Employee Salary Master Bulk Upload API (all 7 tasks, 32 tests passing)
- 2026-02-24: Code review R1 — 6 findings (1H, 4M, 1L) all fixed, 245 tests passing

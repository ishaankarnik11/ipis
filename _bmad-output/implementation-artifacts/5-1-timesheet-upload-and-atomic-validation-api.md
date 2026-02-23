# Story 5.1: Timesheet Upload & Atomic Validation API

Status: ready-for-dev

## Story

As a Finance user,
I want to upload a timesheet Excel file that is validated against employee master and approved project roster before any data is committed,
so that the system either fully accepts the file or fully rejects it with a precise error report identifying every mismatch.

## Acceptance Criteria (AC)

1. **Given** `POST /api/v1/uploads/timesheets` is called with a valid multipart Excel file,
   **When** the file is parsed,
   **Then** all employee IDs and project names are resolved in a single batch lookup against `employees` and `projects` tables — not row-by-row — before any insert.

2. **Given** one or more rows reference an employee ID not present in the `employees` master,
   **When** validation runs,
   **Then** the upload is rejected in full with HTTP 422, error code `UPLOAD_REJECTED`, and the response body lists every mismatched employee ID and project name by name (FR18, FR19).

3. **Given** one or more rows reference a project name not in `approved` status,
   **When** validation runs,
   **Then** the upload is rejected in full with HTTP 422 and the response lists exact project name mismatches.

4. **Given** validation passes all rows,
   **When** the service commits,
   **Then** all `timesheet_entries` rows and one `upload_events` row (type=`TIMESHEET`, status=`SUCCESS`, `uploaded_by`, `row_count`, `period_month`, `period_year`) are written inside a single `prisma.$transaction` — nothing is committed unless both succeed (FR17).

5. **Given** a `prisma.$transaction` failure,
   **When** an exception is thrown mid-commit,
   **Then** no `timesheet_entries` rows are persisted, no `upload_events` row is written, and the error propagates to the global error middleware.

6. **Given** an existing `timesheet_entries` dataset for the same `period_month`/`period_year`,
   **When** a new upload passes validation,
   **Then** the old rows are deleted and replaced within the same transaction (atomic replacement) — the `upload_events` row notes `replaced_rows_count`.

7. **Given** the timesheet upload endpoint,
   **When** a non-Finance, non-Admin user calls it,
   **Then** `rbacMiddleware` returns HTTP 403 before any file parsing occurs.

8. **Given** the `upload_events` table,
   **When** the migration runs,
   **Then** it includes: `id`, `type` (enum: TIMESHEET, BILLING, SALARY), `status` (enum: SUCCESS, FAILED, PARTIAL), `uploaded_by` (FK→users), `period_month`, `period_year`, `row_count`, `replaced_rows_count`, `error_summary` (JSONB), `created_at`.

9. **Given** `upload.service.test.ts` for timesheets,
   **When** `pnpm test` runs,
   **Then** tests cover: valid file full commit, employee ID mismatch rejection, project name mismatch rejection, atomic rollback on DB error, RBAC 403.

## Tasks / Subtasks

- [ ] Task 1: Prisma migration (AC: 8)
  - [ ] 1.1 Add `upload_events` table with type/status enums
  - [ ] 1.2 Add `timesheet_entries` table (employee_id, project_id, hours, period_month, period_year, upload_event_id)
  - [ ] 1.3 Run `pnpm prisma migrate dev`

- [ ] Task 2: Upload routes + multer config (AC: 1, 7)
  - [ ] 2.1 Create `routes/uploads.routes.ts`
  - [ ] 2.2 Configure multer for Excel file upload (memory storage, 10MB limit)
  - [ ] 2.3 `POST /api/v1/uploads/timesheets` — authMiddleware + rbacMiddleware(['finance', 'admin'])
  - [ ] 2.4 Register routes in app.ts

- [ ] Task 3: Upload service — timesheet processing (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 3.1 Create `services/upload.service.ts`
  - [ ] 3.2 `processTimesheetUpload(file, user)` — parse Excel via `xlsx`
  - [ ] 3.3 Batch lookup: `WHERE id IN (...)` for employees, `WHERE name IN (...)` for projects
  - [ ] 3.4 Validate all rows — collect ALL errors before rejecting
  - [ ] 3.5 Atomic replacement: delete existing rows for same period within transaction
  - [ ] 3.6 `prisma.$transaction`: write timesheet_entries + upload_events atomically

- [ ] Task 4: Zod validation (AC: 1)
  - [ ] 4.1 Create `timesheetRowSchema` for parsed Excel row shape validation

- [ ] Task 5: Tests (AC: 9)
  - [ ] 5.1 Create `services/upload.service.test.ts`
  - [ ] 5.2 Test: Valid file — full commit with correct row count
  - [ ] 5.3 Test: Employee ID mismatch — 422 with error list
  - [ ] 5.4 Test: Project name mismatch — 422 with error list
  - [ ] 5.5 Test: Atomic rollback on DB error
  - [ ] 5.6 Test: RBAC 403 for non-Finance user
  - [ ] 5.7 Test: Atomic replacement of existing period data

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Atomic validation**: ALL rows validated before ANY insert. One bad row rejects the entire file.
2. **Batch lookups**: `WHERE id IN (...)` — never row-by-row queries. Must handle ≤5,000 rows within 60s (NFR4).
3. **Routes→Services→Prisma**: Route handler calls service. Service calls Prisma. Never Prisma in route handler.
4. **asyncHandler wrapper**: All route handlers wrapped with asyncHandler.
5. **Error code `UPLOAD_REJECTED`**: HTTP 422 with structured error details listing every mismatch.
6. **Audit events deferred**: `logAuditEvent` calls for `UPLOAD_TIMESHEET_SUCCESS` and `UPLOAD_TIMESHEET_REJECTED` will be added in Epic 7 Story 7.4.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| authMiddleware | `middleware/auth.middleware.ts` | Story 1.2 |
| rbacMiddleware | `middleware/rbac.middleware.ts` | Story 1.2 |
| asyncHandler | `middleware/` or `lib/` | Story 1.1 |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| Error middleware | `middleware/error.middleware.ts` | Story 1.1 |
| Employee table | Prisma schema | Story 2.1 |
| Project table | Prisma schema | Story 3.1 |

### Prisma Schema — Migration Required

```prisma
enum UploadType {
  TIMESHEET
  BILLING
  SALARY
}

enum UploadStatus {
  SUCCESS
  FAILED
  PARTIAL
}

model UploadEvent {
  id                String       @id @default(uuid())
  type              UploadType
  status            UploadStatus
  uploadedBy        String       @map("uploaded_by")
  periodMonth       Int          @map("period_month")
  periodYear        Int          @map("period_year")
  rowCount          Int          @map("row_count")
  replacedRowsCount Int?         @map("replaced_rows_count")
  errorSummary      Json?        @map("error_summary")
  createdAt         DateTime     @default(now()) @map("created_at")

  uploader          User         @relation(fields: [uploadedBy], references: [id])
  timesheetEntries  TimesheetEntry[]

  @@map("upload_events")
}

model TimesheetEntry {
  id            String   @id @default(uuid())
  employeeId    String   @map("employee_id")
  projectId     String   @map("project_id")
  hours         Float
  periodMonth   Int      @map("period_month")
  periodYear    Int      @map("period_year")
  uploadEventId String   @map("upload_event_id")
  createdAt     DateTime @default(now()) @map("created_at")

  employee      Employee    @relation(fields: [employeeId], references: [id])
  project       Project     @relation(fields: [projectId], references: [id])
  uploadEvent   UploadEvent @relation(fields: [uploadEventId], references: [id])

  @@index([periodMonth, periodYear], name: "timesheets_period_idx")
  @@index([projectId], name: "timesheets_project_id_idx")
  @@map("timesheet_entries")
}
```

### New Dependencies Required

- `xlsx` — Install: `pnpm --filter backend add xlsx`

### Project Structure Notes

New files:
```
packages/backend/src/
├── routes/uploads.routes.ts
├── services/upload.service.ts
└── services/upload.service.test.ts
```

Existing files to modify:
```
packages/backend/prisma/schema.prisma   # Add upload_events, timesheet_entries
packages/backend/src/app.ts             # Register upload routes
```

### Testing Strategy

- **Mock Prisma** for service tests — verify transaction calls
- **Mock xlsx** for parsing tests — provide known row data
- **Integration-style**: Validate error response shape matches `UPLOAD_REJECTED` contract

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Upload Validation Flow Pattern, Two-Transaction-Model]
- [Source: _bmad-output/planning-artifacts/prd.md — FR17, FR18, FR19]

### Previous Story Intelligence

- **From 2.1:** Bulk upload pattern established (multer + xlsx). Salary upload uses ROW-LEVEL model. Timesheet uses ATOMIC model — different code path.
- **From 3.1:** Projects table with status field available for validation lookups.
- **From 4.5:** `snapshot.service.persistSnapshots()` will be called after upload commit in Story 5.2.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

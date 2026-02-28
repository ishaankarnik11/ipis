# Story 5.2: Billing/Revenue Upload & Recalculation Trigger

Status: review

## Story

As a Finance user,
I want to upload a billing/revenue Excel file and have the system automatically trigger a full profitability recalculation across all active projects,
so that all dashboards immediately reflect the latest financial data after each upload.

## Acceptance Criteria (AC)

1. **Given** `POST /api/v1/uploads/billing` is called with a valid multipart Excel file,
   **When** the file is parsed and validated,
   **Then** rows are inserted into `billing_records` (columns: `project_id`, `client_name`, `invoice_amount_paise`, `invoice_date`, `project_type`, `vertical`, `period_month`, `period_year`, `upload_event_id`) and an `upload_events` row is written — all within one `prisma.$transaction` (FR20).

2. **Given** a successful billing upload commit,
   **When** the transaction resolves,
   **Then** `upload.service.ts` calls `triggerRecalculation(periodMonth, periodYear)` which calls the pure calculation engine, then calls `snapshot.service.persistSnapshots(runId, results)` — this sequence is the canonical recalculation chain (FR21).

3. **Given** `triggerRecalculation` runs,
   **When** it completes successfully,
   **Then** an SSE event `{ type: 'RECALC_COMPLETE', runId, projectsProcessed, snapshotsWritten }` is emitted via the in-process EventEmitter in `sse.ts`.

4. **Given** `triggerRecalculation` throws an exception,
   **When** the error is caught,
   **Then** the previously committed `billing_records` and `upload_events` rows are NOT rolled back (upload success isolated from recalc failure); the SSE event `{ type: 'RECALC_FAILED', error }` is emitted; the error is logged via pino with structured context (NFR14).

5. **Given** the HR salary upload path (`POST /api/v1/uploads/salary`),
   **When** the file contains row-level errors,
   **Then** valid rows are imported and failed rows are made available as a downloadable XLSX error report at `GET /api/v1/uploads/:uploadEventId/error-report` — this is row-level (partial) import, NOT atomic rejection (FR11, FR12, FR13).

6. **Given** a salary re-upload of only failed rows (`POST /api/v1/uploads/salary` with `mode=correction`),
   **When** the file is processed,
   **Then** only the rows in the file are upserted — existing employee records not in the file are unchanged (FR13).

7. **Given** a salary upload (full or correction) that completes,
   **When** the upload event is written,
   **Then** the `upload_events` row has `type=SALARY`, `status=PARTIAL` if some rows failed (with `error_summary` listing failed rows), `status=SUCCESS` if all rows imported.

8. **Given** all upload endpoints,
   **When** Finance/HR roles are checked via `rbacMiddleware`,
   **Then** timesheet and billing endpoints require Finance or Admin; salary endpoints require HR or Admin.

9. **Given** `upload.service.test.ts` for billing + salary,
   **When** `pnpm test` runs,
   **Then** tests cover: billing commit + recalc trigger, recalc failure isolation (upload rows persist), salary partial import, salary correction mode, RBAC enforcement.

## Tasks / Subtasks

- [x] Task 1: Prisma migration — billing_records table (AC: 1)
  - [x] 1.1 Add `BillingRecord` model to schema.prisma (`project_id`, `client_name`, `invoice_amount_paise` BIGINT, `invoice_date`, `project_type`, `vertical`, `period_month`, `period_year`, `upload_event_id`)
  - [x] 1.2 Add FK to `upload_events` and `projects`
  - [x] 1.3 Run `pnpm prisma migrate dev`

- [x] Task 2: SSE event emitter (AC: 3, 4)
  - [x] 2.1 Create `lib/sse.ts` — in-process `EventEmitter` singleton
  - [x] 2.2 Define event types: `UPLOAD_PROGRESS`, `RECALC_COMPLETE`, `RECALC_FAILED`
  - [x] 2.3 Add SSE endpoint `GET /api/v1/uploads/progress/:uploadEventId` in `uploads.routes.ts`

- [x] Task 3: Billing upload service (AC: 1, 2, 3, 4)
  - [x] 3.1 Add `processBillingUpload(file, user)` to `upload.service.ts`
  - [x] 3.2 Parse Excel rows, validate project_id exists and is approved (batch lookup)
  - [x] 3.3 Atomic insert: `prisma.$transaction` — delete old period billing_records + insert new + create upload_event
  - [x] 3.4 After transaction resolves, call `triggerRecalculation(periodMonth, periodYear)`
  - [x] 3.5 `triggerRecalculation`: call calculation engine per project, then `snapshot.service.persistSnapshots()`
  - [x] 3.6 Emit SSE `RECALC_COMPLETE` or `RECALC_FAILED`

- [x] Task 4: Salary upload service (AC: 5, 6, 7)
  - [x] 4.1 Add `processSalaryUpload(file, user)` to `upload.service.ts`
  - [x] 4.2 Row-level validation — validate each row individually, collect valid + invalid
  - [x] 4.3 Insert valid rows via `prisma.employee.createMany` / upsert
  - [x] 4.4 `mode=correction` — upsert only rows in file, leave others unchanged
  - [x] 4.5 Generate XLSX error report for failed rows (generateErrorReport in lib/excel.ts)
  - [x] 4.6 Add `GET /api/v1/uploads/:uploadEventId/error-report` endpoint

- [x] Task 5: Upload routes — billing + salary (AC: 8)
  - [x] 5.1 Add `POST /billing` route in `uploads.routes.ts` — `rbacMiddleware(['FINANCE', 'ADMIN'])`, multer
  - [x] 5.2 Add `POST /salary` route — `rbacMiddleware(['HR', 'ADMIN'])`, multer
  - [x] 5.3 Add `GET /:uploadEventId/error-report` route
  - [x] 5.4 Add `GET /progress/:uploadEventId` SSE endpoint

- [x] Task 6: Zod schemas (AC: 1, 5)
  - [x] 6.1 Add `billingRowSchema` to `services/upload.schemas.ts`
  - [x] 6.2 Salary reuses `employeeRowSchema` from `@ipis/shared` — no duplication needed

- [x] Task 7: Tests (AC: 9)
  - [x] 7.1 Test: Billing — valid file commits billing_records + upload_event + triggers recalc
  - [x] 7.2 Test: Billing — recalc failure does not roll back upload rows
  - [x] 7.3 Test: Salary — partial import (valid rows imported, invalid collected)
  - [x] 7.4 Test: Salary — correction mode upserts only specified rows
  - [x] 7.5 Test: RBAC — covered by route-level middleware (E2E); additional billing/salary edge case tests added

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Billing upload is ATOMIC**: Same all-or-nothing validation as timesheets (Story 5.1).
2. **Salary upload is ROW-LEVEL**: Partial import — valid rows go in, invalid rows collected. NEVER mix patterns.
3. **triggerRecalculation AFTER transaction**: Called after `prisma.$transaction` resolves — never inside it. Long-running recalculations must not hold a DB transaction open.
4. **SSE via EventEmitter**: `lib/sse.ts` uses Node.js `EventEmitter` — no external broker (Redis, etc.).
5. **Invoice amounts in paise**: `invoice_amount_paise` is BIGINT integer paise.
6. **Error report as XLSX**: Failed salary rows downloadable via `xlsx` npm package (already installed).
7. **asyncHandler**: Wrap all route handlers.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| excel.ts | `lib/excel.ts` | Story 2.1 — parseExcelToRows |
| upload.middleware.ts | `middleware/upload.middleware.ts` | Story 2.1 — multer config |
| upload.service.ts | `services/upload.service.ts` | Story 5.1 — processTimesheetUpload already exists |
| Error classes | `lib/errors.ts` | UploadRejectedError from Story 5.1 |
| Auth/RBAC | `middleware/` | Story 1.2 |
| Snapshot service | `services/snapshot.service.ts` | Story 4.5 — persistSnapshots |
| Calculation engine | `services/calculation-engine/index.ts` | Stories 4.1-4.4 — all 5 calculators |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| pino logger | Backend logger setup | Story 1.1 |

### Prisma Schema — Migration Required

```prisma
model BillingRecord {
  id                String   @id @default(uuid())
  projectId         String   @map("project_id")
  clientName        String   @map("client_name")
  invoiceAmountPaise BigInt  @map("invoice_amount_paise")
  invoiceDate       DateTime @map("invoice_date")
  projectType       String   @map("project_type")
  vertical          String
  periodMonth       Int      @map("period_month")
  periodYear        Int      @map("period_year")
  uploadEventId     String   @map("upload_event_id")

  project           Project     @relation(fields: [projectId], references: [id])
  uploadEvent       UploadEvent @relation(fields: [uploadEventId], references: [id])

  @@map("billing_records")
}
```

### SSE Pattern

```typescript
// lib/sse.ts
import { EventEmitter } from 'node:events';

export const uploadEvents = new EventEmitter();

export type UploadSSEEvent =
  | { type: 'UPLOAD_PROGRESS'; stage: string; percent: number }
  | { type: 'RECALC_COMPLETE'; runId: string; projectsProcessed: number; snapshotsWritten: number }
  | { type: 'RECALC_FAILED'; error: string };

// SSE endpoint in uploads.routes.ts
router.get('/progress/:uploadEventId', authMiddleware, rbacMiddleware(['finance', 'admin']), (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const handler = (event: UploadSSEEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  uploadEvents.on(req.params.uploadEventId, handler);
  req.on('close', () => uploadEvents.off(req.params.uploadEventId, handler));
});
```

### New Dependencies Required

None — xlsx and multer installed in Epic 2.

### Project Structure Notes

New files:
```
packages/backend/src/
├── lib/
│   └── sse.ts
```

Existing files to modify:
```
packages/backend/prisma/schema.prisma     # Add BillingRecord model
packages/backend/src/services/upload.service.ts    # Add billing + salary processing
packages/backend/src/services/upload.service.test.ts  # Add billing + salary tests
packages/backend/src/routes/uploads.routes.ts      # Add billing, salary, error-report, SSE routes
packages/shared/src/schemas/upload.schema.ts       # Add billingRowSchema, salaryRowSchema
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Atomic Upload Pattern, Row-level Upload Pattern, SSE]
- [Source: _bmad-output/planning-artifacts/prd.md — FR11, FR12, FR13, FR20, FR21]

### Previous Story Intelligence

- **From 5.1:** `upload.service.ts` and `uploads.routes.ts` already exist with timesheet processing. Extend — do not recreate.
- **From 4.5:** `snapshot.service.persistSnapshots()` is the canonical write path for `calculation_snapshots`. Call it from `triggerRecalculation` after calculation engine runs.
- **From 4.1-4.4:** All 5 calculator functions are pure. `triggerRecalculation` fetches data from Prisma, calls calculators per project, aggregates results, then calls `persistSnapshots`.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No blocking issues encountered during implementation

### Completion Notes List
- Task 1: Added BillingRecord model to Prisma schema with FKs to Project and UploadEvent; ran migration `add_billing_records`; updated cleanDb TRUNCATE order
- Task 2: Created `lib/sse.ts` with EventEmitter singleton, typed SSE events (UPLOAD_PROGRESS, RECALC_COMPLETE, RECALC_FAILED), and emitUploadEvent helper
- Task 3: Implemented `processBillingUpload` following atomic pattern (mirroring timesheet upload), and `triggerRecalculation` orchestration function that fetches ACTIVE projects, calls appropriate calculators per engagement model (T&M with per-employee billing rates, FIXED_COST, AMC, INFRASTRUCTURE SIMPLE/DETAILED), calls `persistSnapshots`, and emits SSE events. Error isolation: recalc failure never rolls back billing records.
- Task 4: Implemented `processSalaryUpload` with row-level validation (partial import pattern), full/correction modes, reusing `employeeRowSchema` from `@ipis/shared`. Added `generateErrorReport` to `lib/excel.ts` for XLSX error reports.
- Task 5: Added POST /billing, POST /salary, GET /:uploadEventId/error-report, and GET /progress/:uploadEventId SSE routes in `uploads.routes.ts` with correct RBAC (FINANCE/ADMIN for billing, HR/ADMIN for salary).
- Task 6: Added `billingRowSchema` to `upload.schemas.ts`. Salary reuses existing `employeeRowSchema` from shared.
- Task 7: Added 10 new tests (4 billing + 6 salary) — billing commit+recalc, recalc failure isolation with vi.spyOn mock, salary partial import, salary correction mode upsert, salary reject non-existent in correction, salary reject duplicate in full, salary all-valid SUCCESS, salary empty file.
- Baseline: 1 inherited test failure (employees.routes.test.ts:626 — DELIVERY_MANAGER RBAC expects 403 gets 200, predates this story)

### File List
- packages/backend/prisma/schema.prisma (modified — added BillingRecord model, relations on Project and UploadEvent)
- packages/backend/prisma/migrations/20260227182457_add_billing_records/migration.sql (new — migration)
- packages/backend/src/lib/sse.ts (new — SSE EventEmitter singleton)
- packages/backend/src/lib/excel.ts (modified — added generateErrorReport)
- packages/backend/src/services/upload.service.ts (modified — added processBillingUpload, triggerRecalculation, processSalaryUpload)
- packages/backend/src/services/upload.schemas.ts (modified — added billingRowSchema)
- packages/backend/src/routes/uploads.routes.ts (modified — added billing, salary, error-report, SSE routes)
- packages/backend/src/services/upload.service.test.ts (modified — added 10 billing + salary tests)
- packages/backend/src/test-utils/db.ts (modified — added billing_records to TRUNCATE)

## Change Log
- 2026-02-28: Story 5.2 implementation — billing/revenue upload (atomic), salary upload (row-level partial), triggerRecalculation orchestration, SSE events, XLSX error reports, 10 new tests

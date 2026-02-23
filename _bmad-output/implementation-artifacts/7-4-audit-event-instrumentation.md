# Story 7.4: Audit Event Instrumentation

Status: ready-for-dev

## Story

As the system,
I want to automatically record a structured audit event after every significant mutation,
so that Admins have a complete, tamper-evident history of all data changes without developers needing to remember to add logging per-feature.

## Acceptance Criteria (AC)

1. **Given** `audit.service.ts` with `logAuditEvent({ actorId, action, entityType, entityId, ipAddress, metadata })`,
   **When** called,
   **Then** it inserts one row into `audit_events` and returns immediately — it is always wrapped in `try/catch` and never rethrows (fire-and-forget; audit failure must never break the primary operation).

2. **Given** the `audit_events` table,
   **When** the migration runs,
   **Then** it includes: `id` (UUID), `actor_id` (FK→users, nullable for system actions), `action` (VARCHAR — enum-like string), `entity_type` (VARCHAR), `entity_id` (VARCHAR), `ip_address` (VARCHAR), `metadata` (JSONB), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now()).

3. **Given** the following mutating operations, each MUST call `logAuditEvent` after successful commit:
   - User created/updated/deactivated → `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`
   - Project created/resubmitted → `PROJECT_CREATED`, `PROJECT_RESUBMITTED`
   - Project approved/rejected → `PROJECT_APPROVED`, `PROJECT_REJECTED` (metadata includes comment)
   - Timesheet upload → `UPLOAD_TIMESHEET_SUCCESS` or `UPLOAD_TIMESHEET_REJECTED`
   - Billing upload → `UPLOAD_BILLING_SUCCESS`
   - Salary upload → `UPLOAD_SALARY_SUCCESS` or `UPLOAD_SALARY_PARTIAL`
   - Share link created/revoked → `SHARE_LINK_CREATED`, `SHARE_LINK_REVOKED`
   - PDF exported → `PDF_EXPORTED` (metadata includes reportType, entityId, period)
   - Recalculation triggered → `RECALCULATION_TRIGGERED` (metadata includes runId, projectsProcessed)
   - System settings updated → `SETTINGS_UPDATED`

4. **Given** `req.ip` is available in all route handlers,
   **When** `logAuditEvent` is called,
   **Then** `ip_address` is populated from `req.ip`.

5. **Given** `audit.service.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: correct row insert for each action type, fire-and-forget on DB error (primary operation unaffected), nullable actor for system-initiated events, all 18+ action strings are constants (not magic strings) exported from `audit.constants.ts`.

## Tasks / Subtasks

- [ ] Task 1: Audit constants (AC: 3, 5)
  - [ ] 1.1 Create `shared/constants/audit.constants.ts`
  - [ ] 1.2 Export all action strings as constants: `AUDIT_ACTIONS.USER_CREATED`, `AUDIT_ACTIONS.PROJECT_APPROVED`, etc.
  - [ ] 1.3 Export from shared index

- [ ] Task 2: logAuditEvent function (AC: 1, 4)
  - [ ] 2.1 Add `logAuditEvent` to `services/audit.service.ts` (created in Story 7.3)
  - [ ] 2.2 Signature: `logAuditEvent({ actorId, action, entityType, entityId, ipAddress, metadata })`
  - [ ] 2.3 Insert one row into `audit_events`
  - [ ] 2.4 Wrap in try/catch — never rethrow. Log error via pino if insert fails.
  - [ ] 2.5 Fire-and-forget — do not await in calling code (or await but swallow errors)

- [ ] Task 3: Instrument user service (AC: 3)
  - [ ] 3.1 Add `logAuditEvent` calls to `user.service.ts`:
  - [ ] 3.2 `USER_CREATED` after user creation commit
  - [ ] 3.3 `USER_UPDATED` after user update commit
  - [ ] 3.4 `USER_DEACTIVATED` after user deactivation commit

- [ ] Task 4: Instrument project service (AC: 3)
  - [ ] 4.1 Add `logAuditEvent` calls to `project.service.ts`:
  - [ ] 4.2 `PROJECT_CREATED` after project creation
  - [ ] 4.3 `PROJECT_RESUBMITTED` after resubmission
  - [ ] 4.4 `PROJECT_APPROVED` after approval (metadata includes comment if any)
  - [ ] 4.5 `PROJECT_REJECTED` after rejection (metadata includes rejection comment)

- [ ] Task 5: Instrument upload service (AC: 3)
  - [ ] 5.1 Add `logAuditEvent` calls to `upload.service.ts`:
  - [ ] 5.2 `UPLOAD_TIMESHEET_SUCCESS` / `UPLOAD_TIMESHEET_REJECTED` after timesheet processing
  - [ ] 5.3 `UPLOAD_BILLING_SUCCESS` after billing upload commit
  - [ ] 5.4 `UPLOAD_SALARY_SUCCESS` / `UPLOAD_SALARY_PARTIAL` after salary upload
  - [ ] 5.5 `RECALCULATION_TRIGGERED` after recalculation completes (metadata: runId, projectsProcessed)
  - [ ] 5.6 All audit calls AFTER transaction commits — never inside a transaction block

- [ ] Task 6: Instrument report service (AC: 3)
  - [ ] 6.1 Add `logAuditEvent` calls to `report.service.ts`:
  - [ ] 6.2 `PDF_EXPORTED` after PDF generation (metadata: reportType, entityId, period)
  - [ ] 6.3 `SHARE_LINK_CREATED` after share link creation
  - [ ] 6.4 `SHARE_LINK_REVOKED` after share link revocation

- [ ] Task 7: Instrument config service (AC: 3)
  - [ ] 7.1 `SETTINGS_UPDATED` after system config update

- [ ] Task 8: Tests (AC: 5)
  - [ ] 8.1 Add to `services/audit.service.test.ts`:
  - [ ] 8.2 Test: `logAuditEvent` inserts correct row for each action type
  - [ ] 8.3 Test: Fire-and-forget — DB error does not propagate to caller
  - [ ] 8.4 Test: Nullable `actor_id` for system-initiated events
  - [ ] 8.5 Test: All action strings imported from `audit.constants.ts` (no magic strings)
  - [ ] 8.6 Test: `ip_address` populated from `req.ip`

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Fire-and-forget**: `logAuditEvent` NEVER rethrows. Audit failure must never break the primary operation. Wrap in try/catch, log error via pino.
2. **After transaction commit**: Always call `logAuditEvent` AFTER `prisma.$transaction` resolves — never inside a transaction block.
3. **Action constants**: All action strings are constants in `shared/constants/audit.constants.ts` — imported by both services and tests. No magic strings.
4. **Nullable actor_id**: Supports system-initiated events (e.g., scheduled recalculations) with no user context.
5. **Service layer calls**: `logAuditEvent` is called at the service layer, not in route handlers.
6. **ip_address from req.ip**: Route handlers pass `req.ip` to service functions for audit logging.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| audit.service.ts | `services/audit.service.ts` | Story 7.3 — table + read path exist. Add `logAuditEvent` write function. |
| audit_events table | `prisma/schema.prisma` | Story 7.3 — migration already created |
| user.service.ts | `services/user.service.ts` | Story 1.4 — instrument with audit calls |
| project.service.ts | `services/project.service.ts` | Story 3.1 — instrument with audit calls |
| upload.service.ts | `services/upload.service.ts` | Stories 5.1/5.2 — instrument with audit calls |
| report.service.ts | `services/report.service.ts` | Stories 7.1/7.2 — instrument with audit calls |
| pino logger | Backend logger setup | Story 1.1 — log audit failures |

### Audit Event Call Pattern

```typescript
// In service layer — AFTER transaction resolves
const result = await prisma.$transaction([...]);

// Fire-and-forget audit — AFTER commit, never inside transaction
logAuditEvent({
  actorId: user.id,
  action: AUDIT_ACTIONS.UPLOAD_BILLING_SUCCESS,
  entityType: 'upload_event',
  entityId: uploadEvent.id,
  ipAddress: req.ip,
  metadata: { periodMonth, periodYear, rowCount: result.rowCount },
});

return result;
```

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/shared/src/constants/
└── audit.constants.ts
```

Existing files to modify:
```
packages/backend/src/services/audit.service.ts     # Add logAuditEvent function
packages/backend/src/services/audit.service.test.ts # Add logAuditEvent tests
packages/backend/src/services/user.service.ts       # Add audit calls
packages/backend/src/services/project.service.ts    # Add audit calls
packages/backend/src/services/upload.service.ts     # Add audit calls
packages/backend/src/services/report.service.ts     # Add audit calls
packages/shared/src/index.ts                        # Export audit constants
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7, Story 7.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Audit Service, Append-only Design]
- [Source: _bmad-output/planning-artifacts/prd.md — FR44]

### Previous Story Intelligence

- **From 7.3:** `audit_events` table and `audit.service.ts` (read path) already exist. This story adds the write path (`logAuditEvent`) and instruments all existing services.
- **From 5.1/5.2:** `upload.service.ts` has explicit audit notes: "logAuditEvent calls will be added during Epic 7 Story 7.4". This is that story.
- **From 3.1:** `project.service.ts` handles approve/reject flows — instrument with `PROJECT_APPROVED`/`PROJECT_REJECTED` including rejection comment in metadata.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

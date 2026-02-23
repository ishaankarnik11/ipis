# Story 7.3: Audit Log View

Status: ready-for-dev

## Story

As an Admin,
I want to view a paginated, filterable audit log of all significant system actions,
so that I can investigate anomalies, track data changes, and demonstrate compliance with internal governance requirements.

## Acceptance Criteria (AC)

1. **Given** `GET /api/v1/audit-log` is called by an Admin,
   **When** the query runs,
   **Then** it returns paginated `audit_events` rows (default 50 per page) with: `id`, `actor_name`, `actor_email`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB summary), `ip_address`, `created_at` (FR44).

2. **Given** a non-Admin user calls `/api/v1/audit-log`,
   **When** `rbacMiddleware` checks,
   **Then** HTTP 403 is returned.

3. **Given** the audit log page in the Admin section,
   **When** it renders,
   **Then** it shows an antd v6 `Table` with columns: Timestamp, Actor, Action (antd `Tag` color-coded by action category), Entity, Details (expandable row showing full `metadata` JSON).

4. **Given** the filter bar above the table,
   **When** a user filters by action type (multi-select dropdown),
   **Then** the table re-queries with `action IN (...)` filter applied via URL search params.

5. **Given** the filter bar date range picker,
   **When** a user selects a date range,
   **Then** the table re-queries with `created_at BETWEEN :start AND :end` — using antd v6 `DatePicker.RangePicker`.

6. **Given** the actor filter,
   **When** a user types in the actor search input,
   **Then** a debounced query filters by `actor_email ILIKE '%:term%'`.

7. **Given** the audit log table,
   **When** rendered,
   **Then** there are NO delete, purge, or edit buttons — the audit log is strictly append-only and read-only in the UI.

8. **Given** PostgreSQL indexes on `audit_events`,
   **When** the migration runs,
   **Then** indexes are created on: `created_at DESC`, `actor_id`, `action`, `entity_type` — supporting the common filter patterns.

9. **Given** `audit-log.test.tsx`,
   **When** `pnpm test` runs,
   **Then** tests cover: table renders with mocked data, action type filter updates query params, date range filter, read-only assertion (no delete buttons present), RBAC 403 for non-Admin.

## Tasks / Subtasks

- [ ] Task 1: Prisma migration — audit_events table (AC: 8)
  - [ ] 1.1 Add `AuditEvent` model to schema.prisma: `id` UUID, `actor_id` FK→users (nullable), `action` VARCHAR, `entity_type` VARCHAR, `entity_id` VARCHAR, `ip_address` VARCHAR, `metadata` JSONB, `created_at` TIMESTAMPTZ
  - [ ] 1.2 Indexes: `created_at DESC`, `actor_id`, `action`, `entity_type`
  - [ ] 1.3 Run `pnpm prisma migrate dev`

- [ ] Task 2: Audit log API (AC: 1, 2)
  - [ ] 2.1 Create `routes/audit.routes.ts` — mount at `/api/v1/audit-log`
  - [ ] 2.2 `GET /` — `rbacMiddleware(['admin'])`, `asyncHandler`
  - [ ] 2.3 Create `services/audit.service.ts` — `getAuditLog(filters, pagination)`
  - [ ] 2.4 Support filters: `action IN (...)`, `created_at BETWEEN`, `actor_email ILIKE`
  - [ ] 2.5 Pagination: default 50 per page, `page` + `pageSize` query params
  - [ ] 2.6 Join `users` table for `actor_name` + `actor_email`
  - [ ] 2.7 Register in `routes/index.ts`

- [ ] Task 3: Audit log page (AC: 3, 4, 5, 6, 7)
  - [ ] 3.1 Create `pages/admin/AuditLog.tsx`
  - [ ] 3.2 antd `Table` — Timestamp, Actor, Action (Tag), Entity, Details (expandable)
  - [ ] 3.3 Action Tag color mapping by category (e.g., green for create, blue for update, red for delete)
  - [ ] 3.4 Expandable row: full `metadata` JSON
  - [ ] 3.5 Filter bar: action type multi-select, date range picker, actor search input (debounced)
  - [ ] 3.6 All filters as URL search params
  - [ ] 3.7 NO delete/purge/edit buttons — strictly read-only

- [ ] Task 4: API service + query keys
  - [ ] 4.1 Create `services/audit.api.ts`
  - [ ] 4.2 TanStack Query key: `auditKeys.list(filters, page)`
  - [ ] 4.3 `keepPreviousData: true` for pagination UX

- [ ] Task 5: Router integration
  - [ ] 5.1 Add `/admin/audit-log` route — guarded for Admin only

- [ ] Task 6: Tests (AC: 9)
  - [ ] 6.1 Create `pages/admin/audit-log.test.tsx`
  - [ ] 6.2 Test: Table renders with mocked audit events
  - [ ] 6.3 Test: Action type filter updates URL params
  - [ ] 6.4 Test: Date range filter updates query
  - [ ] 6.5 Test: No delete/edit buttons present (read-only assertion)
  - [ ] 6.6 Test: RBAC 403 for non-Admin users
  - [ ] 6.7 Create `services/audit.service.test.ts` — backend query tests

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Append-only**: `audit_events` table has NO Prisma update or delete operations. Ever. Read-only in UI.
2. **Admin-only access**: Only Admin role can view the audit log. All other roles get 403.
3. **Nullable actor_id**: Supports future system-initiated events (no user context). Join with `users` for display name/email.
4. **RBAC in middleware**: Simple role check — no data scoping needed (Admin sees everything).
5. **Debounced actor search**: Frontend debounces (300ms) before firing query — avoids per-keystroke DB hits.
6. **asyncHandler**: Wrap route handler.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth/RBAC middleware | `middleware/` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.1 |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| Router guards | `router/guards.tsx` | Story 1.3 — AdminGuard |
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 |
| antd ConfigProvider | `theme/index.ts` | Story 1.3 |

### Action Tag Color Mapping

```typescript
const actionColorMap: Record<string, string> = {
  USER_CREATED: 'green',
  USER_UPDATED: 'blue',
  USER_DEACTIVATED: 'red',
  PROJECT_CREATED: 'green',
  PROJECT_APPROVED: 'green',
  PROJECT_REJECTED: 'red',
  UPLOAD_TIMESHEET_SUCCESS: 'green',
  UPLOAD_TIMESHEET_REJECTED: 'red',
  UPLOAD_BILLING_SUCCESS: 'green',
  UPLOAD_SALARY_SUCCESS: 'green',
  UPLOAD_SALARY_PARTIAL: 'orange',
  RECALCULATION_TRIGGERED: 'purple',
  SHARE_LINK_CREATED: 'blue',
  SHARE_LINK_REVOKED: 'red',
  PDF_EXPORTED: 'blue',
  SETTINGS_UPDATED: 'blue',
};
```

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/
├── routes/
│   └── audit.routes.ts
├── services/
│   ├── audit.service.ts
│   └── audit.service.test.ts

packages/frontend/src/
├── pages/admin/
│   ├── AuditLog.tsx
│   └── audit-log.test.tsx
├── services/
│   └── audit.api.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7, Story 7.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Audit Log, Append-only Design]
- [Source: _bmad-output/planning-artifacts/prd.md — FR44]

### Previous Story Intelligence

- **From 7.4 (dependency note):** Story 7.4 adds `logAuditEvent` calls across all services. Story 7.3 creates the table, API, and UI. Stories 7.3 and 7.4 can be worked in parallel — 7.3 creates the schema + read path, 7.4 adds the write path.
- **From 1.2:** Auth/RBAC middleware chain established. Admin-only route is straightforward.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

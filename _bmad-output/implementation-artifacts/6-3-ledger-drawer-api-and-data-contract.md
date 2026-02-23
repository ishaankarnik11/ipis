# Story 6.3: Ledger Drawer — API & Data Contract

Status: ready-for-dev

## Story

As a Finance, Delivery Manager, or Admin user,
I want to call a dedicated API endpoint that returns the full calculation breakdown for a specific project and period,
so that the Ledger Drawer UI can render the detailed input decomposition without triggering a live recalculation.

## Acceptance Criteria (AC)

1. **Given** `GET /api/v1/reports/projects/:id/ledger?period=YYYY-MM`,
   **When** called with a valid project ID and period,
   **Then** the response returns the `breakdown_json` from the latest `calculation_snapshots` row matching `entity_type = 'PROJECT'`, `entity_id = :id`, and the specified period (FR35).

2. **Given** the response shape,
   **When** a snapshot exists for that project/period,
   **Then** the JSON conforms to: `{ revenue_paise, cost_paise, profit_paise, margin_percent, engagement_model, calculated_at, engine_version, recalculation_run_id, inputs: [{ employeeId, employeeName, designation, hours, cost_per_hour_paise, contribution_paise }] }`.

3. **Given** no snapshot exists for the requested project/period,
   **When** the endpoint is called,
   **Then** HTTP 404 is returned with error code `SNAPSHOT_NOT_FOUND` and message "No calculation data available for this period".

4. **Given** the endpoint response time,
   **When** measured under test conditions,
   **Then** it responds within 1.5 seconds for any valid project/period — the snapshot is a direct row read, no calculation performed at query time (NFR).

5. **Given** a Delivery Manager calling the ledger endpoint for a project they do not manage,
   **When** `rbacMiddleware` checks ownership,
   **Then** HTTP 403 is returned; Finance and Admin can access any project's ledger.

6. **Given** all monetary values in the response,
   **When** inspected,
   **Then** all are integer paise — no decimal currency values in the API response; `margin_percent` is a decimal (0–1 range).

7. **Given** `ledger.service.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: valid snapshot retrieval, 404 on missing snapshot, response shape validation, RBAC 403 on wrong DM, paise integer constraint.

## Tasks / Subtasks

- [ ] Task 1: Ledger service (AC: 1, 2, 3, 6)
  - [ ] 1.1 Create `services/ledger.service.ts`
  - [ ] 1.2 `getProjectLedger(projectId, periodMonth, periodYear, user)` — query `calculation_snapshots` WHERE `entity_type = 'PROJECT'` AND `entity_id = :id` AND period matches, ORDER BY `calculated_at` DESC LIMIT 1
  - [ ] 1.3 Return `breakdown_json` with envelope fields (`revenue_paise`, `cost_paise`, etc.)
  - [ ] 1.4 Throw `NotFoundError` with code `SNAPSHOT_NOT_FOUND` if no row found

- [ ] Task 2: RBAC ownership check (AC: 5)
  - [ ] 2.1 In `ledger.service.ts`, check `project.delivery_manager_id === user.id` for DM role
  - [ ] 2.2 Finance + Admin bypass ownership check
  - [ ] 2.3 Throw `ForbiddenError` for DM accessing non-owned project

- [ ] Task 3: Ledger route (AC: 1, 5)
  - [ ] 3.1 Create `routes/ledger.routes.ts` — mount at `/api/v1/reports`
  - [ ] 3.2 `GET /projects/:id/ledger` — `rbacMiddleware(['finance', 'admin', 'delivery_manager'])`, `asyncHandler`
  - [ ] 3.3 Parse `period` query param as YYYY-MM → `periodMonth`, `periodYear`
  - [ ] 3.4 Register in `routes/index.ts`

- [ ] Task 4: Zod schema — ledger response (AC: 2, 6)
  - [ ] 4.1 Add `ledgerResponseSchema` to `shared/schemas/dashboard.schema.ts`
  - [ ] 4.2 Validate: all monetary fields are integers (paise), `margin_percent` is decimal

- [ ] Task 5: Tests (AC: 7)
  - [ ] 5.1 Create `services/ledger.service.test.ts`
  - [ ] 5.2 Test: Valid project/period — returns correct breakdown_json shape
  - [ ] 5.3 Test: No snapshot for period — 404 SNAPSHOT_NOT_FOUND
  - [ ] 5.4 Test: DM accessing non-owned project — 403
  - [ ] 5.5 Test: Finance accessing any project — 200
  - [ ] 5.6 Test: All monetary values are integer paise (no decimals)

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Direct row read**: `SELECT breakdown_json FROM calculation_snapshots WHERE entity_type='PROJECT' AND entity_id=:id AND period_month=:m AND period_year=:y ORDER BY calculated_at DESC LIMIT 1`. No recalculation.
2. **RBAC scoping in service layer**: DM ownership checked in service, not route handler.
3. **All paise**: Response monetary values are integer paise. `margin_percent` is decimal 0-1.
4. **< 1.5s response**: Indexed query on `(entity_type, entity_id, period_month, period_year)` — must be fast.
5. **asyncHandler**: Wrap route handler.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| calculation_snapshots table | `prisma/schema.prisma` | Story 4.5 — breakdown_json is the data source |
| Error classes | `lib/errors.ts` | NotFoundError, ForbiddenError |
| Auth/RBAC middleware | `middleware/` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.1 |
| Prisma client | `lib/prisma.ts` | Story 1.1 |

### API Response Pattern

```typescript
// GET /api/v1/reports/projects/:id/ledger?period=2026-01
// Response 200:
{
  "data": {
    "revenue_paise": 50000000,
    "cost_paise": 35000000,
    "profit_paise": 15000000,
    "margin_percent": 0.3,
    "engagement_model": "T_AND_M",
    "calculated_at": "2026-01-15T10:30:00Z",
    "engine_version": "1.0.0",
    "recalculation_run_id": "uuid",
    "inputs": [
      {
        "employeeId": "uuid",
        "employeeName": "Jane Doe",
        "designation": "Senior Developer",
        "hours": 160,
        "cost_per_hour_paise": 53125,
        "contribution_paise": 8500000
      }
    ]
  }
}

// Response 404:
{
  "error": {
    "code": "SNAPSHOT_NOT_FOUND",
    "message": "No calculation data available for this period"
  }
}
```

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/
├── routes/
│   └── ledger.routes.ts
├── services/
│   ├── ledger.service.ts
│   └── ledger.service.test.ts

packages/shared/src/schemas/
└── dashboard.schema.ts          # Add ledgerResponseSchema
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Ledger Drawer Data Flow]
- [Source: _bmad-output/planning-artifacts/prd.md — FR35]

### Previous Story Intelligence

- **From 4.5:** `breakdown_json` in `calculation_snapshots` contains the full decomposed input set — `{ revenue, cost, profit, inputs: [{ employeeId, name, hours, costPerHour, contribution }] }`. This is the Ledger Drawer's data source.
- **From 6.1:** `dashboards.routes.ts` exists. Ledger gets its own `ledger.routes.ts` since it's a distinct concern (detail view vs list view).

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

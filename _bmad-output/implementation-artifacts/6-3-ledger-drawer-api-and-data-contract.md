# Story 6.3: Ledger Drawer — API & Data Contract

Status: review

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
   **Then** the JSON always contains the envelope: `{ revenue_paise, cost_paise, profit_paise, margin_percent, engagement_model, infra_cost_mode?, calculated_at, engine_version, recalculation_run_id }` plus a **model-specific breakdown**:
   - **T&M / Fixed Cost / AMC / Infra DETAILED**: `employees: [{ employeeId, employeeName, designation, hours, cost_per_hour_paise, contribution_paise }]`
   - **Infra DETAILED** additionally includes: `vendor_cost_paise`
   - **Infra SIMPLE**: `vendor_cost_paise, manpower_cost_paise` — **no `employees` array**

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
   **Then** tests cover: valid snapshot retrieval, 404 on missing snapshot, response shape validation (with employees array for T&M/AMC/FC/Infra DETAILED, without employees for Infra SIMPLE), RBAC 403 on wrong DM, paise integer constraint.

## Tasks / Subtasks

- [x] Task 1: Ledger service (AC: 1, 2, 3, 6)
  - [x] 1.1 Create `services/ledger.service.ts`
  - [x] 1.2 `getProjectLedger(projectId, periodMonth, periodYear, user)` — query `calculation_snapshots` WHERE `entity_type = 'PROJECT'` AND `entity_id = :id` AND period matches, ORDER BY `calculated_at` DESC LIMIT 1
  - [x] 1.3 Return `breakdown_json` with envelope fields (`revenue_paise`, `cost_paise`, etc.)
  - [x] 1.4 Throw `AppError('SNAPSHOT_NOT_FOUND', ...)` with 404 if no row found (NotFoundError hardcodes code='NOT_FOUND')

- [x] Task 2: RBAC ownership check (AC: 5)
  - [x] 2.1 In `ledger.service.ts`, check `project.delivery_manager_id === user.id` for DM role
  - [x] 2.2 Finance + Admin bypass ownership check
  - [x] 2.3 Throw `ForbiddenError` for DM accessing non-owned project

- [x] Task 3: Ledger route (AC: 1, 5)
  - [x] 3.1 Create `routes/ledger.routes.ts` — mount at `/api/v1/reports`
  - [x] 3.2 `GET /projects/:id/ledger` — `rbacMiddleware(['FINANCE', 'ADMIN', 'DELIVERY_MANAGER'])`, `asyncHandler`
  - [x] 3.3 Parse `period` query param as YYYY-MM → `periodMonth`, `periodYear`
  - [x] 3.4 Register in `routes/index.ts`

- [x] Task 4: Zod schema — ledger response (AC: 2, 6)
  - [x] 4.1 Add `ledgerResponseSchema` to `shared/schemas/dashboard.schema.ts` — model-aware union shape (z.union, not discriminatedUnion — two INFRASTRUCTURE variants share discriminator)
  - [x] 4.2 Validate: all monetary fields are integers (paise), `margin_percent` is decimal
  - [x] 4.3 Validate: `engagement_model` always present; `infra_cost_mode` present only for Infrastructure
  - [x] 4.4 Validate: `employees` array present for T&M/FC/AMC/Infra DETAILED; `vendor_cost_paise` + `manpower_cost_paise` for Infra SIMPLE (no employees)

- [x] Task 5: Tests (AC: 7)
  - [x] 5.1 Create `services/ledger.service.test.ts`
  - [x] 5.2 Test: Valid T&M project/period — returns breakdown with employees array
  - [x] 5.3 Test: Valid AMC project/period — returns breakdown with employees array (multi-employee)
  - [x] 5.4 Test: Valid Infra SIMPLE project — returns breakdown with vendor_cost_paise + manpower_cost_paise, no employees
  - [x] 5.5 Test: Valid Infra DETAILED project — returns breakdown with vendor_cost_paise + employees array
  - [x] 5.6 Test: No snapshot for period — 404 SNAPSHOT_NOT_FOUND
  - [x] 5.7 Test: DM accessing non-owned project — 403
  - [x] 5.8 Test: Finance accessing any project — 200
  - [x] 5.9 Test: All monetary values are integer paise (no decimals)
  - [x] 5.10 Test: Latest snapshot returned when multiple exist for same period (bonus coverage)

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

### API Response Patterns

```typescript
// GET /api/v1/reports/projects/:id/ledger?period=2026-01
// Response 200 — T&M / Fixed Cost / AMC (employee-based models):
{
  "data": {
    "revenue_paise": 50000000,
    "cost_paise": 35000000,
    "profit_paise": 15000000,
    "margin_percent": 0.3,
    "engagement_model": "TIME_AND_MATERIALS",
    "calculated_at": "2026-01-15T10:30:00Z",
    "engine_version": "1.0.0",
    "recalculation_run_id": "uuid",
    "employees": [
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

// Response 200 — Infrastructure DETAILED:
{
  "data": {
    "revenue_paise": 100000000,
    "cost_paise": 75000000,
    "profit_paise": 25000000,
    "margin_percent": 0.25,
    "engagement_model": "INFRASTRUCTURE",
    "infra_cost_mode": "DETAILED",
    "calculated_at": "2026-01-15T10:30:00Z",
    "engine_version": "1.0.0",
    "recalculation_run_id": "uuid",
    "vendor_cost_paise": 50000000,
    "employees": [
      {
        "employeeId": "uuid",
        "employeeName": "Ops Engineer",
        "designation": "DevOps Lead",
        "hours": 120,
        "cost_per_hour_paise": 62500,
        "contribution_paise": 7500000
      }
    ]
  }
}

// Response 200 — Infrastructure SIMPLE:
{
  "data": {
    "revenue_paise": 100000000,
    "cost_paise": 80000000,
    "profit_paise": 20000000,
    "margin_percent": 0.2,
    "engagement_model": "INFRASTRUCTURE",
    "infra_cost_mode": "SIMPLE",
    "calculated_at": "2026-01-15T10:30:00Z",
    "engine_version": "1.0.0",
    "recalculation_run_id": "uuid",
    "vendor_cost_paise": 50000000,
    "manpower_cost_paise": 30000000
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

- **From 4.5:** `breakdown_json` in `calculation_snapshots` is **model-aware** — T&M/FC/AMC/Infra DETAILED have `employees[]` array; Infra SIMPLE has `vendorCostPaise` + `manpowerCostPaise` with no employees. The ledger API passes this through — shape varies by `engagement_model` + `infra_cost_mode`.
- **From 4.0:** `infraCostMode` persisted on Project model as `'SIMPLE' | 'DETAILED'` — available in snapshot breakdown for frontend conditional rendering.
- **From 6.1:** `dashboards.routes.ts` exists. Ledger gets its own `ledger.routes.ts` since it's a distinct concern (detail view vs list view).

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
- E2E baseline: 76/76 tests pass before implementation
- Backend unit tests: 10/10 ledger tests pass; 403/404 total backend tests pass (1 pre-existing failure in employees.routes.test.ts — DELIVERY_MANAGER getting 200 instead of 403 on GET /employees; inherited from prior sprint)

### Completion Notes List
- Used `AppError('SNAPSHOT_NOT_FOUND', ..., 404)` instead of `NotFoundError` because NotFoundError hardcodes `code='NOT_FOUND'` (readonly property) — story AC3 requires `SNAPSHOT_NOT_FOUND` code
- Zod schema uses `z.union()` not `z.discriminatedUnion()` because Infra DETAILED and Infra SIMPLE share `engagement_model: 'INFRASTRUCTURE'` discriminator value
- Employee mapping in breakdown_json: `name` → `employeeName`, `costPerHourPaise` → `cost_per_hour_paise`, `contributionPaise` → `contribution_paise` (camelCase storage → snake_case API response)
- `CalculationSnapshot.valuePaise` is BigInt — converted to Number for margin calculation (`Number(snapshot.valuePaise) / 10000`)
- RBAC: DM ownership check in service layer (not route), Finance/Admin bypass — consistent with project.service.ts pattern

### File List
**New files:**
- `packages/backend/src/services/ledger.service.ts` — Core service: getProjectLedger()
- `packages/backend/src/services/ledger.service.test.ts` — 10 tests covering all ACs
- `packages/backend/src/routes/ledger.routes.ts` — GET /projects/:id/ledger route
- `packages/shared/src/schemas/dashboard.schema.ts` — Zod ledgerResponseSchema (3 union variants)

**Modified files:**
- `packages/backend/src/routes/index.ts` — Added ledger routes import and mount at /api/v1/reports
- `packages/shared/src/schemas/index.ts` — Added ledgerResponseSchema + LedgerResponseData exports

### Change Log
- **2026-02-28:** Implemented Story 6-3 (Ledger Drawer API & Data Contract). Created ledger service, route, Zod schema, and comprehensive tests. All 5 tasks complete, 10/10 tests passing.

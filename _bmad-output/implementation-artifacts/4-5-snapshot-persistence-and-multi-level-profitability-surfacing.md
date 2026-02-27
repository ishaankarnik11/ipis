# Story 4.5: Snapshot Persistence & Multi-Level Profitability Surfacing

Status: ready-for-dev

## Story

As a system,
I want to persist calculation results as snapshots after each recalculation and aggregate profitability at project, practice, department, and company level,
so that dashboard queries are fast reads against pre-computed data and the Ledger Drawer has a complete, structured breakdown source.

## Acceptance Criteria (AC)

1. **Given** `snapshot.service.ts` function `persistSnapshots({ recalculationRunId, projectResults })`,
   **When** called after a successful recalculation,
   **Then** it writes one `calculation_snapshots` row per entity/figure combination with: `entity_type`, `entity_id`, `figure_type` (one of: `MARGIN_PERCENT`, `EMPLOYEE_COST`, `UTILIZATION_PERCENT`, `BILLABLE_PERCENT`, `COST_PER_HOUR`, `REVENUE_CONTRIBUTION`), `value_paise`, `breakdown_json`, `engine_version`, `calculated_at`.

2. **Given** the Prisma migration for this story,
   **When** it runs,
   **Then** two tables are created: `calculation_snapshots` (`id`, `recalculation_run_id`, `entity_type`, `entity_id`, `figure_type`, `period_month`, `period_year`, `value_paise` BIGINT, `breakdown_json` JSONB, `engine_version`, `calculated_at`) and `recalculation_runs` (`id`, `upload_event_id`, `projects_processed` INT, `completed_at`).

3. **Given** snapshots are written for `entity_type = 'PROJECT'`,
   **When** the snapshot service runs,
   **Then** one row is written per project per figure type per period.

4. **Given** snapshots for `entity_type = 'PRACTICE'`,
   **When** written,
   **Then** employee costs are aggregated by `designation` across all projects — surfacing practice-level cost contribution (FR34).

5. **Given** snapshots for `entity_type = 'DEPARTMENT'` and `entity_type = 'COMPANY'`,
   **When** written,
   **Then** department rows aggregate all projects in that department; company row aggregates across all departments — all 4 levels of profitability surfaced (FR34).

6. **Given** snapshots for `entity_type = 'EMPLOYEE'`,
   **When** written,
   **Then** one row is written per active employee per figure type per period with: `totalHours`, `billableHours`, `billableUtilisationPercent`, `totalCostPaise`, `revenueContributionPaise`, `profitContributionPaise` — data source for Employee Dashboard (FR38).

7. **Given** `persistSnapshots` is called,
   **When** its call site is inspected,
   **Then** it is called only from `upload.service.ts` after a successful database commit — never from route handlers or other services.

8. **Given** a recalculation that throws an exception,
   **When** the error is caught in `upload.service.ts`,
   **Then** no snapshot rows are written for that run, previous snapshots remain intact (NFR14), and the error is logged via pino.

9. **Given** PostgreSQL indexes,
   **When** the migration runs,
   **Then** indexes are created on `calculation_snapshots`: `(entity_type, entity_id, period_month, period_year)` and `(recalculation_run_id)`.

10. **Given** the `breakdown_json` field,
    **When** a snapshot is written for `figure_type = 'MARGIN_PERCENT'`,
    **Then** the JSON is **model-aware** and contains the full decomposed input set:
    - **T&M / Fixed Cost / AMC**: `{ engagementModel, revenue, cost, profit, employees: [{ employeeId, name, designation, hours, costPerHourPaise, contributionPaise }] }`
    - **Infrastructure DETAILED**: `{ engagementModel, infraCostMode: 'DETAILED', revenue, cost, profit, vendorCostPaise, employees: [{ employeeId, name, designation, hours, costPerHourPaise, contributionPaise }] }`
    - **Infrastructure SIMPLE**: `{ engagementModel, infraCostMode: 'SIMPLE', revenue, cost, profit, vendorCostPaise, manpowerCostPaise }` — **no employees array**

11. **Given** EMPLOYEE-level snapshot rows,
    **When** written for an Infrastructure SIMPLE project,
    **Then** no EMPLOYEE-level rows are written (there are no employee assignments to decompose); all other engagement models write one EMPLOYEE row per active employee per figure type per period.

12. **Given** `snapshot.service.test.ts`,
    **When** `pnpm test` runs,
    **Then** tests verify: correct row count per recalculation run, correct entity_type aggregation, snapshot isolation on failure (no partial writes), model-aware `breakdown_json` shape for T&M vs AMC vs Infra SIMPLE vs Infra DETAILED.

## Tasks / Subtasks

- [ ] Task 1: Prisma migration (AC: 2, 9)
  - [ ] 1.1 Add `recalculation_runs` table to schema.prisma
  - [ ] 1.2 Add `calculation_snapshots` table with BIGINT `value_paise`, JSONB `breakdown_json`
  - [ ] 1.3 Add indexes: `(entity_type, entity_id, period_month, period_year)`, `(recalculation_run_id)`
  - [ ] 1.4 Run `pnpm prisma migrate dev`

- [ ] Task 2: Snapshot service (AC: 1, 3, 4, 5, 6, 7, 10, 11)
  - [ ] 2.1 Create `services/snapshot.service.ts`
  - [ ] 2.2 `persistSnapshots({ recalculationRunId, projectResults })` — writes PROJECT-level rows
  - [ ] 2.3 Aggregate PRACTICE-level rows (by designation)
  - [ ] 2.4 Aggregate DEPARTMENT-level rows (by department)
  - [ ] 2.5 Aggregate COMPANY-level row (all departments)
  - [ ] 2.6 Write EMPLOYEE-level rows (per active employee per figure type) — **skip for Infrastructure SIMPLE** (no employee assignments)
  - [ ] 2.7 Populate `breakdown_json` with **model-aware** decomposed input set:
    - T&M / Fixed Cost / AMC: `{ engagementModel, ..., employees: [...] }`
    - Infra DETAILED: `{ engagementModel, infraCostMode: 'DETAILED', vendorCostPaise, employees: [...] }`
    - Infra SIMPLE: `{ engagementModel, infraCostMode: 'SIMPLE', vendorCostPaise, manpowerCostPaise }` — no employees array

- [ ] Task 3: Error isolation (AC: 8)
  - [ ] 3.1 Wrap snapshot writes in try/catch — log via pino, never rethrow to corrupt prior snapshots
  - [ ] 3.2 Use `prisma.$transaction` for all snapshot writes within a single run

- [ ] Task 4: Tests (AC: 12)
  - [ ] 4.1 Create `services/snapshot.service.test.ts`
  - [ ] 4.2 Test: Correct row count per recalculation run (PROJECT + PRACTICE + DEPARTMENT + COMPANY + EMPLOYEE)
  - [ ] 4.3 Test: PRACTICE aggregation by designation
  - [ ] 4.4 Test: DEPARTMENT aggregation
  - [ ] 4.5 Test: COMPANY rollup
  - [ ] 4.6 Test: EMPLOYEE-level rows with utilisation metrics
  - [ ] 4.7 Test: Snapshot isolation on failure — no partial writes
  - [ ] 4.8 Test: breakdown_json shape for T&M project (has employees array)
  - [ ] 4.9 Test: breakdown_json shape for AMC project (has employees array, multi-employee)
  - [ ] 4.10 Test: breakdown_json shape for Infra SIMPLE (vendorCostPaise + manpowerCostPaise, no employees)
  - [ ] 4.11 Test: breakdown_json shape for Infra DETAILED (vendorCostPaise + employees array)
  - [ ] 4.12 Test: Infra SIMPLE project produces zero EMPLOYEE-level rows

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Called only from `upload.service.ts`**: Never from route handlers or other services.
2. **All paise**: `value_paise` is BIGINT integer paise.
3. **`breakdown_json`**: Model-aware decomposed input set for Ledger Drawer. Shape varies by `engagementModel` + `infraCostMode`. Always includes `engagementModel` field so downstream consumers (Ledger API/UI) can switch on it.
4. **Entity types**: `PROJECT`, `PRACTICE`, `DEPARTMENT`, `COMPANY`, `EMPLOYEE`.
   - **Note**: Infrastructure SIMPLE projects produce no EMPLOYEE-level rows.
5. **Figure types**: `MARGIN_PERCENT`, `EMPLOYEE_COST`, `UTILIZATION_PERCENT`, `BILLABLE_PERCENT`, `COST_PER_HOUR`, `REVENUE_CONTRIBUTION`.
6. **Atomic writes**: All snapshot rows for a single run written in one `prisma.$transaction`.
7. **Error isolation**: Failed recalculation must not corrupt previous snapshots.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Calculation engine | `services/calculation-engine/index.ts` | Stories 4.1-4.4 — all 5 calculator functions |
| Prisma client | `lib/prisma.ts` | Story 1.1 |
| pino logger | Backend logger setup | Story 1.1 |

### Prisma Schema — Migration Required

```prisma
model RecalculationRun {
  id                String   @id @default(uuid())
  uploadEventId     String   @map("upload_event_id")
  projectsProcessed Int      @map("projects_processed")
  completedAt       DateTime @map("completed_at")

  snapshots         CalculationSnapshot[]

  @@map("recalculation_runs")
}

model CalculationSnapshot {
  id                  String   @id @default(uuid())
  recalculationRunId  String   @map("recalculation_run_id")
  entityType          String   @map("entity_type")
  entityId            String   @map("entity_id")
  figureType          String   @map("figure_type")
  periodMonth         Int      @map("period_month")
  periodYear          Int      @map("period_year")
  valuePaise          BigInt   @map("value_paise")
  breakdownJson       Json     @map("breakdown_json")
  engineVersion       String   @map("engine_version")
  calculatedAt        DateTime @map("calculated_at")

  recalculationRun    RecalculationRun @relation(fields: [recalculationRunId], references: [id])

  @@index([entityType, entityId, periodMonth, periodYear], name: "snapshots_entity_period_idx")
  @@index([recalculationRunId], name: "snapshots_run_id_idx")
  @@map("calculation_snapshots")
}
```

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/services/
├── snapshot.service.ts
└── snapshot.service.test.ts
```

Existing files to modify:
```
packages/backend/prisma/schema.prisma   # Add recalculation_runs, calculation_snapshots
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Ledger Drawer Persist Intermediates Decision]
- [Source: _bmad-output/planning-artifacts/prd.md — FR34, FR35, FR38]

### Previous Story Intelligence

- **From 4.1-4.4:** All 5 calculator functions available in calculation-engine/index.ts. Pure functions — snapshot service fetches data from Prisma, calls calculators, writes results. AMC uses `employeeCosts[]` array. Infrastructure uses `mode: 'SIMPLE' | 'DETAILED'` discriminated union.
- **From 4.0:** `infraCostMode` column persisted on Project model — snapshot service reads this to determine SIMPLE vs DETAILED breakdown shape.
- **From Epic 3:** Project table with engagement model, department, delivery manager established. `completionPercent` for Fixed Cost projects stored in projects table.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

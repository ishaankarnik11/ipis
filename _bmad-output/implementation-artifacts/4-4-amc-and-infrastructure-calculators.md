# Story 4.4: AMC & Infrastructure Calculators

Status: in-progress

## Story

As a system,
I want to calculate profitability for AMC and Infrastructure projects using their distinct commercial models,
so that all 4 engagement types are accurately represented with their actual revenue-cost logic.

## Background

The party-mode design discussion (2026-02-25) established two key decisions:
1. **AMC projects support multiple employees** — same `employeeCosts[]` pattern as T&M, replacing the earlier single-employee `(supportHours, costPerHourPaise)` API.
2. **Infrastructure projects support SIMPLE/DETAILED modes** — SIMPLE uses a lump-sum `manpowerCostPaise`; DETAILED uses per-employee `employeeCosts[]` (same array pattern). The calculator receives `mode` as a discriminated union input.

Both patterns reuse the existing `TmEmployeeCost` type (renamed to `EmployeeCostEntry` for clarity across models).

**Dependency**: Story 4.0 (Project Field Persistence & Infrastructure Cost Mode) must be completed first — it adds `infraCostMode` to the Prisma schema and persistence layer.

## Acceptance Criteria (AC)

1. **Given** a shared type `EmployeeCostEntry = { hours: number; costPerHourPaise: number }`,
   **When** types.ts is examined,
   **Then** `EmployeeCostEntry` is exported and `TmEmployeeCost` is a type alias for backward compatibility; `TmInput`, `FixedCostInput`, `AmcInput`, and `InfrastructureDetailedInput` all reference `EmployeeCostEntry`.

2. **Given** a pure function `calculateAmc({ contractValuePaise, employeeCosts })`,
   **When** called,
   **Then** it returns `{ revenuePaise: contractValuePaise, costPaise: sum(employeeCosts[i].hours * employeeCosts[i].costPerHourPaise), profitPaise, marginPercent }`.

3. **Given** reference fixture values for AMC (single-employee and multi-employee),
   **When** `calculateAmc` is called,
   **Then** the returned values match exactly.

4. **Given** a pure function `calculateInfrastructure(input)` accepting a discriminated union on `mode`,
   **When** called with `mode: 'SIMPLE'` input `{ mode, infraInvoicePaise, vendorCostPaise, manpowerCostPaise }`,
   **Then** it returns `{ revenuePaise: infraInvoicePaise, costPaise: vendorCostPaise + manpowerCostPaise, profitPaise, marginPercent }`.

5. **Given** `calculateInfrastructure(input)`,
   **When** called with `mode: 'DETAILED'` input `{ mode, infraInvoicePaise, vendorCostPaise, employeeCosts }`,
   **Then** it returns `{ revenuePaise: infraInvoicePaise, costPaise: vendorCostPaise + sum(employeeCosts), profitPaise, marginPercent }`.

6. **Given** reference fixture values for Infrastructure (SIMPLE profitable, SIMPLE loss, DETAILED profitable, DETAILED loss),
   **When** `calculateInfrastructure` is called,
   **Then** the returned values match exactly.

7. **Given** both functions,
   **When** inspected,
   **Then** no database calls, no HTTP calls — all values in integer paise.

8. **Given** co-located test files,
   **When** `pnpm test` runs,
   **Then** all cases pass for both models including profitable and loss-making scenarios.

9. **Given** `packages/backend/src/services/calculation-engine/index.ts`,
   **When** examined after this story,
   **Then** all five functions are exported: `calculateCostPerHour`, `calculateTm`, `calculateFixedCost`, `calculateAmc`, `calculateInfrastructure`. Additionally `EmployeeCostEntry` type is exported.

## Tasks / Subtasks

- [x] Task 0: Shared type extraction (AC: 1)
  - [x] 0.1 Rename `TmEmployeeCost` → `EmployeeCostEntry` in types.ts; add `export type TmEmployeeCost = EmployeeCostEntry` alias for backward compatibility
  - [x] 0.2 Update `TmInput`, `FixedCostInput` references to use `EmployeeCostEntry`
  - [x] 0.3 Add `AmcInput` with `{ contractValuePaise: number; employeeCosts: EmployeeCostEntry[] }` and `AmcResult`
  - [x] 0.4 Replace existing `InfrastructureInput` with discriminated union:
    - `InfrastructureSimpleInput = { mode: 'SIMPLE'; infraInvoicePaise; vendorCostPaise; manpowerCostPaise }`
    - `InfrastructureDetailedInput = { mode: 'DETAILED'; infraInvoicePaise; vendorCostPaise; employeeCosts: EmployeeCostEntry[] }`
    - `InfrastructureInput = InfrastructureSimpleInput | InfrastructureDetailedInput`
  - [x] 0.5 Update index.ts exports to include `EmployeeCostEntry`, `AmcInput`, `AmcResult`, `InfrastructureInput`, `InfrastructureSimpleInput`, `InfrastructureDetailedInput`, `InfrastructureResult`
  - [x] 0.6 Verify existing T&M and Fixed Cost tests still pass after rename

- [x] Task 1: TDD tests for AMC — WRITE FIRST (AC: 3, 8)
  - [x] 1.1 Create `services/calculation-engine/amc.calculator.test.ts`
  - [x] 1.2 Test: Profitable AMC — single employee
  - [x] 1.3 Test: Profitable AMC — multiple employees (3+ employees with different hours/rates)
  - [x] 1.4 Test: Loss-making AMC (total employee cost > contract value)
  - [x] 1.5 Test: Zero employee hours (empty employeeCosts array → cost = 0)
  - [x] 1.6 Test: Zero revenue (contractValuePaise = 0 → marginPercent = 0)

- [x] Task 2: AMC calculator (AC: 2)
  - [x] 2.1 Create `services/calculation-engine/amc.calculator.ts`
  - [x] 2.2 Implementation: sum employeeCosts using same reduce pattern as T&M

- [x] Task 3: TDD tests for Infrastructure — WRITE FIRST (AC: 6, 8)
  - [x] 3.1 Create `services/calculation-engine/infrastructure.calculator.test.ts`
  - [x] 3.2 Test: SIMPLE mode — profitable
  - [x] 3.3 Test: SIMPLE mode — loss-making (vendor + manpower > invoice)
  - [x] 3.4 Test: SIMPLE mode — zero vendor cost
  - [x] 3.5 Test: DETAILED mode — profitable (multi-employee)
  - [x] 3.6 Test: DETAILED mode — loss-making
  - [x] 3.7 Test: DETAILED mode — zero employee hours (empty employeeCosts array)
  - [x] 3.8 Test: Zero revenue (infraInvoicePaise = 0 → marginPercent = 0)

- [x] Task 4: Infrastructure calculator (AC: 4, 5)
  - [x] 4.1 Create `services/calculation-engine/infrastructure.calculator.ts`
  - [x] 4.2 Implementation: branch on `input.mode` — SIMPLE sums lump costs, DETAILED sums employeeCosts

- [x] Task 5: Update index exports (AC: 9)
  - [x] 5.1 Export `calculateAmc` and `calculateInfrastructure` from `index.ts`
  - [x] 5.2 Export all new types from `index.ts`
  - [x] 5.3 Run full `pnpm test` — all existing + new tests pass

## Dev Notes

### Architecture Constraints (MUST follow)

1. **PURE FUNCTIONS**: No DB, no HTTP, no side effects.
2. **All paise**: Integer paise for all currency.
3. **Margin as decimal 0-1**: Handle division by zero (revenue = 0 → margin = 0).
4. **TDD**: Write tests first.
5. **EmployeeCostEntry pattern**: AMC and Detailed Infrastructure reuse the same `EmployeeCostEntry` type and `reduce` accumulation pattern as T&M (`sum + Math.round(emp.hours * emp.costPerHourPaise)`).
6. **Discriminated union for Infrastructure**: Use `mode` field to discriminate — TypeScript exhaustive check recommended (switch + never default).

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Engine structure | `services/calculation-engine/` | Stories 4.1-4.3 |
| types.ts | `services/calculation-engine/types.ts` | Extend with revised AMC/Infra types |
| T&M calculator | `services/calculation-engine/tm.calculator.ts` | Reference pattern for employeeCosts reduce |
| Fixed Cost calculator | `services/calculation-engine/fixed-cost.calculator.ts` | Also uses employeeCosts pattern |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/services/calculation-engine/
├── amc.calculator.ts
├── amc.calculator.test.ts
├── infrastructure.calculator.ts
└── infrastructure.calculator.test.ts
```

Existing files to modify:
```
services/calculation-engine/types.ts   # Rename TmEmployeeCost → EmployeeCostEntry, revise AmcInput, InfrastructureInput
services/calculation-engine/index.ts   # Export all 5 functions + new types
```

### References

- Party-mode discussion (2026-02-25): AMC multi-employee + Infra SIMPLE/DETAILED design decision
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR32, FR33]

### Previous Story Intelligence

- **From 4.1:** `calculateCostPerHour` produces `costPerHourPaise` — upstream input to all employee cost calculations.
- **From 4.2:** T&M calculator established `employeeCosts[]` pattern with `TmEmployeeCost` type. AMC reuses same pattern.
- **From 4.3:** Fixed Cost calculator also uses `employeeCosts[]` with `TmEmployeeCost`. Renaming to `EmployeeCostEntry` unifies terminology.
- **From 4.0:** `infraCostMode` column (`'SIMPLE' | 'DETAILED'`) persisted in DB — calculator receives mode from project data.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — no debugging needed; all tests passed on first run.

### Completion Notes List
- Code review identified 7 critical issues (C1-C7): wrong AMC type design (single value vs array), missing infrastructure calculator, missing discriminated union, missing exports
- All 7 critical issues resolved in this implementation pass
- Backward compatibility preserved via `TmEmployeeCost` type alias with `@deprecated` JSDoc tag
- All 45 tests pass across 5 calculator test suites (cost-rate: 9, tm: 9, fixed-cost: 7, amc: 6, infrastructure: 9, output-shape: 5)
- Existing T&M and Fixed Cost tests verified passing after `EmployeeCostEntry` rename (H2 resolved)

### Change Log
1. **types.ts** — Renamed `TmEmployeeCost` → `EmployeeCostEntry`; added backward-compat alias; updated `TmInput`/`FixedCostInput` refs; rewrote `AmcInput` to use `employeeCosts[]`; replaced flat `InfrastructureInput` with `InfrastructureSimpleInput | InfrastructureDetailedInput` discriminated union
2. **amc.calculator.ts** — Rewrote to destructure `employeeCosts` array and use `reduce` pattern (matching T&M)
3. **amc.calculator.test.ts** — Rewrote all tests for `employeeCosts[]` API; added multi-employee test (3 employees), empty-array test
4. **infrastructure.calculator.ts** — Created; switch on `input.mode` with SIMPLE/DETAILED branches; exhaustive `never` check
5. **infrastructure.calculator.test.ts** — Created; 9 tests covering SIMPLE profitable/loss/zero-vendor, DETAILED profitable/loss/empty-array, zero-revenue both modes, output shape
6. **index.ts** — Added `calculateAmc`, `calculateInfrastructure` function exports; added all new type exports (`EmployeeCostEntry`, `AmcInput`, `AmcResult`, `InfrastructureInput`, `InfrastructureSimpleInput`, `InfrastructureDetailedInput`, `InfrastructureResult`)

### File List
| File | Action |
|------|--------|
| `packages/backend/src/services/calculation-engine/types.ts` | Modified |
| `packages/backend/src/services/calculation-engine/amc.calculator.ts` | Modified |
| `packages/backend/src/services/calculation-engine/amc.calculator.test.ts` | Modified |
| `packages/backend/src/services/calculation-engine/infrastructure.calculator.ts` | Created |
| `packages/backend/src/services/calculation-engine/infrastructure.calculator.test.ts` | Created |
| `packages/backend/src/services/calculation-engine/index.ts` | Modified |
| `_bmad-output/implementation-artifacts/4-4-amc-and-infrastructure-calculators.md` | Modified |

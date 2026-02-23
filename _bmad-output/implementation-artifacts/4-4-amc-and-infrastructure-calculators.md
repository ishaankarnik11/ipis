# Story 4.4: AMC & Infrastructure Calculators

Status: ready-for-dev

## Story

As a system,
I want to calculate profitability for AMC and Infrastructure projects using their distinct commercial models,
so that all 4 engagement types are accurately represented with their actual revenue-cost logic.

## Acceptance Criteria (AC)

1. **Given** a pure function `calculateAmc({ contractValuePaise, supportHours, costPerHourPaise })`,
   **When** called,
   **Then** it returns `{ revenuePaise: contractValuePaise, costPaise: supportHours * costPerHourPaise, profitPaise, marginPercent }`.

2. **Given** reference fixture values for AMC,
   **When** `calculateAmc` is called,
   **Then** the returned values match exactly.

3. **Given** a pure function `calculateInfrastructure({ infraInvoicePaise, vendorCostPaise, manpowerCostPaise })`,
   **When** called,
   **Then** it returns `{ revenuePaise: infraInvoicePaise, costPaise: vendorCostPaise + manpowerCostPaise, profitPaise, marginPercent }`.

4. **Given** reference fixture values for Infrastructure,
   **When** `calculateInfrastructure` is called,
   **Then** the returned values match exactly.

5. **Given** both functions,
   **When** inspected,
   **Then** no database calls, no HTTP calls — all values in integer paise.

6. **Given** co-located test files,
   **When** `pnpm test` runs,
   **Then** all cases pass for both models including profitable and loss-making scenarios.

7. **Given** `packages/backend/src/services/calculation-engine/index.ts`,
   **When** examined after this story,
   **Then** all five functions are exported: `calculateCostPerHour`, `calculateTm`, `calculateFixedCost`, `calculateAmc`, `calculateInfrastructure`.

## Tasks / Subtasks

- [ ] Task 1: TDD tests for AMC — WRITE FIRST (AC: 2, 6)
  - [ ] 1.1 Create `services/calculation-engine/amc.calculator.test.ts`
  - [ ] 1.2 Test: Profitable AMC
  - [ ] 1.3 Test: Loss-making AMC (support cost > contract)
  - [ ] 1.4 Test: Zero support hours

- [ ] Task 2: AMC calculator (AC: 1)
  - [ ] 2.1 Create `services/calculation-engine/amc.calculator.ts`

- [ ] Task 3: TDD tests for Infrastructure — WRITE FIRST (AC: 4, 6)
  - [ ] 3.1 Create `services/calculation-engine/infrastructure.calculator.test.ts`
  - [ ] 3.2 Test: Profitable Infrastructure
  - [ ] 3.3 Test: Loss-making Infrastructure
  - [ ] 3.4 Test: Zero vendor cost

- [ ] Task 4: Infrastructure calculator (AC: 3)
  - [ ] 4.1 Create `services/calculation-engine/infrastructure.calculator.ts`

- [ ] Task 5: Update index exports (AC: 7)
  - [ ] 5.1 Export all 5 functions from `index.ts`

## Dev Notes

### Architecture Constraints (MUST follow)

1. **PURE FUNCTIONS**: No DB, no HTTP, no side effects.
2. **All paise**: Integer paise for all currency.
3. **Margin as decimal 0-1**: Handle division by zero (revenue = 0 → margin = 0).
4. **TDD**: Write tests first.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Engine structure | `services/calculation-engine/` | Stories 4.1-4.3 |
| types.ts | `services/calculation-engine/types.ts` | Extend with AMC/Infra types |

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
services/calculation-engine/index.ts   # Export all 5 functions
services/calculation-engine/types.ts   # Add AmcInput, InfraInput types
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR32, FR33]

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

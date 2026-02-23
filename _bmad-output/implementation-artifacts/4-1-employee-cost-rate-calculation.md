# Story 4.1: Employee Cost Rate Calculation

Status: ready-for-dev

## Story

As a system,
I want to calculate the hourly cost rate for any employee from their salary and overhead data,
so that every profitability calculation uses a correct, consistent, and traceable cost basis.

## Acceptance Criteria (AC)

1. **Given** a pure function `calculateCostPerHour({ annualCtcPaise, overheadPaise, standardMonthlyHours })`,
   **When** called with valid inputs,
   **Then** it returns `costPerHourPaise = Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours)` — integer paise, rounded.

2. **Given** reference fixture: `annualCtcPaise = 84000000` (₹8,40,000), `overheadPaise = 18000000` (₹1,80,000), `standardMonthlyHours = 160`,
   **When** `calculateCostPerHour` is called,
   **Then** the result matches the value validated against the provided manual Excel reference.

3. **Given** `standardMonthlyHours = 0`,
   **When** `calculateCostPerHour` is called,
   **Then** it throws a `RangeError`: `"standardMonthlyHours must be greater than zero"`.

4. **Given** the function,
   **When** inspected,
   **Then** it has no database calls, no HTTP calls, no side effects — inputs and outputs are plain TypeScript numbers.

5. **Given** co-located test file `cost-rate.calculator.test.ts`,
   **When** `pnpm test` runs,
   **Then** all cases pass: standard case, 176-hour month variant, different overhead, rounding to nearest paise.

6. **Given** `packages/backend/src/services/calculation-engine/index.ts`,
   **When** examined,
   **Then** `calculateCostPerHour` is exported as the canonical cost formula for use by all 4 model calculators.

## Tasks / Subtasks

- [ ] Task 1: Cost rate calculator (AC: 1, 3, 4)
  - [ ] 1.1 Create `services/calculation-engine/cost-rate.calculator.ts`
  - [ ] 1.2 Implement `calculateCostPerHour({ annualCtcPaise, overheadPaise, standardMonthlyHours })` — pure function
  - [ ] 1.3 Input validation: throw RangeError if standardMonthlyHours <= 0
  - [ ] 1.4 Return `Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours)`

- [ ] Task 2: Types (AC: 1)
  - [ ] 2.1 Create `services/calculation-engine/types.ts` — `CostRateInput`, `CalculationResult` types

- [ ] Task 3: Index exports (AC: 6)
  - [ ] 3.1 Create `services/calculation-engine/index.ts` — export `calculateCostPerHour`

- [ ] Task 4: TDD tests (AC: 2, 5) — WRITE TESTS FIRST
  - [ ] 4.1 Create `services/calculation-engine/cost-rate.calculator.test.ts`
  - [ ] 4.2 Test: Standard case (84000000 CTC + 18000000 overhead, 160 hours) → expected paise value
  - [ ] 4.3 Test: 176-hour month variant
  - [ ] 4.4 Test: Different overhead amount
  - [ ] 4.5 Test: Rounding to nearest paise (non-integer intermediate)
  - [ ] 4.6 Test: Zero hours → RangeError
  - [ ] 4.7 Test: Negative hours → RangeError

## Dev Notes

### Architecture Constraints (MUST follow)

1. **PURE FUNCTION**: No database calls. No HTTP calls. No imports from Prisma, Express, or any I/O module.
2. **All values in integer paise**: Inputs and outputs are plain TypeScript numbers representing paise.
3. **TDD**: Write tests FIRST against expected reference values, then implement.
4. **Co-located tests**: Test file next to source file.
5. **No side effects**: Function takes data in, returns data out. No logging, no mutation.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Vitest config | Backend vitest config | Already configured |

### Prisma Schema — No Migration

Pure function module. No database interaction.

### New Dependencies Required

None.

### Project Structure Notes

New files to create:
```
packages/backend/src/services/calculation-engine/
├── cost-rate.calculator.ts          # calculateCostPerHour pure function
├── cost-rate.calculator.test.ts     # TDD tests
├── types.ts                         # Shared types for calculation engine
└── index.ts                         # Engine entry point, exports
```

### Testing Strategy

- **TDD**: Write tests FIRST with reference fixture values, then implement to pass
- **Pure function tests**: No mocks needed — direct input/output
- **Edge cases**: Zero hours, negative, large numbers, rounding behavior
- **Reference fixtures**: Use Dell's Excel reference data when available

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Calculation Engine Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29]

### Previous Story Intelligence

- **From Epic 1-3:** All infrastructure in place. This epic starts the pure calculation module — independent of prior service patterns.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

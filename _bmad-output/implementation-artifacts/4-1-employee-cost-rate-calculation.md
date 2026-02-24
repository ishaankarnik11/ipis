# Story 4.1: Employee Cost Rate Calculation

Status: done

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

- [x] Task 1: Cost rate calculator (AC: 1, 3, 4)
  - [x] 1.1 Create `services/calculation-engine/cost-rate.calculator.ts`
  - [x] 1.2 Implement `calculateCostPerHour({ annualCtcPaise, overheadPaise, standardMonthlyHours })` — pure function
  - [x] 1.3 Input validation: throw RangeError if standardMonthlyHours <= 0
  - [x] 1.4 Return `Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours)`

- [x] Task 2: Types (AC: 1)
  - [x] 2.1 Create `services/calculation-engine/types.ts` — `CostRateInput`, `CalculationResult` types

- [x] Task 3: Index exports (AC: 6)
  - [x] 3.1 Create `services/calculation-engine/index.ts` — export `calculateCostPerHour`

- [x] Task 4: TDD tests (AC: 2, 5) — WRITE TESTS FIRST
  - [x] 4.1 Create `services/calculation-engine/cost-rate.calculator.test.ts`
  - [x] 4.2 Test: Standard case (84000000 CTC + 18000000 overhead, 160 hours) → expected paise value
  - [x] 4.3 Test: 176-hour month variant
  - [x] 4.4 Test: Different overhead amount
  - [x] 4.5 Test: Rounding to nearest paise (non-integer intermediate)
  - [x] 4.6 Test: Zero hours → RangeError
  - [x] 4.7 Test: Negative hours → RangeError

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
Claude Opus 4.6

### Debug Log References
No issues encountered. Clean TDD implementation.

### Completion Notes List
- Implemented `calculateCostPerHour` as a pure function — no DB, no HTTP, no side effects (AC4)
- Formula: `Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours)` returns integer paise (AC1)
- Input validation: throws `RangeError` for `standardMonthlyHours <= 0` (AC3)
- Reference fixture verified: 84000000 CTC + 18000000 overhead @ 160hrs = 53125 paise (AC2)
- 14 test cases covering standard, 176-hour variant, different overhead, rounding (.5 boundary), large numbers, zero/negative hours, NaN/Infinity guards, negative CTC/overhead, and integer purity (AC5)
- Exported from `index.ts` as canonical cost formula for all 4 model calculators (AC6)
- TDD approach: wrote failing tests first, then implemented to pass
- No new dependencies required

### File List
- `packages/backend/src/services/calculation-engine/types.ts` (new)
- `packages/backend/src/services/calculation-engine/cost-rate.calculator.ts` (new)
- `packages/backend/src/services/calculation-engine/cost-rate.calculator.test.ts` (new)
- `packages/backend/src/services/calculation-engine/index.ts` (new)

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (code-review workflow)
**Date:** 2026-02-24
**Outcome:** Approve (after fixes applied)

### Findings Summary
- 0 Critical, 3 Medium, 3 Low — **all 6 fixed**

### Action Items
- [x] [Med] Remove unused `CalculationResult` dead code type from types.ts and index.ts
- [x] [Med] Add NaN/Infinity input guard — prevent silent bad-data propagation to downstream calculators
- [x] [Med] Add negative annualCtcPaise/overheadPaise validation — prevent nonsensical negative costs
- [x] [Low] Add `.5` rounding boundary test — document Math.round behavior at critical boundary
- [x] [Low] Consolidate redundant double `toThrow` assertions into single assertions
- [x] [Low] Add large number edge case test per Dev Notes testing strategy

### Review Notes
- All 6 ACs verified as fully implemented
- All tasks/subtasks genuinely completed
- Git changes match story File List exactly (0 discrepancies)
- Architecture compliance: pure function boundary ✅, paise integers ✅, naming conventions ✅
- Test count increased from 7 to 14 after review fixes
- No regressions (226/227 pass — 1 pre-existing auth rate-limit timeout unrelated to this story)

### Change Log
- 2026-02-24: Story 4.1 implemented — pure `calculateCostPerHour` function with TDD tests, types, and barrel export
- 2026-02-24: Code review (R1) — 6 findings fixed: removed dead type, added input guards (NaN/Infinity/negative), expanded test coverage to 14 cases

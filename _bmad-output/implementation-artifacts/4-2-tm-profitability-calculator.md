# Story 4.2: T&M Profitability Calculator

Status: done

## Story

As a system,
I want to calculate profitability for Time & Materials projects using billed hours and per-role billing rates,
so that T&M revenue and margin are accurately derived from timesheet and roster data.

## Acceptance Criteria (AC)

1. **Given** a pure function `calculateTm({ billedHours, billingRatePaise, employeeCosts: [{ hours, costPerHourPaise }] })`,
   **When** called,
   **Then** it returns `{ revenuePaise, costPaise, profitPaise, marginPercent }` — all currency as integer paise, `marginPercent` as decimal (0–1 range).

2. **Given** reference fixture values validated against the provided manual Excel reference,
   **When** `calculateTm` is called with those inputs,
   **Then** the returned values match exactly.

3. **Given** cost exceeds revenue,
   **When** `calculateTm` is called,
   **Then** `profitPaise` is a negative integer and `marginPercent` is negative — loss-making projects are valid outputs, not errors.

4. **Given** `billedHours = 0` or `billingRatePaise = 0`,
   **When** `calculateTm` is called,
   **Then** `revenuePaise = 0` and the function returns without error — zero-revenue periods are valid.

5. **Given** the function,
   **When** inspected,
   **Then** it has no database calls, no HTTP calls, no imports from Prisma.

6. **Given** co-located test file `tm.calculator.test.ts`,
   **When** `pnpm test` runs,
   **Then** all cases pass: standard profitable case, loss-making case, zero hours, multiple employees with different rates.

## Tasks / Subtasks

- [x] Task 1: TDD tests — WRITE FIRST (AC: 2, 3, 4, 6)
  - [x] 1.1 Create `services/calculation-engine/tm.calculator.test.ts`
  - [x] 1.2 Test: Standard profitable T&M — revenue > cost
  - [x] 1.3 Test: Loss-making — cost > revenue, negative profit and margin
  - [x] 1.4 Test: Zero hours — revenue = 0, valid return
  - [x] 1.5 Test: Multiple employees with different cost rates

- [x] Task 2: T&M calculator (AC: 1, 5)
  - [x] 2.1 Create `services/calculation-engine/tm.calculator.ts`
  - [x] 2.2 `calculateTm(input)` — revenue = billedHours × billingRate; cost = Σ(hours × costPerHour); profit = revenue - cost; margin = profit / revenue
  - [x] 2.3 Handle revenue = 0 (margin = 0, not NaN/Infinity)

- [x] Task 3: Types + exports (AC: 1)
  - [x] 3.1 Add `TmInput`, `TmResult` to `types.ts`
  - [x] 3.2 Export `calculateTm` from `index.ts`

### Review Follow-ups (AI)
- [x] [AI-Review][MEDIUM] Export `TmEmployeeCost` from the `index.ts` barrel — currently omitted; downstream callers cannot explicitly type `employeeCosts` array items via the public module API [index.ts:3]
- [x] [AI-Review][MEDIUM] Add `_bmad-output/implementation-artifacts/sprint-status.yaml` to File List — git shows it was modified during this story but it is absent from Dev Agent Record → File List [story File List]
- [x] [AI-Review][MEDIUM] Add test for `employeeCosts: []` (empty array) — valid real-world scenario (project created before team assigned); implementation handles it correctly but it is untested [tm.calculator.test.ts]
- [x] [AI-Review][LOW] Update architecture doc param names to match implementation — `architecture.md:670` still shows `billingRate`/`costPerHour` but implementation uses `billingRatePaise`/`costPerHourPaise` per the story spec [_bmad-output/planning-artifacts/architecture.md:670]
- [x] [AI-Review][LOW] Add JSDoc to `TmInput` noting that `billedHours` must be non-negative — TypeScript `number` type permits negative values; invariant is enforced at the API layer but undocumented at the type level [types.ts:12]
- [x] [AI-Review][MEDIUM] Add JSDoc to `calculateTm` documenting "caller validates" contract — inconsistent with `calculateCostPerHour` which validates at function level; explicit JSDoc makes design choice visible [tm.calculator.ts:3]
- [x] [AI-Review][MEDIUM] Add fractional-hours test to exercise `Math.round()` — all existing tests use whole-number hours so rounding defense was untested [tm.calculator.test.ts]
- [x] [AI-Review][LOW] Rename describe label "AC1, AC5" → "AC1" — block only tests output shape, not purity; AC5 is verified by code inspection [tm.calculator.test.ts:112]
- [x] [AI-Review][LOW] Add JSDoc to `TmResult.marginPercent` documenting raw floating-point precision — downstream consumers need to know it's not rounded [types.ts:23]

## Dev Notes

### Architecture Constraints (MUST follow)

1. **PURE FUNCTION**: No DB, no HTTP, no Prisma imports.
2. **All paise**: Input and output currency values are integer paise.
3. **Margin as decimal**: `marginPercent` is 0-1 range (e.g., 0.25 = 25%).
4. **Handle division by zero**: If revenue = 0, marginPercent = 0.
5. **Negative values are valid**: Loss-making projects return negative profit/margin.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| calculateCostPerHour | `services/calculation-engine/index.ts` | Story 4.1 — use for employee cost input |
| types.ts | `services/calculation-engine/types.ts` | Story 4.1 — extend |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/services/calculation-engine/
├── tm.calculator.ts
└── tm.calculator.test.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Calculation Engine Calling Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR30]

### Previous Story Intelligence

- **From 4.1:** Calculation engine directory structure, types.ts, index.ts all established. Follow same pure function pattern.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered.

### Completion Notes List
- Implemented pure `calculateTm` function following TDD red-green-refactor cycle
- All 7 unit tests pass: standard profitable, loss-making, zero hours (billedHours=0), zero billing rate, multiple employees, integer output validation, margin range validation
- AC1: Function signature and return shape match spec exactly — all currency as integer paise, marginPercent as decimal 0-1
- AC2: Reference fixture test verifies exact values (revenue=24M, cost=8.5M, profit=15.5M, margin≈0.6458)
- AC3: Loss-making case returns negative profit (-4M) and negative margin (-1.0)
- AC4: Zero hours and zero billing rate both return revenuePaise=0 without error
- AC5: Only `type` import from `./types.js` — no DB, HTTP, or Prisma imports
- AC6: All test cases pass including multiple employees with different rates
- Extended types.ts with TmInput, TmEmployeeCost, TmResult interfaces
- Exported calculateTm and types from index.ts barrel
- No regressions: all 23 calculation-engine tests pass (14 existing + 9 T&M)
- E2E baseline: 47/47 green (no E2E tests needed — pure backend calculation with no UI)
- ✅ Resolved review finding [MEDIUM]: Exported `TmEmployeeCost` from index.ts barrel for downstream consumers
- ✅ Resolved review finding [MEDIUM]: `sprint-status.yaml` already present in File List (was added before review)
- ✅ Resolved review finding [MEDIUM]: Added unit test for empty `employeeCosts: []` array — zero cost, full margin
- ✅ Resolved review finding [LOW]: Updated architecture.md param names (`billingRatePaise`, `costPerHourPaise`, `revenuePaise`, etc.)
- ✅ Resolved review finding [LOW]: Added JSDoc to `TmInput.billedHours` documenting non-negative invariant
- ✅ Resolved review finding [MEDIUM]: Added JSDoc to `calculateTm` documenting "caller validates" contract
- ✅ Resolved review finding [MEDIUM]: Added fractional-hours test case exercising Math.round() rounding path
- ✅ Resolved review finding [LOW]: Renamed describe label "AC1, AC5" → "AC1" (purity is code-inspection, not runtime test)
- ✅ Resolved review finding [LOW]: Added JSDoc to `TmResult.marginPercent` documenting raw floating-point precision

### Change Log
- 2026-02-25: Story 4.2 implemented — T&M profitability calculator with full TDD test suite
- 2026-02-25: Addressed code review findings — 5 items resolved (3 MEDIUM, 2 LOW)
- 2026-02-25: Second code review — 4 additional items resolved (2 MEDIUM, 2 LOW): JSDoc on calculateTm + TmResult.marginPercent, fractional-hours test, describe label fix

### File List
- `packages/backend/src/services/calculation-engine/tm.calculator.ts` (new)
- `packages/backend/src/services/calculation-engine/tm.calculator.test.ts` (new)
- `packages/backend/src/services/calculation-engine/types.ts` (modified — added TmInput, TmEmployeeCost, TmResult)
- `packages/backend/src/services/calculation-engine/index.ts` (modified — added calculateTm + type exports)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status updated)
- `_bmad-output/planning-artifacts/architecture.md` (modified — corrected param names in Calculation Engine example)

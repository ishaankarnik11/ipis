# Story 4.3: Fixed Cost Profitability Calculator

Status: done

## Story

As a system,
I want to calculate profitability for Fixed Cost projects including burn rate and at-risk detection using % completion,
so that budget overruns are surfaced before they become unrecoverable.

## Acceptance Criteria (AC)

1. **Given** a pure function `calculateFixedCost({ contractValuePaise, employeeCosts: [{ hours, costPerHourPaise }], completionPercent })`,
   **When** called,
   **Then** it returns `{ revenuePaise: contractValuePaise, costPaise, profitPaise, marginPercent, burnPercent, isAtRisk }`.

2. **Given** reference fixture values validated against the provided manual Excel reference,
   **When** `calculateFixedCost` is called with those inputs,
   **Then** the returned values match exactly.

3. **Given** `burnPercent` calculation,
   **When** the result is computed,
   **Then** `burnPercent = costPaise / contractValuePaise`; when `burnPercent > completionPercent`, then `isAtRisk = true`.

4. **Given** `completionPercent` is `null` or `undefined`,
   **When** `calculateFixedCost` is called,
   **Then** it is treated as `0`; `isAtRisk` defaults to `false` when completion is unknown.

5. **Given** co-located test file `fixed-cost.calculator.test.ts`,
   **When** `pnpm test` runs,
   **Then** all cases pass: on-track project, at-risk project, completed project, null completion percent.

## Tasks / Subtasks

- [x] Task 1: TDD tests — WRITE FIRST (AC: 2, 3, 4, 5)
  - [x] 1.1 Create `services/calculation-engine/fixed-cost.calculator.test.ts`
  - [x] 1.2 Test: On-track project (burn < completion)
  - [x] 1.3 Test: At-risk project (burn > completion)
  - [x] 1.4 Test: Completed project (completion = 1.0)
  - [x] 1.5 Test: Null completion percent → treated as 0

- [x] Task 2: Fixed Cost calculator (AC: 1)
  - [x] 2.1 Create `services/calculation-engine/fixed-cost.calculator.ts`
  - [x] 2.2 `calculateFixedCost(input)` — revenue = contractValue; cost = Σ(hours × costPerHour); burn = cost / contractValue; isAtRisk = burn > completion

- [x] Task 3: Types + exports
  - [x] 3.1 Add `FixedCostInput`, `FixedCostResult` to `types.ts`
  - [x] 3.2 Export from `index.ts`

## Dev Notes

### Architecture Constraints (MUST follow)

1. **PURE FUNCTION**: No DB, no HTTP.
2. **All paise**: Currency as integer paise.
3. **completionPercent as decimal 0-1**: 50% = 0.5.
4. **Null completion = 0**: Treat missing completion as 0%.
5. **burnPercent**: costPaise / contractValuePaise (decimal 0-1).

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Engine structure | `services/calculation-engine/` | Stories 4.1, 4.2 |

### New Dependencies Required

None.

### Project Structure Notes

New files:
```
packages/backend/src/services/calculation-engine/
├── fixed-cost.calculator.ts
└── fixed-cost.calculator.test.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR31]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No debug issues encountered. Clean TDD cycle: RED → GREEN → REFACTOR.

### Completion Notes List
- Implemented `calculateFixedCost` pure function following TDD red-green-refactor cycle
- Tests written first (RED phase confirmed module-not-found failure), then implementation (GREEN phase — all 7 tests pass)
- Function computes: revenue = contractValue, cost = Σ(hours × costPerHour), profit, marginPercent, burnPercent, isAtRisk
- burnPercent = costPaise / contractValuePaise; isAtRisk = burnPercent > completionPercent
- Null/undefined completionPercent treated as 0; isAtRisk defaults to false when completion unknown
- All currency values as integer paise, Math.round for fractional cost accumulation
- Types `FixedCostInput` and `FixedCostResult` added to types.ts; reuses existing `TmEmployeeCost`
- Exported from index.ts following existing barrel-export pattern
- TypeScript typecheck passes cleanly
- Unit tests: 304/307 pass (3 inherited failures in config.service — pre-existing)
- E2E baseline: 45/47 pass (2 inherited failures — project-list-detail.spec.ts:152, user-management.spec.ts:61)
- No new regressions introduced
- No Data Contract applicable (pure calculation engine — no UI, no DB, no API endpoint)

### File List
- packages/backend/src/services/calculation-engine/fixed-cost.calculator.ts (NEW)
- packages/backend/src/services/calculation-engine/fixed-cost.calculator.test.ts (NEW)
- packages/backend/src/services/calculation-engine/types.ts (MODIFIED — added FixedCostInput, FixedCostResult)
- packages/backend/src/services/calculation-engine/index.ts (MODIFIED — added calculateFixedCost export + types)

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (adversarial code review)
**Date:** 2026-02-27

### Findings

| # | Severity | Issue | Resolution |
|---|---|---|---|
| H1 | HIGH | `FixedCostInput.completionPercent` typed as `number` (non-nullable) — contradicts AC4 which requires null handling. Tests used `as unknown as number` casts to bypass TypeScript. | FIXED — changed type to `number \| null`; removed type casts from tests. |
| H2 | HIGH | `isAtRisk` logic conflated "unknown completion" (null) with "0% completion" (literal 0). A project at 0% done with 40% budget burned was NOT flagged as at-risk. AC3 says `burn > completion` = at-risk; AC4 says default false only when completion is *unknown*. | FIXED — `isAtRisk = completionPercent == null ? false : burnPercent > completionPercent` |
| H3 | HIGH | No test for `completionPercent = 0` with positive burn — the H2 bug was undetectable. | FIXED — added test: explicit 0% completion with costs expects `isAtRisk = true`. |
| M1 | MEDIUM | Master test plan (`docs/master-test-plan.md`) referenced wrong file name `fc.calculator.test.ts` and had stale DEVELOPED_UNTESTED status for FR31. | FIXED — corrected to `fixed-cost.calculator.test.ts`, status → PASS. |
| M2 | MEDIUM | Missing JSDoc comment (TM calculator has one, this one didn't). | FIXED — added JSDoc block. |
| L1 | LOW | Missing inline comment on division-by-zero guard. | FIXED — added comment. |

### AC Verification (Post-Fix)

| AC | Status |
|---|---|
| AC1 | PASS — function signature and return shape match spec |
| AC2 | PASS — fixture values match manual Excel calculations |
| AC3 | PASS — `burnPercent = cost / contract`; `isAtRisk = burn > completion` (including literal 0) |
| AC4 | PASS — `null` completionPercent → `isAtRisk = false`; type now allows null |
| AC5 | PASS — 7 tests: on-track, at-risk, completed, null completion, zero completion, output shape, empty array |

### Test Results (Post-Fix)
- All 7 fixed-cost calculator tests pass
- All 45 calculation engine tests pass (5 test files, 0 failures)

### Data Contract Audit
Not applicable — pure calculation engine with no UI, DB, or API endpoint.

### Change Log
- 2026-02-25: Story 4.3 implementation — Fixed Cost profitability calculator with burn rate and at-risk detection
- 2026-02-27: Code review — fixed type safety (H1), isAtRisk logic bug (H2), added missing test (H3), updated master test plan (M1), added JSDoc (M2, L1)

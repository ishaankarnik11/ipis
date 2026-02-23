# Story 4.3: Fixed Cost Profitability Calculator

Status: ready-for-dev

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

- [ ] Task 1: TDD tests — WRITE FIRST (AC: 2, 3, 4, 5)
  - [ ] 1.1 Create `services/calculation-engine/fixed-cost.calculator.test.ts`
  - [ ] 1.2 Test: On-track project (burn < completion)
  - [ ] 1.3 Test: At-risk project (burn > completion)
  - [ ] 1.4 Test: Completed project (completion = 1.0)
  - [ ] 1.5 Test: Null completion percent → treated as 0

- [ ] Task 2: Fixed Cost calculator (AC: 1)
  - [ ] 2.1 Create `services/calculation-engine/fixed-cost.calculator.ts`
  - [ ] 2.2 `calculateFixedCost(input)` — revenue = contractValue; cost = Σ(hours × costPerHour); burn = cost / contractValue; isAtRisk = burn > completion

- [ ] Task 3: Types + exports
  - [ ] 3.1 Add `FixedCostInput`, `FixedCostResult` to `types.ts`
  - [ ] 3.2 Export from `index.ts`

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
### Debug Log References
### Completion Notes List
### File List

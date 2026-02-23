# Story 4.2: T&M Profitability Calculator

Status: ready-for-dev

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

- [ ] Task 1: TDD tests — WRITE FIRST (AC: 2, 3, 4, 6)
  - [ ] 1.1 Create `services/calculation-engine/tm.calculator.test.ts`
  - [ ] 1.2 Test: Standard profitable T&M — revenue > cost
  - [ ] 1.3 Test: Loss-making — cost > revenue, negative profit and margin
  - [ ] 1.4 Test: Zero hours — revenue = 0, valid return
  - [ ] 1.5 Test: Multiple employees with different cost rates

- [ ] Task 2: T&M calculator (AC: 1, 5)
  - [ ] 2.1 Create `services/calculation-engine/tm.calculator.ts`
  - [ ] 2.2 `calculateTm(input)` — revenue = billedHours × billingRate; cost = Σ(hours × costPerHour); profit = revenue - cost; margin = profit / revenue
  - [ ] 2.3 Handle revenue = 0 (margin = 0, not NaN/Infinity)

- [ ] Task 3: Types + exports (AC: 1)
  - [ ] 3.1 Add `TmInput`, `TmResult` to `types.ts`
  - [ ] 3.2 Export `calculateTm` from `index.ts`

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
### Debug Log References
### Completion Notes List
### File List

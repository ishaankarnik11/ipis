# Story 8.4: T&M Revenue Calculation — Per-Member Selling Rate

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Finance user,
I want T&M project revenue to be calculated using each team member's individual selling rate so that profitability reflects the actual rate billed to the client per resource, with full traceability in the Ledger Drawer.

## Acceptance Criteria (AC)

1. **Given** the T&M calculation path in `upload.service.ts`,
   **When** a recalculation runs for a T&M project,
   **Then** revenue is calculated as `Σ(employee_hours × employee_billingRatePaise)` using each member's `billingRatePaise` from `employee_projects` — this IS already the current implementation. This story validates it end-to-end, adds comprehensive tests, renames UI labels from "billing rate" to "selling rate", and enriches the snapshot breakdown.

2. **Given** a T&M project with a member whose `billingRatePaise` is `null`,
   **When** the recalculation runs,
   **Then** that member contributes `₹0` to revenue (hours × 0). The system does NOT error — it logs a warning via `pino`: `"T&M member {employeeId} on project {projectId} has null selling rate — contributing ₹0 revenue"`.

3. **Given** a T&M project with multiple members at different selling rates,
   **When** the recalculation runs (e.g., Member A: 80 hrs @ ₹3,000/hr, Member B: 120 hrs @ ₹1,500/hr),
   **Then** revenue = `(80 × 300000) + (120 × 150000)` = `24,000,000 + 18,000,000` = `42,000,000 paise` (₹4,20,000). Cost and margin are calculated independently as before.

4. **Given** the calculation snapshot `breakdownJson` for a T&M project,
   **When** the snapshot is persisted in `calculation_snapshots`,
   **Then** each employee entry in the `employees[]` array includes a `sellingRatePaise` field alongside existing `costPerHourPaise`, `hours`, and `contributionPaise` — enabling Ledger Drawer to show per-member selling rate.

5. **Given** the `EmployeeSnapshotData` interface in `snapshot.service.ts`,
   **When** this story is complete,
   **Then** the interface includes `sellingRatePaise: number | null` — already present as `billingRatePaise`. The breakdown builder includes it in the output JSON.

6. **Given** all API responses that return team member data,
   **When** the response includes a rate field,
   **Then** the field name remains `billingRatePaise` in the API contract (no breaking change), but all UI labels display "Selling Rate" instead of "Billing Rate".

7. **Given** the project detail page and team roster table,
   **When** the rate column renders,
   **Then** the column header displays "Selling Rate (₹/hr)" — not "Billing Rate".

8. **Given** `tm-selling-rate-validation.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover:
   - Multi-member T&M with different rates → correct aggregated revenue
   - Member with null selling rate → ₹0 revenue contribution + warning log
   - Zero-hour member → ₹0 contribution regardless of rate
   - Single-member project → revenue = hours × rate
   - Snapshot breakdown includes `sellingRatePaise` per employee
   - Non-T&M projects unaffected (Fixed Cost, AMC, Infra calculations unchanged)

## E2E Test Scenarios

### Positive

- E2E-P1: Upload timesheet for T&M project with 2 members at different selling rates → dashboard shows correct aggregated revenue matching `Σ(hours × member rate)` (AC: 1, 3)
- E2E-P2: Project dashboard shows T&M project with per-member revenue → Ledger Drawer (if available) displays per-member breakdown with selling rate (AC: 4)
- E2E-P3: Team roster on project detail shows "Selling Rate" column header, not "Billing Rate" (AC: 7)

### Negative

- E2E-N1: T&M project with member having null selling rate → project still calculates (₹0 revenue from that member), no crash, dashboard displays result (AC: 2)
- E2E-N2: Non-T&M project (Fixed Cost) recalculation → revenue uses contract value, NOT member selling rates — regression guard (AC: 8)

## Tasks / Subtasks

- [ ] Task 1: Validate existing T&M calculation path (AC: 1)
  - [ ] 1.1 Review `upload.service.ts` T&M case — confirm `revenue += hours × billingRatePaise` per member
  - [ ] 1.2 Document the existing flow in this story's Dev Agent Record for traceability

- [ ] Task 2: Null selling rate handling (AC: 2)
  - [ ] 2.1 In `upload.service.ts` T&M case, ensure `billingRatePaise ?? 0` handles null gracefully
  - [ ] 2.2 Add `logger.warn()` when a T&M member has null billingRatePaise — include projectId and employeeId
  - [ ] 2.3 Ensure no exception is thrown — calculation continues with ₹0 for that member

- [ ] Task 3: Snapshot breakdown enrichment (AC: 4, 5)
  - [ ] 3.1 Update `buildProjectBreakdownJson` in `snapshot.service.ts` — include `sellingRatePaise` in each employee entry for T&M breakdowns
  - [ ] 3.2 Update `BreakdownEmployee` interface to include `sellingRatePaise?: number`
  - [ ] 3.3 For non-T&M models, `sellingRatePaise` is omitted from breakdown (not applicable)

- [ ] Task 4: UI label rename (AC: 6, 7)
  - [ ] 4.1 `ProjectDetail.tsx` — team roster table: column header "Billing Rate" → "Selling Rate (₹/hr)"
  - [ ] 4.2 `AddTeamMemberModal.tsx` / `TeamMemberRow.tsx` — form label: "Billing Rate" → "Selling Rate"
  - [ ] 4.3 Any tooltip or placeholder text referencing "billing rate" → "selling rate"
  - [ ] 4.4 No API field rename — `billingRatePaise` remains the field name in code

- [ ] Task 5: Comprehensive tests (AC: 8)
  - [ ] 5.1 Create `services/calculation-engine/tm-selling-rate-validation.test.ts`
  - [ ] 5.2 Test: multi-member different rates → correct aggregate revenue
  - [ ] 5.3 Test: null selling rate → ₹0 contribution + warning logged
  - [ ] 5.4 Test: zero-hour member → ₹0 regardless of rate
  - [ ] 5.5 Test: single-member simple calculation
  - [ ] 5.6 Test: snapshot breakdown includes sellingRatePaise
  - [ ] 5.7 Test: Fixed Cost, AMC, Infrastructure calculations unchanged (regression)
  - [ ] 5.8 Update `snapshot.service.test.ts` — breakdown JSON shape for T&M includes sellingRatePaise

- [ ] Task 6: E2E Tests (E2E-P1 through E2E-N2)
  - [ ] 6.1 Create `packages/e2e/tests/tm-selling-rate.spec.ts`
  - [ ] 6.2 Seed: T&M project with 2 members at different billingRatePaise, timesheet data
  - [ ] 6.3 Implement E2E-P1 through E2E-P3
  - [ ] 6.4 Implement E2E-N1 and E2E-N2

## Dev Notes

### Architecture Constraints (MUST follow)

1. **No breaking API changes**: The field name `billingRatePaise` stays in the API contract and Prisma schema. "Selling rate" is a UI label change only. This avoids a breaking migration or API versioning.
2. **Pure function calculator unchanged**: `tm.calculator.ts` takes `TmInput { billedHours, billingRatePaise, employeeCosts }`. The actual per-member aggregation happens in `upload.service.ts` BEFORE calling the pure calculator. The calculator itself is NOT modified.
3. **Snapshot enrichment is additive**: Adding `sellingRatePaise` to the breakdown JSON is additive — existing snapshots without this field still work. The Ledger Drawer should handle missing `sellingRatePaise` gracefully (display "—" or omit).
4. **Paise everywhere**: All rate values in paise. ₹2,500/hr = `250000` paise. No floating-point rupee values in calculations.
5. **Warning, not error**: Null selling rate on a T&M member is a data quality issue, not a system error. Log a warning and continue — the project might be partially set up and the DM hasn't entered rates yet.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| T&M calc in upload service | `services/upload.service.ts` (lines ~453-463) | Already does per-member `hours × billingRatePaise` |
| TM calculator (pure) | `services/calculation-engine/tm.calculator.ts` | NOT modified — aggregation is upstream |
| Snapshot service | `services/snapshot.service.ts` | Modify `buildProjectBreakdownJson` and `BreakdownEmployee` |
| EmployeeSnapshotData | `services/snapshot.service.ts` (line ~11) | Already has `billingRatePaise` field |
| formatCurrency | `shared/utils/currency.ts` | For UI label formatting |
| ProjectDetail.tsx | `pages/projects/ProjectDetail.tsx` | UI label rename |

### Project Structure Notes

New files:
```
packages/backend/src/services/calculation-engine/
└── tm-selling-rate-validation.test.ts

packages/e2e/tests/
└── tm-selling-rate.spec.ts
```

Modified files:
```
packages/backend/src/services/upload.service.ts (null rate warning)
packages/backend/src/services/snapshot.service.ts (breakdown enrichment)
packages/backend/src/services/snapshot.service.test.ts (breakdown shape)
packages/frontend/src/pages/projects/ProjectDetail.tsx (column header rename)
packages/frontend/src/components/AddTeamMemberModal.tsx (label rename)
packages/frontend/src/components/TeamMemberRow.tsx (label rename, from 8.3)
```

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR54]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Calculation Engine, Snapshot Strategy]

### Previous Story Intelligence

- **From 4.2:** `TmInput.billingRatePaise` is the project-level flat rate. But `upload.service.ts` ALREADY uses per-member `ep.billingRatePaise` for T&M revenue. The pure calculator's `billingRatePaise` is effectively unused in the upload flow for per-member calculation — revenue is calculated inline before calling the calculator.
- **From 4.5:** Snapshot persistence writes `BreakdownEmployee` objects. Adding `sellingRatePaise` is a one-line addition to the map function.
- **From 5.2:** The recalculation trigger in upload service is the entry point. After timesheet upload, `recalculate()` iterates active projects and calls the appropriate calculator.
- **From 8.1:** `billingRatePaise` column remains on `employee_projects`. No rename. Story 8.3 ensures the UI collects this value during assignment.

### Gotchas & Go/No-Go

- **CRITICAL**: Verify that the pure `calculateTm` function is NOT called for per-member aggregation in upload.service.ts. The upload service does the aggregation inline. If the pure function IS called with a single flat rate, that's a bug to fix here.
- **Regression risk**: Ensure Fixed Cost, AMC, and Infrastructure calculations are completely unaffected. Add explicit regression tests.
- **Existing snapshots**: Old snapshots won't have `sellingRatePaise` in their breakdown. The Ledger Drawer (Story 6.4) must handle this gracefully — show the field only if present.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

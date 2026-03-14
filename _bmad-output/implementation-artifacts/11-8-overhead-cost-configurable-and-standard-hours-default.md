# Story 11.8: Overhead Cost Configurable + Standard Hours Default

Status: backlog

## Story

As an Admin,
I want the annual overhead cost per employee (₹180,000/year) to be configurable in System Config and the standard monthly working hours default corrected to 160,
so that cost calculations use the correct formula per the brief and the overhead can be adjusted as business conditions change.

## Primary Persona

Rajesh (Admin) — Rajesh is responsible for system configuration. The overhead cost should be configurable from the System Config page, and the default hours should match the agreed specification (160, not 176).

## Persona Co-Authorship Review

### Rajesh (Admin) — PASS
> "The overhead cost should be configurable in System Config, and the default hours should match what we agreed on. Right now the system uses 176 hours but the brief says 160. And there's no way to set the overhead amount — it should be a field I can change when rent or utility costs change. The formula should be: (Annual CTC + Overhead) / 12 / Standard Monthly Hours."

### Priya (Finance) — PASS
> "The cost rate calculation is fundamental to everything — margins, profitability, burn rates. If the overhead is hardcoded or missing, every number downstream is wrong. Making it configurable and getting the default hours right is critical for accurate financial reporting."

### Neha (HR) — ADVISORY
> "When overhead changes (e.g., office expansion, new facilities), it should be easy to update without touching code. And the hours impact utilization calculations for all employees."

## Acceptance Criteria (AC)

1. **Given** the `system_config` table,
   **When** the schema is updated,
   **Then** a new field `annualOverheadPerEmployee` exists with a default value of 18000000 (paise = ₹180,000).

2. **Given** the System Config UI page,
   **When** it renders,
   **Then** the `annualOverheadPerEmployee` field is visible and editable, displayed in rupees (₹180,000) with an explanation: "Annual overhead per employee added to CTC for cost calculations (rent, utilities, etc.)."

3. **Given** the cost rate calculator,
   **When** it computes employee cost per hour,
   **Then** the formula is: `(Annual CTC + annualOverheadPerEmployee) / 12 / standardMonthlyHours` — using the configurable values from `system_config`.

4. **Given** the `standardMonthlyHours` field in `system_config`,
   **When** the system is seeded or migrated,
   **Then** the default value is changed from 176 to 160 per the original brief specification.

5. **Given** an Admin updates `annualOverheadPerEmployee` in System Config,
   **When** the next calculation cycle runs (timesheet/billing upload triggers recalculation),
   **Then** all employee cost rates are recalculated using the new overhead value.

6. **Given** `PUT /api/v1/system-config`,
   **When** called with `annualOverheadPerEmployee` field,
   **Then** the value is validated (must be >= 0, must be a valid BigInt in paise) and persisted.

7. **Given** a non-Admin user,
   **When** they try to update `annualOverheadPerEmployee`,
   **Then** they receive HTTP 403 (only Admin can modify system config).

8. **Given** `overhead-config.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: schema migration adds field with default, cost rate formula uses overhead + CTC, standardMonthlyHours default is 160, validation rejects negative values, RBAC Admin-only.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This story touches the cost calculation foundation — every number in the system flows from the cost rate formula. Priority one: the overhead field exists in System Config and is editable by Admin. Priority two: the default standard hours is 160, not 176. Priority three: after updating overhead, the next calculation cycle uses the new value. I'm treating this as a high-risk change because it cascades to margins, profitability ranks, burn rates — everything. Test the formula end-to-end, not just the config UI.

### Persona Test Consultation

**Rajesh (Admin):** "Quinn, this needs to just work. I go to System Config, I see the overhead field, I change it, I save, done. Don't make me convert paise to rupees in my head — show me ₹180,000 not 18000000. And when I save, confirm it actually saved — a success toast and the value persisting on page reload. Also, what happens if I accidentally set it to zero? The system should warn me, not silently make all employee costs drop."

**Quinn's response:** "Display in rupees, save in paise — I'll test the conversion both ways. Zero overhead is technically valid (company with no office) but I'll test that it's allowed with the understanding that costs will drop. Negative overhead gets rejected. And yes — page reload persistence is in the test plan."

**Priya (Finance):** "This is the most critical config change you can make. If overhead goes from ₹180,000 to ₹200,000, every employee's cost rate increases, which means margins drop across the board. I need to understand the downstream impact. Can we test that after an overhead change and a recalculation, an employee's cost rate actually changes by the expected amount? Not just that the config saved, but that the math is right end-to-end."

**Quinn's response:** "End-to-end formula validation is the key test. I'll seed an employee with known CTC, set overhead to a known value, trigger a calculation, and verify the cost rate matches the formula exactly: (CTC + Overhead) / 12 / StandardHours. Then change overhead, recalculate, and verify it changes by the right amount."

**Neha (HR):** "The standard hours change from 176 to 160 affects utilization calculations. If someone works 160 hours in a month, they should be at 100% utilization, not 91%. Test that the utilization percentage is correct after the hours default change."

**Quinn's response:** "Great point, Neha. I'll verify that with standardMonthlyHours = 160, an employee logging 160 hours shows 100% utilization, not the 91% they'd get with the old 176-hour denominator."

### Persona Journey Test Files
```
tests/journeys/
  rajesh-configure-overhead-cost.spec.ts
  rajesh-update-standard-working-hours.spec.ts
  priya-verify-cost-rate-after-overhead-change.spec.ts
  neha-verify-utilization-after-hours-change.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Rajesh logs in → System Config → sees "Annual Overhead Per Employee" field showing ₹180,000 (AC: 2)
- E2E-P2: Rajesh updates overhead to ₹200,000 → saves → value persists on page reload (AC: 2, 6)
- E2E-P3: System Config shows standardMonthlyHours = 160 (AC: 4)
- E2E-P4: After overhead update, employee cost rate recalculation uses new overhead value (AC: 5)
- E2E-P5: Rajesh updates standardMonthlyHours → cost calculations reflect the change (AC: 3)

### Negative

- E2E-N1: Finance user tries to edit overhead → field is read-only or save returns 403 (AC: 7)
- E2E-N2: Rajesh enters negative overhead value → validation error shown (AC: 6)
- E2E-N3: Rajesh enters non-numeric overhead value → validation error shown (AC: 6)

## Tasks / Subtasks

- [ ] Task 1: Schema migration (AC: 1, 4)
  - [ ] 1.1 Add `annualOverheadPerEmployee` column to `system_config` table (BigInt, default 18000000)
  - [ ] 1.2 Create Prisma migration
  - [ ] 1.3 Update `standardMonthlyHours` default from 176 to 160 in seed data
  - [ ] 1.4 Update Prisma schema

- [ ] Task 2: System Config API update (AC: 6, 7)
  - [ ] 2.1 Update `PUT /api/v1/system-config` to accept `annualOverheadPerEmployee`
  - [ ] 2.2 Validation: must be >= 0, valid BigInt
  - [ ] 2.3 RBAC: Admin only (already enforced)

- [ ] Task 3: System Config UI update (AC: 2)
  - [ ] 3.1 Add "Annual Overhead Per Employee" field to System Config page
  - [ ] 3.2 Display in rupees (convert from paise for display, back to paise on save)
  - [ ] 3.3 Add helper text: "Annual overhead per employee added to CTC for cost calculations (rent, utilities, etc.)"
  - [ ] 3.4 Input validation: non-negative number

- [ ] Task 4: Update cost rate calculator (AC: 3, 5)
  - [ ] 4.1 Modify cost rate calculation in `calculation-engine/` to fetch `annualOverheadPerEmployee` from system config
  - [ ] 4.2 Formula: `(annualCtcPaise + annualOverheadPerEmployee) / 12 / standardMonthlyHours`
  - [ ] 4.3 Ensure recalculation is triggered when config changes (via next upload cycle)

- [ ] Task 5: Update seed data
  - [ ] 5.1 Update `seed.ts` to set `standardMonthlyHours = 160`
  - [ ] 5.2 Add `annualOverheadPerEmployee = 18000000` to seed

- [ ] Task 6: Backend tests (AC: 8)
  - [ ] 6.1 Test: cost rate formula includes overhead
  - [ ] 6.2 Test: default overhead is 18000000 (₹180,000 in paise)
  - [ ] 6.3 Test: default standardMonthlyHours is 160
  - [ ] 6.4 Test: validation rejects negative overhead
  - [ ] 6.5 Test: RBAC — non-Admin gets 403

- [ ] Task 7: Frontend tests
  - [ ] 7.1 Test: overhead field renders on System Config page
  - [ ] 7.2 Test: displays in rupees (₹180,000 not 18000000 paise)
  - [ ] 7.3 Test: validation prevents negative input

- [ ] Task 8: E2E tests (E2E-P1 through E2E-N3)
  - [ ] 8.1 Extend `packages/e2e/tests/system-config.spec.ts`
  - [ ] 8.2 Implement E2E-P1 through E2E-P5
  - [ ] 8.3 Implement E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Currency in paise**: `annualOverheadPerEmployee` is stored as BigInt in paise (18000000 = ₹180,000). Frontend converts for display using `formatCurrency()`.
2. **Cost rate formula per brief**: `Employee Cost Per Hour = (Actual CTC + 180,000 overhead) / 12 / Standard Working Hours`. The overhead and hours are now both configurable.
3. **Recalculation is NOT real-time**: Changing the overhead or hours does NOT trigger an immediate recalculation of all snapshots. The new values are used on the NEXT calculation cycle (triggered by timesheet/billing upload). This is by design — snapshots are point-in-time.
4. **Backward compatibility**: Existing snapshots are not retroactively updated. Only new calculations use the updated config values.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| System Config page | `packages/frontend/src/pages/SystemConfig.tsx` (or similar) | Story 1.5 — extend with overhead field |
| System Config API | `packages/backend/src/routes/system-config.routes.ts` | Story 1.5 — extend |
| Cost rate calculator | `packages/backend/src/services/calculation-engine/` | Story 4.1 — modify to use overhead |
| Prisma schema | `packages/backend/prisma/schema.prisma` | Add field |
| seed.ts | `packages/backend/prisma/seed.ts` | Update defaults |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |

### Gotchas

- **Changing standardMonthlyHours default**: This is a DATA change, not just code. Existing system_config rows in production may have 176. The migration should update existing rows to 160 ONLY if the value is still 176 (i.e., unchanged from original default). If an admin has already customized it, don't overwrite.
- **Test data impact**: Changing the default hours from 176 to 160 will affect cost calculations in existing tests. All calculation tests that use the default hours value will need updating.
- **Overhead not previously in formula**: If the cost rate calculator currently does NOT include overhead, adding it will increase all employee cost rates by approximately ₹93.75/hour (180,000 / 12 / 160). This will cascade to margins, profitability ranks, and all downstream metrics. Ensure this is communicated as a known impact.

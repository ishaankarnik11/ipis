# Story 9.5: Fix Billable Utilisation Calculation

Status: done

## Story

As a Finance user or Admin,
I want the Executive Dashboard to display the correct billable utilisation percentage so that I can assess workforce efficiency and make informed resource allocation decisions.

## Primary Persona

Priya (Finance) — Priya relies on the billable utilisation metric to report workforce efficiency to the CFO. A 0.0% reading when the company has 10+ billable employees actively working is a data integrity issue that undermines dashboard credibility.

## Persona Co-Authorship Review

### Priya (Finance) — FAIL (blocking)
> "Billable Utilisation 0.0%? We have 10+ billable employees working across 3 months of timesheet data. Is the calculation broken? This is the single most important workforce metric for my monthly report. If it says 0%, nobody will trust any other number on this dashboard. The brief defines it clearly: Utilization % = Billable Hours / Total Available Hours."

### Rajesh (Admin) — FAIL (blocking)
> "I configured standard working hours to 176 hours/month. There are billable employees with timesheet data. The utilisation should NOT be zero. Either the calculation is broken or the data isn't being picked up. Either way, this makes the Executive Dashboard unreliable."

### Neha (HR) — ADVISORY
> "Utilisation is critical for me too. I need to identify overworked employees (>100% utilisation) and underutilised ones. If the company-level number is wrong, per-employee numbers are probably wrong too."

## Acceptance Criteria (AC)

1. **Given** the Executive Dashboard,
   **When** there are billable employees with timesheet data,
   **Then** the Billable Utilisation KPI tile shows a non-zero percentage calculated as: (Total Billable Hours / Total Available Hours) * 100, where Available Hours = Number of Billable Employees * Standard Working Hours per Month.

2. **Given** the utilisation calculation in the dashboard service,
   **When** the calculation runs,
   **Then** it correctly computes:
   - Numerator: SUM of billable hours from timesheet data for billable employees
   - Denominator: COUNT of billable employees * standard working hours (from system config, default 176)
   - Result: (numerator / denominator) * 100, rounded to 1 decimal place

3. **Given** a company with 10 billable employees, 176 standard hours/month, and 880 total billable hours uploaded,
   **When** the Executive Dashboard loads,
   **Then** Utilisation = (880 / (10 * 176)) * 100 = 50.0%.

4. **Given** no timesheet data has been uploaded,
   **When** the Executive Dashboard loads,
   **Then** Utilisation shows 0.0% (correct zero, not a calculation error).

5. **Given** the company-level utilisation snapshot is computed during recalculation,
   **When** the recalculation trigger runs (after upload or manual trigger),
   **Then** the utilisation snapshot value is updated in `calculation_snapshots` and reflected on the next dashboard load.

6. **Given** `utilisation-calculation.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: correct utilisation calculation with known inputs, zero timesheet data returns 0%, handles non-billable employees correctly (excluded from both numerator and denominator), handles missing system config gracefully (uses default 176 hours), snapshot is persisted during recalculation.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
0.0% utilisation when there's active data is a trust-killer. Three places can fail: recalculation doesn't compute it, dashboard service doesn't query it, or frontend reads the wrong field. I'll test from the outside in: verify the KPI tile shows a non-zero value after data upload. Then I'll add a known-input test to validate the math. Ship the fix, verify with real numbers.

### Persona Test Consultation

**Priya (Finance):** "Billable Utilisation 0.0%? We have 10+ billable employees working across 3 months of timesheet data. This is the single most important workforce metric for my monthly report. If it says 0%, nobody will trust any other number on this dashboard. Test it with real numbers: if I have 10 billable employees, 176 standard hours, and 880 billable hours uploaded, the tile better show 50.0%."

**Quinn's response:** "I'll use Priya's exact scenario as the test case: seed 10 billable employees, upload 880 hours of timesheet data, trigger recalculation, and assert the Executive Dashboard tile shows 50.0%. Not approximately 50 — exactly 50.0%. That's the trust test."

**Rajesh (Admin):** "I configured standard working hours to 176 hours/month. There are billable employees with timesheet data. The utilisation should NOT be zero. Either the calculation is broken or the data isn't being picked up. And if I change standard hours to 160, the percentage should update on the next recalculation."

**Quinn's response:** "I'll add a config change test: update standard hours from 176 to 160, trigger recalculation, verify utilisation percentage changes accordingly. This tests that the calculation reads from system config, not a hardcoded value."

**Neha (HR):** "Utilisation is critical for me too. I need to identify overworked employees (>100% utilisation) and underutilised ones. If the company-level number is wrong, per-employee numbers are probably wrong too."

**Quinn's response:** "Company-level is the priority for this story. Per-employee utilisation is a follow-up, but I'll flag it if the calculation logic shares the same bug."

### Persona Journey Test Files
```
tests/journeys/
  priya-verify-utilisation-after-timesheet-upload.spec.ts
  rajesh-change-standard-hours-verify-utilisation.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Admin uploads timesheet data for 5 billable employees → triggers recalculation → Executive Dashboard shows correct non-zero utilisation percentage (AC: 1, 2)
- E2E-P2: Priya views Executive Dashboard → Billable Utilisation tile shows value consistent with uploaded timesheet data (AC: 1)
- E2E-P3: Admin changes Standard Working Hours in system config → recalculation → utilisation percentage updates accordingly (AC: 2)

### Negative

- E2E-N1: No timesheet data uploaded → Executive Dashboard shows Billable Utilisation: 0.0% (AC: 4)
- E2E-N2: Only non-billable employees have timesheet data → Billable Utilisation: 0.0% (non-billable hours excluded from numerator) (AC: 2)

## Tasks / Subtasks

- [x] Task 1: Diagnose the utilisation calculation (AC: 1, 2)
  - [x] 1.1 Read the utilisation calculation in `dashboard.service.ts` — find where billable utilisation is computed
  - [x] 1.2 Check if the calculation queries timesheet data correctly (SUM of billable hours)
  - [x] 1.3 Check if the denominator uses the correct employee count (billable employees only) and standard hours
  - [x] 1.4 Check if the utilisation value is persisted in `calculation_snapshots` at the company level
  - [x] 1.5 Check if the frontend reads the correct field from the API response

- [x] Task 2: Fix the calculation (AC: 2, 3)
  - [x] 2.1 Fix the numerator: ensure SUM(billable_hours) from timesheet_entries is correct
  - [x] 2.2 Fix the denominator: COUNT of employees WHERE isBillable = true * standardWorkingHours from system_config
  - [x] 2.3 Handle edge cases: zero billable employees (return 0%), zero timesheets (return 0%)
  - [x] 2.4 Round to 1 decimal place

- [x] Task 3: Fix snapshot persistence (AC: 5)
  - [x] 3.1 Ensure the recalculation service creates/updates a company-level utilisation snapshot
  - [x] 3.2 Verify the snapshot field name matches what the dashboard API returns

- [x] Task 4: Fix frontend field mapping (AC: 1)
  - [x] 4.1 Verify the Executive Dashboard reads the correct field for utilisation from the API response
  - [x] 4.2 Ensure `formatPercent` is used for display
  - [x] 4.3 KPI tile should show "Billable Utilisation" with the percentage value

- [x] Task 5: Backend tests (AC: 6)
  - [x] 5.1 Test: 10 billable employees, 880 billable hours, 176 std hours → 50.0%
  - [x] 5.2 Test: 0 timesheet data → 0.0%
  - [x] 5.3 Test: only non-billable employees → 0.0%
  - [x] 5.4 Test: system config standard hours change → recalculated utilisation changes
  - [x] 5.5 Test: snapshot is persisted during recalculation

- [x] Task 6: E2E tests (E2E-P1 through E2E-N2)
  - [x] 6.1 Create or extend `packages/e2e/tests/utilisation-calculation.spec.ts`
  - [x] 6.2 Implement E2E-P1 through E2E-P3
  - [x] 6.3 Implement E2E-N1, E2E-N2

## Dev Notes

### Architecture Constraints

1. **Formula from the brief**: Utilization % = Billable Hours / Total Available Hours. Available Hours = Billable Employee Count * Standard Working Hours per Month. This is a company-wide metric.
2. **Standard Working Hours**: Read from `system_config` table (key: `standardWorkingHours`). Default is 176 (or 160 per the original brief — check what the seed data uses). Do NOT hardcode.
3. **Billable employees only**: Both numerator and denominator should only consider employees marked as `isBillable = true`. Non-billable employees' hours do not count toward utilisation.
4. **Snapshot-based, not real-time**: Utilisation is computed during recalculation (triggered by upload), stored in `calculation_snapshots`, and read by the dashboard API. The dashboard does NOT compute it on-the-fly.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Dashboard service | `packages/backend/src/services/dashboard.service.ts` | Story 6.1/6.2 — executive dashboard query |
| Recalculation service | `packages/backend/src/services/calculation.service.ts` | Story 4.5 — snapshot creation |
| System config | `packages/backend/src/services/config.service.ts` | Story 1.5 — standard working hours |
| ExecutiveDashboard UI | `packages/frontend/src/pages/dashboards/ExecutiveDashboard.tsx` | Story 6.2 — KPI tile rendering |
| formatPercent | `packages/frontend/src/utils/` | Percentage formatting |
| Timesheet model | Prisma schema | `timesheet_entries` table — billable_hours, non_billable_hours |
| Employee model | Prisma schema | `employees` table — is_billable field |

### Gotchas

- **Three possible failure points**: (1) The recalculation service doesn't compute utilisation, (2) the dashboard service doesn't query the utilisation snapshot, (3) the frontend reads the wrong field. Check all three.
- **BigInt division**: If billable hours and available hours are stored as BigInt, ensure division is done in a way that produces a float, not integer division (which would truncate to 0 for any value < 100%).
- **Monthly vs. cumulative**: Decide whether utilisation is for the latest month or cumulative across all months with data. The Executive Dashboard should likely show the latest month's utilisation. Clarify with the existing snapshot structure.
- **Backlog item B12**: This is a P1 bug — 0.0% utilisation when there's active data is a calculation/data integrity issue.

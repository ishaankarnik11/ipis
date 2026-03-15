# Story 13.2: Add `allocationPercent` to EmployeeProject

Status: ready-for-dev

## Story

As a Delivery Manager,
I need to specify what percentage of an employee's time is allocated to each project when adding them as a team member,
so that utilization calculations, cost allocations, and capacity planning reflect reality instead of assuming 100% on every project.

## Context

Currently the `EmployeeProject` junction table has no `allocationPercent` field. The system computes allocation at runtime as `1 / (number of projects)` — so an employee on 3 projects shows 33% on each. This is wrong. In reality, an engineer might be 80% on one project and 10% on two others. Every downstream financial number that depends on allocation is incorrect.

## Persona Co-Authorship

### Vikram (DM) — BLOCK
> "I have engineers split 80/20 across projects. The system shows 33% each across 3 projects. My burn rate projections are wrong, my cost allocation is wrong, and my utilization numbers are meaningless. I need to set the actual percentage when I assign someone."

### Priya (Finance) — CONCERNED
> "If allocation percentages are wrong, then per-project cost calculations are wrong, which means project profitability is wrong. This is a data integrity issue that affects every financial report we generate."

## Acceptance Criteria

1. **Given** the database schema,
   **When** migrations are applied,
   **Then** `EmployeeProject` has a new column `allocationPercent` (integer, 1-100, default 100).

2. **Given** the Add Team Member modal,
   **When** a user selects an employee and designation,
   **Then** an "Allocation %" input field is shown (number input, range 1-100, default 100).

3. **Given** an employee already assigned to other projects totaling 80% allocation,
   **When** a DM tries to assign them to another project at 30% (total would be 110%),
   **Then** the system shows a warning: "Total allocation across all projects would be 110%. Employee may be over-allocated." (warning, not blocking — some temporary over-allocation is acceptable).

4. **Given** the project detail team roster,
   **When** rendered,
   **Then** each team member's row shows their allocation percentage.

5. **Given** the `getTeamMembers()` service function,
   **When** called,
   **Then** it returns the real `allocationPercent` from the database (not the computed `1/project_count` value).

6. **Given** the Employee Detail page,
   **When** viewing an employee's project assignments,
   **Then** each project shows the allocation percentage from the database.

7. **Given** `pnpm test` runs,
   **Then** all tests pass. Backend tests verify the new field is persisted and returned. Frontend tests verify the input field appears and submits correctly.

## Technical Notes

### Schema Change
```prisma
model EmployeeProject {
  // ... existing fields
  allocationPercent Int @default(100) // 1-100
}
```

### API Changes
- `POST /api/v1/projects/:id/team` — accept optional `allocationPercent` (default 100)
- `GET /api/v1/projects/:id/team` — return `allocationPercent` from DB
- `PATCH /api/v1/projects/:id/team/:employeeId` — allow updating allocation %
- Remove the runtime `1/project_count` computation from `getTeamMembers()`

### Testing Requirements

**Backend Integration (Real DB):**
- Add team member with allocationPercent=60 → verify DB row has 60
- Get team members → verify allocationPercent returned (not computed)
- Add member to second project → verify both allocations independent
- Over-allocation warning: add at 120% total → verify warning metadata in response (not error)

**E2E Consequence Test:**
- As DM: add team member at 50% → navigate to Employee Detail → verify 50% shows on that employee's project list
- As DM: add same employee to two projects (60% + 40%) → verify both show correct percentages

**Frontend Test:**
- Modal renders allocation % input after employee is selected
- Default value is 100
- Validation: rejects 0, rejects 101, accepts 1-100

# Story 12.9: Team Allocation % and Internal Cost on Project Roster

Status: review

## Story

As a Delivery Manager viewing a project's team roster,
I want to see each team member's allocation percentage and internal cost rate alongside their selling rate,
so that I can assess resource utilization and cost efficiency per team member.

## Primary Persona

Vikram (DM) — needs to know how much of each person's time is allocated and what they cost.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P2 #12

## Persona Co-Authorship Review

### Vikram (DM) — CONCERNED
> "The Team Roster shows Name, Designation, Role, Selling Rate, Joined Date. That's half the picture. I need to know: what percentage of Sanjay's time is allocated to this project? Is he 50% here and 50% on another project? And what's his internal cost? The selling rate tells me what we charge the client, but the cost rate tells me our margin per person. Without allocation %, I can't plan resources. Without cost, I can't assess per-member profitability."

### Priya (Finance) — SUPPORTIVE
> "The cost rate is important for margin analysis. If I'm reconciling project profitability, I need to see: selling rate (revenue side) vs cost rate (expense side) per team member. Right now I only see selling rate."

### Neha (HR) — SUPPORTIVE
> "Allocation % is critical for me too. If an employee is 100% on one project and 50% on another, that's 150% — overallocated. I need to see this at the project level, not just the employee level."

### Quinn (QA) — ADVISORY
> "The `EmployeeProject` junction table should have an `allocationPercentage` field (or similar). Check the Prisma schema. The employee's cost rate comes from their CTC — `annualCtc / 12 / standardMonthlyHours` gives hourly cost. Display both in the Team Roster table. If `allocationPercentage` doesn't exist in the schema, it may need to be added."

## Acceptance Criteria (AC)

1. **Given** the Team Roster table on the Project Detail page,
   **When** it renders,
   **Then** each team member row shows: Name, Designation, Role, Allocation %, Selling Rate, Internal Cost Rate, Joined Date.

2. **Given** a team member's allocation percentage,
   **When** displayed,
   **Then** it shows as a percentage (e.g., "50%", "100%") with visual warning if >100% across all projects.

3. **Given** a team member's internal cost rate,
   **When** displayed,
   **Then** it shows as hourly or monthly currency rate (derived from CTC) — visible only to roles with financial access (Admin, Finance, DM).

4. **Given** the Project Detail API `GET /api/v1/projects/:id`,
   **When** it returns team member data,
   **Then** each member includes `allocationPercentage` and `costRate` (or equivalent) fields.

5. **Given** `pnpm test` runs,
   **When** tests complete,
   **Then** tests verify: allocation % and cost rate columns render in team roster, API includes new fields.

## Investigation Steps

- [ ] Check `EmployeeProject` model in Prisma schema — does `allocationPercentage` exist?
- [ ] Check if employee CTC is accessible from the project detail API response
- [ ] Determine cost rate formula: `annualCtc / 12` for monthly, or `annualCtc / (12 * standardHours)` for hourly

## Dev Notes

### Existing Code

| What | Path |
|---|---|
| Prisma schema | `packages/backend/prisma/schema.prisma` |
| Project service | `packages/backend/src/services/project.service.ts` |
| Project Detail page | `packages/frontend/src/pages/projects/ProjectDetail.tsx` (or similar) |
| Team Member Row | `packages/frontend/src/components/TeamMemberRow.tsx` |
| Project financial summary | `packages/frontend/src/components/ProjectFinancialSummary.tsx` |

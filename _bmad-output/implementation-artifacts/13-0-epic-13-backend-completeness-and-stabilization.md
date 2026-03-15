# Epic 13: Backend Completeness & Stabilization

## Goal

Complete all half-wired backend features, rename ProjectRole → Designation with department mapping, fix all UI issues surfaced in party-mode review session (2026-03-15), and overhaul testing to eliminate mock-driven false confidence. No feature ships without real integration tests.

## Source

Party Mode session 2026-03-15: ishaan reviewed the live application and identified 11 issues. Backend audit revealed 6 additional architectural gaps. Combined with testing philosophy reset: "I would rather not have a feature than have a false sense of security that feature is built."

## Exit Criteria

- All 5 persona agents complete full daily workflow journeys (not feature checklists) and report zero FAILs
- Every recalculation trigger (team change, config change, upload) produces updated dashboard numbers
- PDF export generates real PDFs verified by integration test
- Share link modal with copy button, snapshots correct entity, respects period
- Designation (formerly ProjectRole) has department association and full CRUD
- Department has full CRUD
- No mock-only features — every feature has at least one real integration test
- Persona journey E2E tests exist for Vikram, Priya, Rajesh daily workflows

## Testing Philosophy (Mandatory for All Stories)

This epic enforces a **three-layer testing standard** for every story:

### Layer 1: Backend Integration Tests (Real DB)
- All backend tests hit real PostgreSQL (existing pattern — maintain it)
- Puppeteer PDF test must invoke real Puppeteer, not mock
- Recalculation tests must verify snapshot values change after trigger events

### Layer 2: Consequence Assertions in E2E
- Every E2E test that performs an action must verify the downstream effect on a DIFFERENT screen
- Example: "add team member → navigate to dashboard → verify numbers changed"
- No test passes by only checking the screen where the action was performed

### Layer 3: Persona Journey Tests
- Each persona has a full daily/monthly workflow test
- Tests follow the user's actual workflow, not a feature checklist
- Screenshot assertions at key UI states (using Playwright `toHaveScreenshot()`)

### Anti-Patterns (Forbidden)
- Mocking Puppeteer in PDF tests
- Testing "button exists" without testing "button does what it should"
- Marking UAT pass without verifying cross-screen data consistency
- Frontend-only mocked tests counted as feature coverage

## Story Map

### Sprint A — Foundation (Schema + Core Wiring)

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 13.1 | Rename ProjectRole → Designation + schema migration | P0 | None — do first, touches everything |
| 13.2 | Add `allocationPercent` to EmployeeProject | P0 | None |
| 13.3 | Wire recalculation triggers (team change, config, timesheet) | P0 | None |
| 13.4 | Department full CRUD (create, update, soft-delete) | P0 | None |
| 13.5 | Designation CRUD improvements + department mapping | P0 | 13.1, 13.4 |

### Sprint B — Feature Fixes

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 13.6 | Fix share link — copy button modal + snapshot fix + period param | P1 | None |
| 13.7 | Fix PDF export — verify pipeline, fix UUID schema, integration test | P1 | None |
| 13.8 | Fix add team member modal layout (selling rate input shrinks) | P1 | 13.2 (allocation field added) |
| 13.9 | Pending approvals — show project details (expandable row / link) | P1 | None |
| 13.10 | Consolidate Projects page into Project Dashboard | P1 | None |

### Sprint C — UX Polish & Testing Overhaul

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 13.11 | Upload centre row click affordance | P2 | None |
| 13.12 | Config change → visible recalc feedback | P2 | 13.3 |
| 13.13 | Persona journey E2E tests (Vikram, Priya, Rajesh) | P0 | All Sprint A+B stories |
| 13.14 | PDF integration test (real Puppeteer, no mocks) | P1 | 13.7 |

## Relationship to Previous Epics

| Previous Work | Status | Issue | Epic 13 Story |
|---------------|--------|-------|---------------|
| Story 12.9 (team allocation %) | done | Computed at runtime, no DB field, no user input | 13.2 |
| Story 7.1 (PDF export) | done | Puppeteer mocked in tests, never verified real | 13.7, 13.14 |
| Story 7.2 (share links) | done | Snapshots all projects, ignores period | 13.6 |
| Story 8.1 (project role mgmt) | review | Named "ProjectRole", no dept mapping | 13.1, 13.5 |
| Story 3.2 (team roster) | done | No allocation %, no recalc trigger | 13.2, 13.3 |
| Epic 11 (11.8 overhead config) | review | Config saved but no recalc | 13.3 |

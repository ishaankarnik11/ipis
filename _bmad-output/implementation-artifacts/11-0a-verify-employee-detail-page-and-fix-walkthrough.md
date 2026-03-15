# Story 11.0a: Verify Employee Detail Page & Fix Walkthrough Script

Status: review

## Story

As Neha (HR),
I need to confirm the Employee Detail full-page view (Story 10.5) works when I click an employee's name so that I can see their complete profile, project allocations, and utilisation history.

## Primary Persona

Neha (HR) — "I click the name, I see everything about that employee — which projects they're on, how much time they're spending, their salary band. One page, one source of truth."

## Source

- UAT Report v3 (2026-03-15): BUG 1 — Employee Detail page not verified
- Walkthrough script clicked table row instead of employee name link
- Route exists at `/dashboards/employees/:id`, component `EmployeeDetail.tsx` exists

## Root Cause

The walkthrough script at `packages/e2e/persona-walkthroughs/walkthrough.ts` uses:
```typescript
const empRow = page.locator('table tbody tr').first();
await empRow.click();
```

This clicks the **table row**, which triggers row selection (showing Edit/Mark as Resigned buttons on hover). It does NOT click the **employee name `<a>` link**, which is what navigates to `/dashboards/employees/:id`.

The `EmployeeDetail` component exists and the route is registered in `router/index.tsx` (line 124), so this is almost certainly a script issue, not a product bug. However, the page has never been visually verified in UAT.

## Persona Co-Authorship Review

### Neha (HR) — VERIFY
> "I need to see the detail page with my own eyes. It should show: employee name, designation, department, salary info, and a list of every project they're allocated to with percentage time. The original Story 10.5 spec had all of this."

### Quinn (QA) — PASS
> "The route is wired, the component exists, the API endpoint exists. This is a walkthrough script fix + visual verification. Five minutes."

## Acceptance Criteria (AC)

1. **Given** Neha is on the Employees page,
   **When** she clicks an employee's name (the blue link),
   **Then** the browser navigates to `/dashboards/employees/:id` and the Employee Detail page renders.

2. **Given** the Employee Detail page for Amit Verma,
   **When** the page loads,
   **Then** it shows: employee name, designation, department, and project allocation table.

3. **Given** the walkthrough script runs for Neha,
   **When** the employee-detail flow executes,
   **Then** it clicks the employee name `<a>` link (not the table row) and captures a screenshot of the detail page.

4. **Given** `pnpm test` runs,
   **When** all suites complete,
   **Then** existing tests pass (no new tests needed — this is a verification + script fix).

## Tasks / Subtasks

### Task 1: Fix walkthrough script

- [x] 1.1: In `packages/e2e/persona-walkthroughs/walkthrough.ts`, find Neha's `employee-detail` flow
- [x] 1.2: Changed from `page.locator('table tbody tr').first().click()` to `page.locator('table tbody tr td a').first().click()` — clicks the name `<a>` link, not the row
- [x] 1.3: Added `waitForURL(/\/dashboards\/employees\//)` to confirm navigation to detail page

### Task 2: Run and verify

- [ ] 2.1: Run walkthrough script for Neha (requires running app)
- [ ] 2.2: Verify `neha--emp-detail--01-profile.png` shows the detail page (requires running app)
- [ ] 2.3: Verify `neha--emp-detail--02-allocations.png` shows project allocations table (requires running app)

### Task 3: If detail page has issues, fix them

- [x] 3.1: Verified route exists at `/dashboards/employees/:id` in `router/index.tsx`
- [x] 3.2: Verified `EmployeeDetail.tsx` component exists with Profile Card, Utilization Summary, Project Allocations, Monthly History (implemented in Story 10.5)

## Dev Notes

### Key Files

| File | Action |
|---|---|
| `packages/e2e/persona-walkthroughs/walkthrough.ts` | Fix — click name link not row |
| `packages/frontend/src/pages/dashboards/EmployeeDetail.tsx` | Verify — visually confirm renders |
| `packages/frontend/src/router/index.tsx:124` | Read — route already registered |
| `packages/frontend/src/services/dashboards.api.ts` | Read — API endpoint for employee detail |

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 579/579 passed (no changes)
- Frontend tests: 345/345 passed (no changes)

### Completion Notes List
- Fixed Neha's `employee-detail` walkthrough flow: changed `page.locator('table tbody tr').first().click()` to `page.locator('table tbody tr td a').first().click()` — now clicks the employee name `<a>` link which triggers navigation via `onClick={() => navigate(...)}`, rather than the table row which only triggers row selection.
- Added `waitForURL(/\/dashboards\/employees\//)` to confirm navigation completes before taking screenshots.
- Verified the `EmployeeDetail.tsx` component exists with all Story 10.5 features: Profile Card, Utilization Summary, Project Allocations, Monthly History.
- Visual verification deferred — requires running app + dev database.

### Change Log
- 2026-03-15: Story 11.0a implementation complete — walkthrough script fixed to click name link

### File List
- packages/e2e/persona-walkthroughs/walkthrough.ts (modified — fixed Neha employee-detail flow to click name link)

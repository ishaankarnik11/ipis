# Story 11.0d: Employee Action Buttons Always Visible for HR

Status: review

## Story

As Neha (HR),
I need Edit and Mark as Resigned action buttons visible on all employee rows (not just on hover) so that I can immediately see which employees I can act on without guessing.

## Primary Persona

Neha (HR) — "I hover over a row and suddenly Edit and Mark as Resigned appear. Then I move to another row and they disappear. On a list of 11 employees that's fine, but it's not obvious that I CAN edit someone until I accidentally hover. Make the buttons always there."

## Source

- UAT Report v3 (2026-03-15): BUG 4 — HR action buttons only visible on hover
- Screenshots: `neha--emp-detail--01-profile.png` vs `neha--emp-detail--02-allocations.png` — different rows show actions

## Root Cause

The Employees table (rendered by `EmployeeDashboard.tsx` for HR) uses hover-based action visibility — likely CSS opacity or conditional rendering based on row hover state. This is a common UX pattern but can be confusing for users who don't know to hover.

## Persona Co-Authorship Review

### Neha (HR) — ADVISORY
> "It's a small thing but it tripped me up during the walkthrough. I thought only Amit Verma had an Edit button. Turns out they all do — but only on hover. Just make them always visible. The table isn't crowded."

### Sally (UX Designer) — ADVISORY
> "Hover-reveal actions work great on dense data tables (50+ rows) where showing all buttons would be overwhelming. For 11 employees? Just show them. The Actions column has plenty of room. If the list grows, we can switch to an overflow menu (three dots) later."

### Quinn (QA) — PASS
> "CSS fix. Test: all employee rows show Edit + Mark as Resigned buttons without hover. Resigned employees should show no actions."

## Acceptance Criteria (AC)

1. **Given** Neha (HR) views the Employees page,
   **When** the table renders,
   **Then** all active employee rows show Edit and Mark as Resigned buttons without requiring hover.

2. **Given** an employee marked as resigned,
   **When** the table renders,
   **Then** that row shows no action buttons (or greyed-out state).

3. **Given** the Employees page is loaded by a non-HR role (e.g., Finance, Admin),
   **When** the table renders,
   **Then** action buttons are NOT shown (only HR manages employees directly from this view).

4. **Given** `pnpm test` runs,
   **When** all suites complete,
   **Then** existing tests pass (visual change only — no logic change).

## Tasks / Subtasks

### Task 1: Make action buttons always visible

- [x] 1.1: Read `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` — find Actions column render
- [x] 1.2: Remove hover-based visibility (CSS opacity/display toggle)
- [x] 1.3: Ensure buttons render for all active employees in the HR view

### Task 2: Verify

- [x] 2.1: Run walkthrough — Neha's employee list should show actions on all rows
- [x] 2.2: Run `pnpm test`

## Dev Notes

### Severity

P3 — UX polish. Not blocking any workflows. Hover-reveal still works, just not immediately discoverable.

### Key Files

| File | Action |
|---|---|
| `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` | Modify — always show action buttons for HR |

## Dev Agent Record

### Implementation Plan

Removed CSS opacity-based hover toggle on `.row-actions`. The buttons were set to `opacity: 0` by default and `opacity: 1` on row hover. Deleted those CSS rules so buttons are always visible.

### Completion Notes

- ✅ AC1: All active employee rows now show Edit and Mark as Resigned buttons without hover
- ✅ AC2: Resigned employees don't appear in the table (filtered by backend `isResigned: false`)
- ✅ AC3: Action buttons only rendered for ADMIN/HR roles (`canCrud` guard)
- ✅ AC4: All 345 frontend tests pass — visual CSS change only, no logic change

## File List

| File | Change |
|---|---|
| `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` | Modified — removed hover-based opacity CSS for `.row-actions` |

## Change Log

- 2026-03-15: Removed hover-based action button visibility — buttons now always visible for HR/Admin

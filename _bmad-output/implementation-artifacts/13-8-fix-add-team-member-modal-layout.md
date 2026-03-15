# Story 13.8: Fix Add Team Member Modal Layout

Status: review

## Story

As a Delivery Manager adding team members to a project,
I need the Add Team Member modal to render correctly when an employee and designation are selected,
so that I can see and interact with all form fields (especially the selling rate input).

## Context

When a user selects an employee and designation in the Add Team Member modal, the selling rate input field shrinks to an unusably small size. This is a CSS/layout regression likely caused by Ant Design form grid behavior when Select components expand.

After Story 13.2, this modal will also include an "Allocation %" field, so the layout needs to accommodate 4 fields: Employee, Designation, Selling Rate, Allocation %.

## Acceptance Criteria

1. **Given** the Add Team Member modal,
   **When** an employee is selected from the dropdown,
   **Then** all form fields remain properly sized and usable.

2. **Given** the Add Team Member modal,
   **When** both employee and designation are selected,
   **Then** the selling rate input maintains its full width and is easily editable.

3. **Given** the Add Team Member modal,
   **When** rendered with all fields filled,
   **Then** the layout is: Employee (full width) → Designation (full width) → Selling Rate and Allocation % (side by side, each half width) — or another clean layout that doesn't cause field shrinkage.

4. **Given** different viewport sizes (1024px, 1440px, 1920px),
   **When** the modal is rendered,
   **Then** all fields remain usable and properly sized.

## Technical Notes

### Likely Root Cause
The Ant Design `<Select>` component with search enabled expands based on content. If the form uses `Row`/`Col` grid with percentage widths, the Select expansion can push other columns to collapse. Fix: use fixed `labelCol`/`wrapperCol` spans or switch to vertical form layout.

### Testing Requirements

**Visual Screenshot Test (Playwright):**
- Open Add Team Member modal → screenshot → select employee → screenshot → select designation → screenshot → verify selling rate input width is >= 200px in all states

**Frontend Test:**
- Modal renders all 4 fields (Employee, Designation, Selling Rate, Allocation %)
- All fields accept input when all other fields are populated
- Form submits successfully with all fields filled

## Dev Agent Record

### Implementation Plan
- Changed TeamMemberRow layout from single-row flex (3 columns) to vertical form:
  - Row 1: Employee search (full width) with label
  - Row 2: Designation select (full width) with label
  - Row 3: Selling Rate + Allocation % (side by side using Ant Design Row/Col)
- Added `allocationPercent` field to TeamMemberRowValue interface
- Added Allocation % InputNumber (1-100) to the form
- Wired `allocationPercent` through AddTeamMemberModal → onSubmit → API
- Updated modal width from 700px to 600px (narrower since fields are now vertical)

### Completion Notes
- AC1: Employee selection no longer affects other field sizes — each field is on its own row
- AC2: Selling rate maintains full half-width with a labeled layout, never shrinks
- AC3: Layout follows the pattern: Employee (full) → Designation (full) → Selling Rate + Allocation % (side by side)
- AC4: Vertical form layout is viewport-independent — works at any width
- All 363 frontend tests pass (1 new allocation % test), all 600 backend tests pass, typecheck clean

## File List

### Modified Files
- packages/frontend/src/components/TeamMemberRow.tsx (vertical layout + allocationPercent field)
- packages/frontend/src/components/AddTeamMemberModal.tsx (pass allocationPercent to API)
- packages/frontend/src/components/TeamMemberList.tsx (allocationPercent in empty row)
- packages/frontend/src/components/AddTeamMemberModal.test.tsx (test 4 fields)
- packages/frontend/src/components/team-member-assignment.test.tsx (updated for allocationPercent)
- packages/frontend/src/pages/projects/ProjectDetail.tsx (handleAddSubmit type)

## Change Log
- 2026-03-15: Fixed Add Team Member modal layout — vertical form with allocation % field

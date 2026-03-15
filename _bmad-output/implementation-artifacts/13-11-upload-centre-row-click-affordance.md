# Story 13.11: Upload Centre Row Click Affordance

Status: review

## Story

As a Finance or HR user viewing upload history,
I need clear visual indication that upload history rows are clickable (to view record details),
so that I can discover and use the drill-down feature intuitively.

## Context

The upload detail drawer (`UploadDetailDrawer.tsx`) and backend endpoint (`GET /api/v1/uploads/:id/records`) are fully implemented. But users don't know rows are clickable because there's no visual affordance — no hover state, no cursor change, no expand icon.

## Acceptance Criteria

1. **Given** the upload history table,
   **When** I hover over a row,
   **Then** the row shows a hover background color AND the cursor changes to `pointer`.

2. **Given** a row in the upload history table,
   **Then** either an expand icon (chevron) is visible on the left OR a "View Details" link/button is visible on the right.

3. **Given** I click on a row,
   **When** the upload detail drawer opens,
   **Then** it shows the records for that upload event (timesheet entries, billing records, or salary processing results).

## Technical Notes

### CSS Changes
```css
.ant-table-row { cursor: pointer; }
.ant-table-row:hover { background-color: #fafafa; }
```
Or use Ant Design's `onRow` prop with `onClick` handler + `style: { cursor: 'pointer' }`.

### Testing Requirements

**E2E Test:**
- Navigate to Upload Centre → verify rows have cursor:pointer → click a row → verify drawer opens with record data

**Frontend Test:**
- Table rows have onClick handler
- Clicking row opens UploadDetailDrawer with correct uploadEventId

## Dev Agent Record

### Implementation Plan
- Added hover background color (`#e6f4ff`) via scoped CSS on table class
- Added "View" action column with EyeOutlined icon as visual indicator (AC2)
- Row click handler and cursor:pointer were already implemented — preserved

### Completion Notes
- AC1: Hover shows blue highlight background + pointer cursor
- AC2: "View" button with eye icon visible on every row
- AC3: Row click opens UploadDetailDrawer (was already wired)
- All 366 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/frontend/src/components/UploadHistoryLog.tsx (hover style, View column)

## Change Log
- 2026-03-15: Added upload history row hover highlight and View button affordance

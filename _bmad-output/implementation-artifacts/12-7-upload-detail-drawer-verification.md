# Story 12.7: Upload Detail Drawer — Click-Through Verification and Fix

Status: review

## Story

As a Finance or HR user viewing Upload History,
I want to click an upload row and see the detail drawer with all records, filters, and download capability,
so that I can investigate what was uploaded, identify failures, and re-upload corrected data.

## Primary Persona

Priya (Finance) + Neha (HR) — both need upload investigation capability.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P1 #7
Previous attempt: Story 11-1 (review status, code was written but drawer did not open during browser UAT)

## Persona Co-Authorship Review

### Priya (Finance) — BLOCK
> "Story 11-1 says the upload detail drawer was implemented — tasks are all checked off. But during browser UAT, I clicked on upload history rows and NOTHING happened. No drawer opened. The code may exist but it's not wired up correctly in the live app. I need to verify this end-to-end: click a row → drawer opens → I see records → I can filter → I can download failures."

### Neha (HR) — BLOCK
> "Same experience. The upload history table shows my salary uploads with 'PARTIAL' status, but clicking the row does nothing. I need to see which employees failed and why. If the drawer was built but the click handler isn't firing, that's a wiring issue."

### Rajesh (Admin) — ADVISORY
> "When users come to me saying their upload didn't work, I need to be able to click into it and see what happened. The drawer needs to work for Admin too."

### Quinn (QA) — ADVISORY
> "Story 11-1 implementation notes say the `onRow` click handler was added to `UploadHistoryLog.tsx`. But the browser UAT couldn't trigger it. Possible causes: (1) The antd Table `onRow` prop may need a specific event handler structure. (2) The click handler may be swallowed by another element in the row. (3) The `UploadDetailDrawer` component may not be rendered in the component tree. Verify: Is the drawer component mounted? Is the click handler firing? Is the state updating to open the drawer?"

## Acceptance Criteria (AC)

1. **Given** the Upload History table in Upload Center,
   **When** a user clicks on any upload event row,
   **Then** the Upload Detail Drawer opens showing records from that upload.

2. **Given** the Upload Detail Drawer is open,
   **When** the user sees the records table,
   **Then** it shows Row #, Status (Success/Failed tag), and data columns relevant to the upload type.

3. **Given** the Upload Detail Drawer,
   **When** the user selects the "Failed" filter,
   **Then** only failed rows are shown with an "Error Reason" column.

4. **Given** the Upload Detail Drawer with "Failed" filter active,
   **When** the user clicks "Download",
   **Then** an .xlsx file downloads with failed rows and Error Reason column.

5. **Given** the Upload History table,
   **When** hovering over a row,
   **Then** the cursor changes to `pointer` indicating clickability.

6. **Given** `pnpm test` runs,
   **When** tests complete,
   **Then** tests verify: row click opens drawer, drawer renders records, filter works, download triggers.

## Investigation Steps

- [ ] Check if `UploadDetailDrawer` is rendered in `UploadCenter.tsx` component tree
- [ ] Check if `UploadHistoryLog.tsx` has `onRow` click handler properly configured
- [ ] Check if antd Table `onRow` returns the correct event handler object: `{ onClick: () => {...} }`
- [ ] Check browser console for errors when clicking upload rows
- [ ] Manually test in browser (not automation) to isolate if it's a real bug or automation issue

## Dev Notes

### Story 11-1 Implementation (Reference)

Story 11-1 claimed full implementation with these changes:
- `UploadDetailDrawer.tsx` — created (drawer component)
- `UploadHistoryLog.tsx` — modified (added onRow click handler)
- `uploads.api.ts` — modified (added records API functions)
- Backend routes — added `/:id/records` and `/:id/records/download`

The code exists but the click-through doesn't work in the live app. This story is about **verifying and fixing the wiring**, not reimplementing.

### Existing Code

| What | Path |
|---|---|
| Upload Center | `packages/frontend/src/pages/upload/UploadCenter.tsx` |
| Upload History Log | `packages/frontend/src/components/UploadHistoryLog.tsx` |
| Upload Detail Drawer | `packages/frontend/src/components/UploadDetailDrawer.tsx` |
| Upload API | `packages/frontend/src/services/uploads.api.ts` |
| Upload routes | `packages/backend/src/routes/uploads.routes.ts` |
| Upload service | `packages/backend/src/services/upload.service.ts` |

# Story 12.8: Upload History "My Uploads" Filter

Status: review

## Story

As a Delivery Manager or any user who uploads data,
I want to filter upload history to show only my uploads,
so that I can quickly find and verify my own submissions without scrolling through everyone else's uploads.

## Primary Persona

Vikram (DM) — uploads timesheets and needs to find his own uploads quickly.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P2 #11

## Persona Co-Authorship Review

### Vikram (DM) — CONCERNED
> "Upload History shows 3 entries — all by 'Priya Sharma.' Where are my timesheet uploads? Oh wait, I haven't uploaded yet in this seed data. But when I do upload, I'll see Priya's billing uploads mixed in with my timesheets. I need a 'My Uploads' toggle or filter so I only see what I uploaded. Between meetings, I don't have time to scan through everyone else's data."

### Priya (Finance) — SUPPORTIVE
> "I agree — when the upload history grows, I'll want to filter to just my billing/revenue uploads. Right now with only 6 entries it's manageable, but in production we'll have hundreds. A filter by uploader would be very useful."

### Neha (HR) — SUPPORTIVE
> "Same — I only upload salary data once a year or with revisions. I don't need to see everyone else's uploads cluttering my view. A 'My Uploads' default with an 'All Uploads' option would be ideal."

### Quinn (QA) — ADVISORY
> "Simple implementation: add a toggle/segmented control ('My Uploads' / 'All Uploads') above the upload history table. Default to 'My Uploads.' Backend: add `uploadedById` query param to the uploads list API. Admin sees all by default."

## Acceptance Criteria (AC)

1. **Given** the Upload History section in Upload Center,
   **When** it renders for a non-Admin user,
   **Then** it defaults to showing "My Uploads" (filtered to current user's uploads).

2. **Given** the Upload History section,
   **When** the user toggles to "All Uploads",
   **Then** it shows all upload events across all users.

3. **Given** the Upload History section for an Admin user,
   **When** it renders,
   **Then** it defaults to "All Uploads" (Admin typically investigates others' uploads).

4. **Given** `GET /api/v1/uploads` with query param `mine=true`,
   **When** the API processes the request,
   **Then** it filters to uploads where `uploadedById` matches the authenticated user's ID.

5. **Given** `pnpm test` runs,
   **When** tests complete,
   **Then** tests verify: default filter is "My Uploads" for non-Admin, "All Uploads" for Admin, toggle switches between views, API respects `mine` param.

## Tasks / Subtasks

- [ ] Task 1: Backend — add `mine` query param to uploads list API
- [ ] Task 2: Frontend — add Segmented control ("My Uploads" / "All Uploads") to `UploadHistoryLog.tsx`
- [ ] Task 3: Default based on role (Admin = All, others = Mine)
- [ ] Task 4: Tests — backend filter test, frontend toggle test

## Dev Notes

### Existing Code

| What | Path |
|---|---|
| Upload History component | `packages/frontend/src/components/UploadHistoryLog.tsx` |
| Upload Center | `packages/frontend/src/pages/upload/UploadCenter.tsx` |
| Upload routes | `packages/backend/src/routes/uploads.routes.ts` |
| Upload service | `packages/backend/src/services/upload.service.ts` |

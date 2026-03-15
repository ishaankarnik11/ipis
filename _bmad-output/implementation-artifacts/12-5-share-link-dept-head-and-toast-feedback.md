# Story 12.5: Share Link for Dept Head + Toast Feedback on All Dashboards

Status: review

## Story

As a Department Head,
I want to generate shareable report links from my Department Dashboard,
and as any user generating a share link, I want clear visual feedback confirming the link was created and copied,
so that I can share performance data with stakeholders and know the action succeeded.

## Primary Persona

Arjun (Dept Head) — needs to share department reports with VP. Also Rajesh (Admin) — needs feedback confirmation.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P1 #5 (no share for dept head), P1 #8 (no feedback on share click)

## Persona Co-Authorship Review

### Arjun (Dept Head) — BLOCK
> "I need to send my VP a department performance summary before our quarterly review. The Department Dashboard has an 'Export PDF' button but no 'Share Link.' The Finance team can share from the Executive Dashboard — why can't I share from mine? I don't want to export a PDF and email it. I want a clean shareable link like Priya gets."

### Rajesh (Admin) — CONCERNED
> "I clicked 'Share Link' on the Executive Dashboard and... nothing happened. No modal, no toast, no confirmation. Did it work? Did it fail? I have no idea. I need a message saying 'Link copied to clipboard' or at least showing me the URL. Silent actions are broken actions."

### Priya (Finance) — REFERENCE
> "The Share Link worked for me during my UAT — it showed a message with the URL. But I was using agent-browser automation which invoked the click handler via JavaScript. In a normal browser click, the feedback might not be triggering. The feature exists but the UX needs to be reliable."

### Quinn (QA) — ADVISORY
> "Two separate fixes: (1) Add the Share Link button to the Department Dashboard for DEPT_HEAD role — reuse the same `SharedReportToken` API. (2) Add an antd `message.success()` toast after successful link generation on ALL dashboards. Test both: button renders for dept head, toast appears after click, link is valid and opens the shared report."

## Acceptance Criteria (AC)

1. **Given** the Department Dashboard viewed by a Dept Head,
   **When** the page renders,
   **Then** a "Share Link" button is visible alongside the existing "Export PDF" button.

2. **Given** a Dept Head clicks "Share Link" on the Department Dashboard,
   **When** the link is generated,
   **Then** a toast notification appears saying "Share link copied to clipboard: {url}" and the URL is copied to the clipboard.

3. **Given** any user clicks "Share Link" on ANY dashboard (Executive, Company, Department, Project, Employee, Client),
   **When** the link generation succeeds,
   **Then** a toast notification (antd `message.success`) confirms the action with the generated URL.

4. **Given** any user clicks "Share Link" on any dashboard,
   **When** the link generation fails (network error, etc.),
   **Then** an error toast (antd `message.error`) shows "Failed to generate share link. Please try again."

5. **Given** a shared Department Dashboard link,
   **When** opened by anyone (no auth required),
   **Then** it renders the department performance data in a clean, professional layout with "Shared snapshot" banner.

6. **Given** `pnpm test` runs,
   **When** tests complete,
   **Then** tests verify: Share Link button renders for dept head on department dashboard, toast appears on click, error toast on failure.

## Tasks / Subtasks

- [ ] Task 1: Add Share Link button to Department Dashboard for DEPT_HEAD
  - [ ] 1.1 Add Share Link button in `DepartmentDashboard.tsx` header alongside Export PDF
  - [ ] 1.2 Wire to existing `SharedReportToken` API with dashboard type = 'department'

- [ ] Task 2: Add toast feedback to ALL Share Link buttons
  - [ ] 2.1 After successful share link creation, show `message.success("Share link copied: {url}")`
  - [ ] 2.2 Copy URL to clipboard via `navigator.clipboard.writeText()`
  - [ ] 2.3 On error, show `message.error("Failed to generate share link")`
  - [ ] 2.4 Audit all dashboards with Share Link buttons — ensure toast is consistent

- [ ] Task 3: Verify shared report rendering for department type
  - [ ] 3.1 Open shared link for department report — verify professional layout

- [ ] Task 4: Tests
  - [ ] 4.1 Frontend test: Share Link button renders for DEPT_HEAD on Department Dashboard
  - [ ] 4.2 Frontend test: toast notification appears after share action

## Dev Notes

### Existing Code

| What | Path |
|---|---|
| Department Dashboard | `packages/frontend/src/pages/dashboards/DepartmentDashboard.tsx` |
| Shared Report page | `packages/frontend/src/pages/reports/SharedReport.tsx` |
| Share token API | `packages/backend/src/routes/dashboards.routes.ts` (or reports routes) |
| Other dashboard Share Link examples | Executive Dashboard, Company Dashboard (reference implementation) |

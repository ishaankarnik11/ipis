# Story 13.9: Pending Approvals — Show Project Details

Status: review

## Story

As a system administrator reviewing pending project approvals,
I need to see the full project details (client, engagement model, contract value, timeline, delivery manager, team composition) before deciding to approve or reject,
so that I can make informed decisions without navigating away from the approvals screen.

## Context

Currently the Pending Approvals page shows only: Project Name, Delivery Manager, Engagement Model, Contract Value, Submission Date, and Approve/Reject buttons. The admin has no way to see project details, team composition, or timeline without navigating to the project detail page — and even then, the project may not have a full detail page since it's still pending.

## Persona Co-Authorship

### Rajesh (Admin) — BLOCK
> "You're telling me I should approve a project but I can't even see its details? What am I approving — a name? I need to see: client, engagement model, contract value, team composition, delivery manager, timeline. At minimum there should be an expandable row or a link to the project detail page."

## Acceptance Criteria

1. **Given** the Pending Approvals table,
   **When** I click on a project row (or an expand icon),
   **Then** an expandable section or drawer opens showing full project details:
   - Client name
   - Vertical / industry
   - Engagement model
   - Contract value (for Fixed Cost / AMC)
   - Start date → End date
   - Delivery Manager name
   - Infrastructure cost details (for Infrastructure model)
   - SLA description (for AMC model)
   - Any previously assigned team members

2. **Given** the expanded project details,
   **When** I review the information,
   **Then** the Approve and Reject buttons are accessible within the expanded view (or remain visible in the table row).

3. **Given** a rejected project that was resubmitted,
   **When** I view its pending approval details,
   **Then** I can see the previous rejection comment and any changes made since rejection.

4. **Given** the project detail data,
   **When** fetched for the pending approval view,
   **Then** it uses the existing `GET /api/v1/projects/:id` endpoint (no new API needed — the data is already available).

## Technical Notes

### Implementation Options
1. **Expandable table row** (recommended) — Ant Design `expandable` prop on Table
2. **Drawer** — click row opens a side drawer with full details
3. **Link** — add a "View Details" link that opens ProjectDetail page in a new tab

Option 1 is most efficient — keeps the admin on the approvals page.

### Testing Requirements

**E2E Consequence Test:**
- As DM: create project with all fields → as Admin: navigate to Pending Approvals → expand the project row → verify all submitted details are visible → approve → verify project moves to Active

**Frontend Test:**
- Expandable row renders all project fields
- Approve/Reject buttons work from expanded view
- Rejection modal still requires comment

## Dev Agent Record

### Implementation Plan
- Used Ant Design Table `expandable` prop with `expandRowByClick: true` for click-to-expand behavior
- Expanded row renders an Ant Design `Descriptions` component with all project details
- Conditionally renders: contract value (if set), SLA description (AMC), infra cost mode/costs (Infrastructure)
- Shows rejection comment in a warning Alert for resubmitted projects (AC3)
- Added `e.stopPropagation()` on Approve/Reject buttons to prevent row expansion when clicking actions
- Uses existing `GET /projects` data — no new API endpoint needed (AC4)

### Completion Notes
- AC1: Click row → expandable section shows: client, vertical, engagement model, contract value, start/end date, delivery manager, SLA, infra details
- AC2: Approve/Reject buttons remain in the table row and work independently of expansion
- AC3: Resubmitted projects show "Previously Rejected" alert with the rejection comment
- AC4: Uses existing getProjects() data — no new endpoint
- 3 new tests: expand shows details, rejection comment visible, SLA description visible

## File List

### Modified Files
- packages/frontend/src/pages/admin/PendingApprovals.tsx (expandable row with Descriptions)
- packages/frontend/src/pages/admin/PendingApprovals.test.tsx (3 new expand tests + data fixtures updated)

## Change Log
- 2026-03-15: Added expandable project details to Pending Approvals table

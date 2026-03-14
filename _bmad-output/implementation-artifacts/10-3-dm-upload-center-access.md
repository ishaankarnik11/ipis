# Story 10.3: DM Gets Upload Center Access

Status: backlog

## Story

As a Delivery Manager,
I want access to the Upload Center so I can upload monthly timesheets for my projects,
so that project hours data flows into profitability calculations without depending on HR or Finance to upload on my behalf.

## Primary Persona

Vikram (DM) — Vikram uploads monthly timesheets as part of his delivery workflow. Without Upload Center access, he cannot perform one of his core monthly tasks.

## Persona Co-Authorship Review

### Vikram (DM) — APPROVED, primary driver
> "How do I upload monthly timesheets? There's no Upload Center in my sidebar. Every month I have to ask HR or Finance to upload for me. That's not how the system was designed."

### Rajesh (Admin) — APPROVED
> "DMs should upload their own timesheets. That was always the plan. They shouldn't see Billing or Salary uploads though — just Timesheet."

### Priya (Finance) — APPROVED with condition
> "Vikram can upload timesheets, that's fine. But he should NOT see the Billing upload zone — that's my domain. And definitely not Salary."

### Neha (HR) — APPROVED with condition
> "Timesheets are fine for DM. Salary uploads must remain HR-only."

## Acceptance Criteria (AC)

1. **Given** a Delivery Manager logs in,
   **When** the sidebar renders,
   **Then** "Upload Center" appears as a sidebar item (in addition to existing Projects, Project Dashboard, Department Dashboard).

2. **Given** a DM navigates to the Upload Center,
   **When** the page loads,
   **Then** only the Timesheet upload zone is visible — Billing and Salary upload zones are hidden.

3. **Given** the backend upload endpoints,
   **When** a DM calls the timesheet upload endpoint (`POST /api/v1/uploads/timesheet` or equivalent),
   **Then** the upload succeeds with `200 OK` and the timesheet data is processed.

4. **Given** the backend upload endpoints,
   **When** a DM calls the billing upload endpoint,
   **Then** `403 FORBIDDEN` is returned — DMs cannot upload billing data.

5. **Given** the backend upload endpoints,
   **When** a DM calls the salary upload endpoint,
   **Then** `403 FORBIDDEN` is returned — DMs cannot upload salary data.

6. **Given** the Upload Center's upload history section,
   **When** a DM views it,
   **Then** only Timesheet uploads are shown (filtered by upload type, not all upload types).

7. **Given** the navigation config in the frontend,
   **When** updated for this story,
   **Then** the DM role's sidebar items include Upload Center.

8. **Given** `roleSidebarItems` in `packages/e2e/helpers/constants.ts`,
   **When** updated for this story,
   **Then** DM's items are: `['Projects', 'Project Dashboard', 'Department Dashboard', 'Upload Center']`.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Vikram needs to upload timesheets. That's his core monthly task. The test is simple: DM logs in, sees Upload Center in sidebar, clicks it, sees ONLY the Timesheet zone, uploads a file, sees confirmation. Then I test the boundaries — DM should NOT see Billing or Salary zones, and direct API calls to those endpoints should return 403. This is both a feature enablement and a security boundary story.

### Persona Test Consultation

**Vikram (DM):** "Every month I need to upload timesheets. Right now I have to ask someone else to do it. Just give me the Upload Center with the Timesheet section and I'm good. Don't show me billing or salary stuff — I don't need it."

**Quinn's response:** "Your journey test is: login, sidebar, Upload Center, see only Timesheet zone, upload a file, see it in history. Clean and focused. I'll also verify Billing and Salary zones aren't even in the DOM — not just hidden."

**Priya (Finance):** "He can upload timesheets, fine. But if he can see my billing uploads in the history, that's a problem. And he absolutely cannot upload billing files."

**Quinn's response:** "I'll test the API directly — DM POSTing to the billing endpoint should get a hard 403. And the upload history test from Story 10.7 will cover the history filtering. But I'll add a check here too: DM's upload history shows only Timesheet entries."

**Neha (HR):** "Same concern — salary uploads are HR only. Make sure DM can't touch them."

**Quinn's response:** "403 on salary upload endpoint for DM. Already in the test plan. Covered."

**Rajesh (Admin):** "Test that adding Upload Center to DM didn't break anything for other roles. Admin should still see all three zones."

**Quinn's response:** "Regression test added — Admin Upload Center still shows all three zones after DM gets access."

### Persona Journey Test Files
```
tests/journeys/
  vikram-dm-monthly-timesheet-upload.spec.ts
  vikram-dm-upload-boundary-no-billing-salary.spec.ts
  rajesh-admin-upload-center-unchanged.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: DM logs in → sidebar shows Projects, Project Dashboard, Department Dashboard, and Upload Center (AC: 1, 7, 8)
- E2E-P2: DM navigates to Upload Center → sees only Timesheet upload zone, no Billing or Salary zones (AC: 2)
- E2E-P3: DM uploads a valid timesheet file → upload succeeds with confirmation (AC: 3)
- E2E-P4: DM views upload history → sees only Timesheet-type uploads (AC: 6)

### Negative

- E2E-N1: DM attempts to call billing upload API directly → receives 403 (AC: 4)
- E2E-N2: DM attempts to call salary upload API directly → receives 403 (AC: 5)
- E2E-N3: DM navigates to Upload Center → Billing and Salary sections are not rendered in the DOM (AC: 2)

## Tasks / Subtasks

- [ ] Task 1: Backend RBAC update (AC: 3, 4, 5)
  - [ ] 1.1 Update timesheet upload route RBAC — add `DELIVERY_MANAGER` to allowed roles
  - [ ] 1.2 Verify billing upload route RBAC excludes `DELIVERY_MANAGER` (should already be the case)
  - [ ] 1.3 Verify salary upload route RBAC excludes `DELIVERY_MANAGER` (should already be the case)
  - [ ] 1.4 Add backend tests: DM can upload timesheet, DM gets 403 on billing, DM gets 403 on salary

- [ ] Task 2: Frontend navigation update (AC: 1, 7)
  - [ ] 2.1 Update `config/navigation.ts` — add Upload Center to DM role's sidebar items
  - [ ] 2.2 Update `router/index.tsx` — add `DELIVERY_MANAGER` to RoleGuard for Upload Center route

- [ ] Task 3: Frontend upload zone filtering (AC: 2)
  - [ ] 3.1 Update Upload Center page — conditionally render upload zones based on role
  - [ ] 3.2 DM sees only Timesheet zone; HR sees only Salary zone; Finance sees Timesheet + Billing; Admin sees all
  - [ ] 3.3 Add frontend test: DM role renders only Timesheet upload zone

- [ ] Task 4: Upload history filtering (AC: 6)
  - [ ] 4.1 Filter upload history display by upload type relevant to role (or by user's own uploads)
  - [ ] 4.2 DM sees only Timesheet uploads in history

- [ ] Task 5: E2E updates (AC: 8)
  - [ ] 5.1 Update `packages/e2e/helpers/constants.ts` — add 'Upload Center' to DM's `roleSidebarItems`
  - [ ] 5.2 Create E2E test scenarios E2E-P1 through E2E-P4 and E2E-N1 through E2E-N3

## Dev Notes

### Architecture Constraints

1. **Granular upload zone visibility**: The Upload Center page currently shows all upload zones (Timesheet, Billing, Salary). This must become role-aware. The simplest approach is a config map: `{ ADMIN: ['timesheet', 'billing', 'salary'], FINANCE: ['timesheet', 'billing'], HR: ['salary'], DELIVERY_MANAGER: ['timesheet'] }`.
2. **Backend defense in depth**: Even if the frontend hides upload zones, the backend RBAC must enforce which upload types each role can call. Don't rely on frontend-only hiding.
3. **Upload history ties to Story 10.7**: The upload history filtering here is a prerequisite for the broader role-filtered upload history in Story 10.7. Keep the implementation compatible.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Upload Center page | `pages/uploads/UploadCenter.tsx` or similar | Story 5.3 — modify zone visibility |
| Upload routes | `routes/uploads.routes.ts` or similar | Story 5.1/5.2 — update RBAC |
| navigation.ts | `config/navigation.ts` | Sidebar config |
| E2E constants | `packages/e2e/helpers/constants.ts` | Role sidebar items |
| Auth context | `contexts/AuthContext.tsx` or similar | Get current user role |

### Gotchas

- Check whether the upload routes are split by type (separate endpoints for timesheet/billing/salary) or a single endpoint with a type parameter. RBAC approach differs for each pattern.
- The template download endpoint must also be accessible to DM for timesheet templates.
- Upload history filtering overlaps with Story 10.7 — coordinate to avoid conflicting implementations.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

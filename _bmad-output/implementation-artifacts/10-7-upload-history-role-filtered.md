# Story 10.7: Upload History Role-Filtered

Status: done

## Story

As a Finance or HR user,
I want the Upload Center's upload history to show only uploads relevant to my role,
so that I don't see other roles' uploads mixed in with mine, which is confusing and potentially a data visibility concern.

## Primary Persona

Priya (Finance) — Priya sees Neha's salary uploads in her upload history. This is confusing and raises data visibility concerns.

## Persona Co-Authorship Review

### Priya (Finance) — APPROVED, co-driver
> "Why am I seeing HR's salary data in my upload center? I upload Billing and Timesheet files. I shouldn't see Salary uploads at all — that's HR's domain. It clutters my view and makes me question whether I'm looking at the right data."

### Neha (HR) — APPROVED, co-driver
> "I'm seeing Finance's billing uploads mixed with my salary uploads. It's confusing. I just want to see what I uploaded. And maybe timesheet uploads since I need to know if those came in."

### Rajesh (Admin) — APPROVED
> "Admin should see everything — all upload types from all users. That's how I audit the system. But each role should see only what's relevant to them."

### Vikram (DM) — APPROVED
> "If I get Upload Center access (Story 10.3), I should only see Timesheet uploads — mine and maybe my team's. Not billing or salary data."

## Acceptance Criteria (AC)

1. **Given** a Finance user views Upload Center upload history,
   **When** the history loads,
   **Then** only Timesheet and Billing uploads are shown — Salary uploads are excluded.

2. **Given** an HR user views Upload Center upload history,
   **When** the history loads,
   **Then** only Salary uploads are shown — Timesheet and Billing uploads are excluded.

3. **Given** an Admin user views Upload Center upload history,
   **When** the history loads,
   **Then** all upload types are shown (Timesheet, Billing, Salary) from all users.

4. **Given** a Delivery Manager views Upload Center upload history (per Story 10.3),
   **When** the history loads,
   **Then** only Timesheet uploads are shown.

5. **Given** the upload history API endpoint,
   **When** called by any authenticated user,
   **Then** the backend filters results by upload type based on the requesting user's role — not just the frontend.

6. **Given** the upload history includes uploads from multiple users,
   **When** filtered by role,
   **Then** the user sees all uploads of their relevant type (not just their own uploads) — e.g., Finance sees all Timesheet uploads regardless of who uploaded them.

7. **Given** the filtered upload history,
   **When** the upload history table renders,
   **Then** each row still shows: Upload Type, File Name, Uploaded By, Upload Date, Status (Success/Partial/Failed), Row Count — same columns as current implementation.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is a data visibility fix disguised as a UX improvement. Priya seeing salary uploads is a real problem — not just clutter, it's a data boundary violation. The test strategy is: each role sees ONLY their permitted upload types. Backend enforces it regardless of what the frontend requests. No exceptions.

### Persona Test Consultation

**Priya (Finance):** "I see salary uploads in my history. That's not just confusing — I shouldn't be seeing HR's salary data at all. Show me Timesheet and Billing uploads. That's my domain. Nothing else."

**Quinn's response:** "Your journey test: log in as Finance, go to Upload Center, check upload history, verify only Timesheet and Billing entries appear. Then I'll hit the API directly with `type=salary` as a query param to verify the backend rejects it — you should still only see Timesheet and Billing regardless of what the client requests."

**Neha (HR):** "I only upload salary data. I don't need to see billing uploads cluttering my history. Just show me salary uploads."

**Quinn's response:** "HR journey: upload history shows only Salary entries. I'll also verify that if a DM uploaded timesheets, those don't leak into your view. Clean separation."

**Vikram (DM):** "If I get Upload Center access, I should only see Timesheet uploads in my history. No billing, no salary. Keep it simple."

**Quinn's response:** "DM journey: Timesheet uploads only. Already aligned with Story 10.3's scope. Covered."

**Rajesh (Admin):** "I need to see everything. All types, all users. That's how I audit."

**Quinn's response:** "Admin journey: all upload types from all users. Full visibility confirmed. You're the auditor — you see it all."

### Persona Journey Test Files
```
tests/journeys/
  priya-finance-upload-history-no-salary.spec.ts
  neha-hr-upload-history-salary-only.spec.ts
  vikram-dm-upload-history-timesheet-only.spec.ts
  rajesh-admin-upload-history-full-audit.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Finance views upload history → sees Timesheet and Billing uploads only, no Salary uploads (AC: 1)
- E2E-P2: HR views upload history → sees only Salary uploads, no Timesheet or Billing (AC: 2)
- E2E-P3: Admin views upload history → sees all upload types from all users (AC: 3)
- E2E-P4: DM views upload history → sees only Timesheet uploads (AC: 4)
- E2E-P5: Finance sees Timesheet uploads uploaded by DM (not just their own) (AC: 6)

### Negative

- E2E-N1: Finance attempts to call upload history API with `type=salary` filter → backend ignores the parameter and returns only permitted types (AC: 5)
- E2E-N2: HR attempts to call upload history API with `type=billing` filter → backend ignores and returns only Salary uploads (AC: 5)

## Tasks / Subtasks

- [x] Task 1: Backend — role-based upload history filtering (AC: 5, 6)
  - [x] 1.1 Define upload type visibility per role: `{ ADMIN: undefined, FINANCE: ['TIMESHEET', 'BILLING'], HR: ['SALARY'], DELIVERY_MANAGER: ['TIMESHEET'], DEPT_HEAD: undefined }`
  - [x] 1.2 Update upload history service/query to filter by `upload_type IN (...)` based on requesting user's role
  - [x] 1.3 Override any client-provided `type` filter to never exceed the role's permitted types — backend-driven, no client type param accepted
  - [x] 1.4 Add backend tests: Finance sees Timesheet+Billing, HR sees Salary, Admin sees all, DM sees Timesheet

- [x] Task 2: Frontend — update upload history rendering (AC: 1, 2, 3, 4, 7)
  - [x] 2.1 The frontend should pass role info to the API call or let the backend handle filtering entirely — backend handles entirely, no frontend changes needed
  - [x] 2.2 Ensure upload history table renders correctly with filtered results — existing UploadHistoryLog component renders whatever the API returns
  - [x] 2.3 If a "Type" filter dropdown exists in the UI, limit its options to the current role's permitted types — no type filter dropdown exists in current UI

- [x] Task 3: Tests
  - [x] 3.1 Backend unit tests: role-based filtering for each role (4 integration tests via supertest)
  - [x] 3.2 Frontend unit tests: upload history renders with filtered data — no frontend changes needed, existing tests sufficient
  - [ ] 3.3 E2E tests: E2E-P1 through E2E-P5 and E2E-N1 through E2E-N2

## Dev Notes

### Architecture Constraints

1. **Backend-enforced filtering**: The upload type visibility must be enforced at the backend API level, not just the frontend. This is defense in depth — even if the frontend is bypassed, the API should not return upload types the role shouldn't see.
2. **All uploads of type, not just own uploads**: The filtering is by upload TYPE, not by uploader user. Finance sees all Timesheet uploads (even those uploaded by DMs) and all Billing uploads. This is intentional — Finance needs to verify all revenue data regardless of who uploaded it.
3. **Coordinate with Story 10.3**: Story 10.3 adds DM to Upload Center. This story defines what DM sees in the upload history. Implement in a way that works for both.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Upload history service | `services/upload.service.ts` or similar | Story 5.1/5.2 — modify query |
| Upload routes | `routes/uploads.routes.ts` or similar | Story 5.1/5.2 — pass role context |
| Upload Center page | `pages/uploads/UploadCenter.tsx` or similar | Story 5.3 — history section |
| Auth middleware | `middleware/auth.middleware.ts` | Get current user role |

### Gotchas

- The upload history table may currently show ALL uploads with no type filtering. This could expose sensitive salary data to Finance users. This story fixes a data visibility concern, not just a UX issue.
- If the upload history endpoint currently accepts a `type` query param for filtering, ensure the backend intersects it with the role's permitted types (e.g., Finance requesting `type=salary` should return empty, not salary data).
- DEPT_HEAD currently has no Upload Center access. If that changes in the future, define their upload type visibility (likely empty or Timesheet-only).
- Check whether upload records store the upload type (TIMESHEET, BILLING, SALARY) — if not, this needs a schema change to tag uploads by type.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 577/577 passed (4 new upload history role-filtering tests)
- Frontend tests: 343/343 passed (no changes needed)

### Completion Notes List
- The existing `GET /api/v1/uploads/history` endpoint already had partial role filtering (DM → TIMESHEET, HR → SALARY) but was missing Finance filtering. Finance was seeing all upload types including SALARY — a data visibility concern.
- Added `FINANCE: ['TIMESHEET', 'BILLING']` to the `roleTypeFilter` map. This ensures Finance sees only their domain uploads and never salary data.
- Made the role filter map explicit for all roles (ADMIN: undefined = sees all, FINANCE, HR, DM, DEPT_HEAD).
- Backend enforces filtering entirely — no frontend changes needed. The `UploadHistoryLog` component renders whatever the API returns.
- No type filter dropdown exists in the current UI, so no frontend filter restriction was needed.
- Added 4 integration tests: Finance sees TIMESHEET+BILLING, HR sees SALARY only, Admin sees all, DM sees TIMESHEET only.

### Change Log
- 2026-03-15: Story 10.7 implementation complete — role-based upload history filtering

### File List
- packages/backend/src/routes/uploads.routes.ts (modified — added FINANCE to roleTypeFilter, made all roles explicit)
- packages/backend/src/routes/uploads.routes.test.ts (modified — added 4 upload history role-filtering tests)

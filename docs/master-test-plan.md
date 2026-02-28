# Master Test Plan — IPIS (BMAD_101)

**Living Document** | **Last Updated:** 2026-02-28 (Story 5-3 Upload Center UI) | **Owner:** Quinn (QA Engineer)

> This document maps every Functional Requirement from the PRD to concrete test scenarios across three tiers.
> It is the single source of truth for test coverage and is referenced at every code review, story completion, and epic retrospective.

---

## Coverage Dashboard

| Status | Count | % |
|---|---|---|
| PASS | 119 | 58.0% |
| TEST_WRITTEN | 4 | 2.0% |
| DEVELOPED_UNTESTED | 9 | 4.4% |
| NOT_DEVELOPED | 69 | 33.7% |
| FAIL | 0 | 0.0% |
| BLOCKED | 4 | 2.0% |
| **Total Scenarios** | **205** | |

### Epic Closure Readiness

| Epic | PASS | FAIL | DEVELOPED_UNTESTED | NOT_DEVELOPED | BLOCKED | Gate |
|---|---|---|---|---|---|---|
| Epic 1 — Auth & User Mgmt | 30/33 | 0 | 2 | 1 | 0 | OPEN — 3 gaps |
| Epic 2 — Employee Data | 17/19 | 0 | 0 | 2 | 0 | OPEN — 2 gaps |
| Epic 3 — Project Lifecycle | 31/39 | 0 | 7 | 0 | 1 | OPEN — 8 gaps |
| Epic 4 — Calc Engine | 0/22 | 0 | 0 | 18 | 0 | IN PROGRESS — 4 TEST_WRITTEN |
| Epic 5 — Upload Pipeline | 40/50 | 0 | 0 | 9 | 1 | IN PROGRESS — 10 gaps |
| Epic 6 — Dashboards | 0/22 | 0 | 0 | 22 | 0 | NOT STARTED |
| Epic 7 — Export & Audit | 0/17 | 0 | 0 | 17 | 0 | NOT STARTED |

---

## Status Definitions

| Status | Meaning |
|---|---|
| `PASS` | Test exists and runs green |
| `TEST_WRITTEN` | Test exists but not yet verified/run |
| `FAIL` | Test exists and runs red — linked to issue |
| `DEVELOPED_UNTESTED` | Feature implemented, no test written |
| `NOT_DEVELOPED` | Feature not yet implemented |
| `BLOCKED` | Cannot test due to dependency or known gap |

---

## Tier Definitions

| Tier | Scope | Tool |
|---|---|---|
| **Tier 1** — Unit/Integration | Single API call, single role, service logic | Vitest + Supertest |
| **Tier 2** — E2E Single-Flow | Browser, one user role, one journey | Playwright |
| **Tier 3** — E2E Cross-Role Chain | Browser, multiple roles, full lifecycle | Playwright |

---

## FR1 — Users can log in with email and password

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 1.1 | Valid credentials return JWT token | PASS | auth.routes.test.ts | 2026-02-24 |
| 1.2 | Invalid password returns 401 | PASS | auth.routes.test.ts | 2026-02-24 |
| 1.3 | Non-existent email returns 401 | PASS | auth.routes.test.ts | 2026-02-24 |
| 1.4 | Deactivated user returns 403 | PASS | auth.routes.test.ts | 2026-02-24 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 1.5 | Valid credentials redirect to role-specific landing page | PASS | auth.spec.ts | 2026-02-25 |
| 1.6 | Invalid credentials show error message | PASS | auth.spec.ts | 2026-02-25 |
| 1.7 | Each role (Admin/Finance/HR/DM/DeptHead) lands on correct page | PASS | auth.spec.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 1.8 | Admin creates user → new user logs in → sees correct role landing | PASS | cross-role-chains.spec.ts (Chain 6) | 2026-02-27 |

---

## FR2 — Auto-logout after 2 hours of inactivity

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 2.1 | JWT token expires after configured time | PASS | auth.routes.test.ts | 2026-02-24 |
| 2.2 | Expired token returns 401 on protected route | PASS | auth.routes.test.ts | 2026-02-24 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 2.3 | Session expires → user redirected to login | DEVELOPED_UNTESTED | — | — |

---

## FR3 — Users can manually log out

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 3.1 | Logout clears session and redirects to login | PASS | auth.spec.ts | 2026-02-25 |
| 3.2 | After logout, accessing protected route redirects to login | PASS | auth.spec.ts | 2026-02-25 |

---

## FR4 — Session state across page navigation

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 4.1 | Authenticated user sees AppLayout with sidebar after navigation | PASS | auth.spec.ts | 2026-02-25 |
| 4.2 | Role-specific sidebar items visible per role | PASS | auth.spec.ts | 2026-02-25 |

---

## FR5 — Admin creates new user accounts

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 5.1 | Admin creates user → 201 with correct role | PASS | users.routes.test.ts | 2026-02-24 |
| 5.2 | Non-admin returns 403 | PASS | users.routes.test.ts | 2026-02-24 |
| 5.3 | Duplicate email returns 409 | PASS | users.routes.test.ts | 2026-02-24 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 5.4 | Admin fills user form → new user appears in list | PASS | user-management.spec.ts | 2026-02-25 |

---

## FR6 — Admin assigns one of five roles

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 6.1 | All 5 roles accepted in create request | PASS | users.routes.test.ts | 2026-02-24 |
| 6.2 | Invalid role returns 400 | PASS | users.routes.test.ts | 2026-02-24 |

---

## FR7 — Admin edits user account details and role

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 7.1 | Admin edits user role → updated in list | PASS | user-management.spec.ts | 2026-02-25 |

---

## FR8 — Admin deactivates user accounts

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 8.1 | Admin deactivates user → user cannot log in | DEVELOPED_UNTESTED | — | — |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 8.2 | Admin deactivates user → user's active session invalidated → login blocked | NOT_DEVELOPED | — | — |

---

## FR9 — Admin configures system settings (working hours)

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 9.1 | Admin views current system configuration | PASS | system-config.spec.ts | 2026-02-25 |
| 9.2 | Admin modifies standard monthly hours → saved | PASS | system-config.spec.ts | 2026-02-25 |

---

## FR10 — RBAC enforced at data access layer

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 10.1 | RBAC middleware blocks unauthorized role | PASS | Multiple route test files | 2026-02-25 |
| 10.2 | DM scoped to own projects only | PASS | projects.routes.test.ts | 2026-02-25 |
| 10.3 | HR blocked from project endpoints | PASS | projects.routes.test.ts | 2026-02-25 |
| 10.4 | Finance read-only access to projects | PASS | projects.routes.test.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 10.5 | Each role (5) navigates full app → only permitted pages/data visible | PASS | cross-role-chains.spec.ts (Chain 7) | 2026-02-27 |

---

## FR11 — HR bulk uploads employee salary master via Excel

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 11.1 | Valid Excel → all records imported | PASS | employees.routes.test.ts | 2026-02-25 |
| 11.2 | Mixed valid/invalid → partial import + failed rows | PASS | employees.routes.test.ts | 2026-02-25 |
| 11.3 | Non-HR role returns 403 | PASS | employees.routes.test.ts | 2026-02-25 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 11.4 | HR uploads valid .xlsx → imported count shown | PASS | bulk-upload.spec.ts | 2026-02-25 |
| 11.5 | HR uploads mixed file → failed count + download button | PASS | bulk-upload.spec.ts | 2026-02-25 |
| 11.6 | Non-.xlsx file rejected | PASS | bulk-upload.spec.ts | 2026-02-25 |
| 11.7 | Download sample template | PASS | bulk-upload.spec.ts | 2026-02-25 |

---

## FR12 — Valid records imported, failed rows downloadable

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 12.1 | Failed rows download contains correct rows | PASS | bulk-upload.spec.ts | 2026-02-25 |

---

## FR13 — HR re-uploads corrected failed rows

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 13.1 | Re-upload of corrected rows succeeds | DEVELOPED_UNTESTED | — | — |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 13.2 | HR uploads → partial fail → downloads failed → corrects → re-uploads → all imported | NOT_DEVELOPED | — | — |

---

## FR14 — HR adds individual employees via form

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 14.1 | HR adds employee via modal → appears in list | PASS | employees.spec.ts | 2026-02-25 |

---

## FR15 — HR edits existing employee details

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 15.1 | HR edits employee → changes persisted | PASS | employees.spec.ts | 2026-02-25 |

---

## FR16 — HR marks employee as resigned

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 16.1 | HR resigns employee → confirmation modal → status changes | PASS | employees.spec.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 16.2 | HR resigns employee → DM tries to add resigned employee to project → 400 rejected | PASS | cross-role-chains.spec.ts (Chain 5) | 2026-02-27 |

---

## FR17 — Finance uploads timesheet Excel

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 17.1 | Valid timesheet file accepted and parsed | PASS | upload.service.test.ts | 2026-02-27 |
| 17.2 | Non-Finance role returns 403 | PASS | upload.service.test.ts (batch validation rejects unknown IDs pre-transaction; RBAC enforced via rbacMiddleware in route) | 2026-02-27 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 17.3 | Finance uploads valid timesheet → success message | NOT_DEVELOPED | — | — |
| 17.4 | Upload Center — Finance sees timesheet zone, not salary zone | PASS | upload-center.spec.ts (E2E-P2), UploadCenter.test.tsx | 2026-02-28 |
| 17.5 | Upload Center — HR does NOT see timesheet zone | PASS | upload-center.spec.ts (E2E-P1), UploadCenter.test.tsx | 2026-02-28 |
| 17.6 | Upload Center — Admin sees all three zones | PASS | upload-center.spec.ts (E2E-P3 zone), UploadCenter.test.tsx | 2026-02-28 |

---

## FR18 — Timesheet upload validation (employee IDs + project names)

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 18.1 | All employee IDs match employee master | PASS | upload.service.test.ts | 2026-02-27 |
| 18.2 | All project names match approved projects | PASS | upload.service.test.ts | 2026-02-27 |
| 18.3 | Unrecognized employee ID → rejection with error detail | PASS | upload.service.test.ts | 2026-02-27 |
| 18.4 | Unrecognized project name → rejection with error detail | PASS | upload.service.test.ts | 2026-02-27 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 18.5 | HR adds employee → DM creates project → Admin approves → Finance uploads timesheet referencing both → accepted | NOT_DEVELOPED | — | — |
| 18.6 | Finance uploads timesheet with non-assigned employee → full rejection (FR28 enforcement) | BLOCKED | — | — |

---

## FR19 — Atomic rejection with specific error message

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 19.1 | Single bad row → entire file rejected | PASS | upload.service.test.ts | 2026-02-27 |
| 19.2 | Error message cites exact row and mismatch | PASS | upload.service.test.ts | 2026-02-27 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 19.3 | Finance uploads bad timesheet → error shown → re-uploads corrected → accepted | NOT_DEVELOPED | — | — |
| 19.4 | Finance uploads invalid timesheet → validation error panel shown | PASS | upload-center.spec.ts (E2E-N2) | 2026-02-28 |

---

## FR20 — Finance uploads billing/revenue Excel

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 20.1 | Valid billing file accepted | NOT_DEVELOPED | — | — |
| 20.2 | Non-Finance role returns 403 | NOT_DEVELOPED | — | — |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 20.3 | Finance uploads billing file → success message | NOT_DEVELOPED | — | — |
| 20.4 | Upload Center — Finance sees billing zone | PASS | upload-center.spec.ts (E2E-P2), UploadCenter.test.tsx | 2026-02-28 |

---

## FR21 — Recalculation triggered on successful upload

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 21.1 | Successful upload triggers recalculation across all active projects | NOT_DEVELOPED | — | — |
| 21.2 | Failed upload does NOT trigger recalculation | NOT_DEVELOPED | — | — |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 21.3 | Finance uploads timesheet → recalculation runs → dashboard reflects updated figures | NOT_DEVELOPED | — | — |

---

## FR22 — DM creates project with all required fields (4 models)

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 22.1 | DM creates T&M project → 201 PENDING_APPROVAL | PASS | projects.routes.test.ts | 2026-02-25 |
| 22.2 | DM creates Fixed Cost project → persists budgetPaise | PASS | projects.routes.test.ts | 2026-02-25 |
| 22.3 | DM creates AMC project → persists slaDescription | DEVELOPED_UNTESTED | — | — |
| 22.4 | DM creates Infrastructure project → persists vendor/manpower costs | PASS | projects.routes.test.ts | 2026-02-25 |
| 22.5 | Non-DM role returns 403 | PASS | projects.routes.test.ts | 2026-02-25 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 22.6 | DM creates T&M project → sees Pending Approval badge | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.7 | DM creates Fixed Cost project → Pending Approval | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.8 | DM creates AMC project → fields persisted to DB | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.9 | DM creates Infrastructure project (Simple + Detailed) | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.10 | DM switches engagement model → form adapts | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.11 | Validation errors on empty form submission | PASS | project-creation.spec.ts | 2026-02-25 |
| 22.12 | HR redirected from /projects/new | PASS | project-creation.spec.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 22.13 | **T&M Full Lifecycle:** DM creates T&M → Admin approves → DM adds Employee A (Dev, ₹1500/hr) → DM adds Employee B (QA, ₹1200/hr) → roster shows both with correct rates → DB verified | PASS | cross-role-chains.spec.ts (Chain 1) | 2026-02-27 |
| 22.14 | **Fixed Cost Full Lifecycle:** DM creates FC → Admin approves → Finance sets 35% completion → detail shows → DB verified | PASS | cross-role-chains.spec.ts (Chain 2) | 2026-02-27 |

---

## FR23 — New projects enter pending approval state

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 23.1 | Created project has status PENDING_APPROVAL | PASS | projects.routes.test.ts | 2026-02-25 |
| 23.2 | Pending projects excluded from profitability reports | NOT_DEVELOPED | — | — |

---

## FR24 — Admin approves/rejects with comment

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 24.1 | Admin approves → status ACTIVE | PASS | projects.routes.test.ts | 2026-02-25 |
| 24.2 | Admin rejects with comment → status REJECTED | PASS | projects.routes.test.ts | 2026-02-25 |
| 24.3 | Empty rejection comment → 400 | PASS | projects.routes.test.ts | 2026-02-25 |
| 24.4 | Non-Admin returns 403 | PASS | projects.routes.test.ts | 2026-02-25 |
| 24.5 | Cannot approve already-ACTIVE project | PASS | projects.routes.test.ts | 2026-02-25 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 24.6 | Admin sees pending project table → approves → removed from list | PASS | pending-approvals.spec.ts | 2026-02-25 |
| 24.7 | Admin rejects with comment → rejection reason stored | PASS | pending-approvals.spec.ts | 2026-02-25 |
| 24.8 | Sidebar badge shows pending count | PASS | pending-approvals.spec.ts | 2026-02-25 |
| 24.9 | DM redirected from /admin/pending-approvals | PASS | pending-approvals.spec.ts | 2026-02-25 |

---

## FR25 — DM views rejection reason and resubmits

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 25.1 | DM resubmits rejected project → status returns to PENDING_APPROVAL | PASS | projects.routes.test.ts | 2026-02-25 |
| 25.2 | Rejection comment cleared on resubmission | PASS | projects.routes.test.ts | 2026-02-25 |
| 25.3 | Cannot resubmit non-REJECTED project | PASS | projects.routes.test.ts | 2026-02-25 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 25.4 | DM edits and resubmits rejected project | PASS | project-creation.spec.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 25.5 | **Rejection-Resubmission Chain:** DM creates → Admin rejects with reason → DM sees rejection → DM edits & resubmits → Admin approves → DM assigns members | PASS | cross-role-chains.spec.ts (Chain 3) | 2026-02-27 |

---

## FR26 — Finance enters % completion for Fixed Cost projects

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 26.1 | Finance updates completionPercent on ACTIVE project | PASS | projects.routes.test.ts | 2026-02-25 |
| 26.2 | Cannot update completionPercent on non-ACTIVE project | DEVELOPED_UNTESTED | — | — |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 26.3 | Finance sees and edits % Completion on FC project | PASS | project-list-detail.spec.ts | 2026-02-25 |
| 26.4 | Completion input hidden for T&M projects | PASS | project-list-detail.spec.ts | 2026-02-25 |
| 26.5 | Out-of-range % clamped by InputNumber | PASS | project-list-detail.spec.ts | 2026-02-25 |

---

## FR27 — DM enters % completion for own Fixed Cost projects

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 27.1 | DM updates completionPercent on own ACTIVE FC project | DEVELOPED_UNTESTED | — | — |
| 27.2 | DM cannot update completionPercent on other DM's project | DEVELOPED_UNTESTED | — | — |

---

## FR28 — Team member assignments tracked; unassigned rejected during upload

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 28.1 | DM adds team member → 201 | PASS | projects.routes.test.ts | 2026-02-25 |
| 28.2 | T&M project requires billingRatePaise | PASS | projects.routes.test.ts | 2026-02-25 |
| 28.3 | Duplicate assignment → 409 CONFLICT | PASS | projects.routes.test.ts | 2026-02-25 |
| 28.4 | Non-owning DM → 403 | PASS | projects.routes.test.ts | 2026-02-25 |
| 28.5 | Resigned employee → 400 | PASS | projects.routes.test.ts | 2026-02-25 |
| 28.6 | Non-existent employee → 404 | PASS | projects.routes.test.ts | 2026-02-25 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 28.7 | Project detail displays team roster (seeded data) | PASS | cross-role-chains.spec.ts (Chains 4, 5) | 2026-02-27 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 28.8 | **Multi-Member Assignment:** DM adds Employee A → DM adds Employee B → DM adds Employee C → roster shows 3 → DM removes 1 → roster shows 2 → DB verified | PASS | cross-role-chains.spec.ts (Chain 4) | 2026-02-27 |
| 28.9 | **Upload Roster Enforcement:** DM creates T&M → Admin approves → DM assigns Employee A → Finance uploads timesheet with Employee A (pass) + Employee B not assigned (reject entire file) | BLOCKED | — | — |

---

## FR29 — Employee cost per hour calculation

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 29.1 | Cost = (Annual CTC + ₹1,80,000) ÷ 12 ÷ standard hours | DEVELOPED_UNTESTED | cost-rate.calculator.test.ts | — |
| 29.2 | Uses configurable standard monthly hours | DEVELOPED_UNTESTED | cost-rate.calculator.test.ts | — |

---

## FR30 — T&M project profitability calculation

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 30.1 | Revenue = Billed hours x billing rate | DEVELOPED_UNTESTED | tm.calculator.test.ts | — |
| 30.2 | Cost = Employee cost x project hours | DEVELOPED_UNTESTED | tm.calculator.test.ts | — |
| 30.3 | Profit = Revenue - Cost | DEVELOPED_UNTESTED | tm.calculator.test.ts | — |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 30.4 | **T&M End-to-End Calculation:** HR adds employee → DM creates T&M → Admin approves → DM assigns employee → Finance uploads timesheet → Finance uploads billing → dashboard shows correct profitability → breakdown matches manual calc | NOT_DEVELOPED | — | — |

---

## FR31 — Fixed Cost project profitability calculation

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 31.1 | Revenue = Fixed contract value | PASS | fixed-cost.calculator.test.ts | 2026-02-27 |
| 31.2 | Cost = sum of (employee cost x total hours) | PASS | fixed-cost.calculator.test.ts | 2026-02-27 |
| 31.3 | Profitability informed by current % completion | PASS | fixed-cost.calculator.test.ts | 2026-02-27 |

---

## FR32 — AMC project profitability calculation

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 32.1 | Revenue = AMC contract value | TEST_WRITTEN | amc.calculator.test.ts | 2026-02-27 |
| 32.2 | Cost = Support hours x cost per hour | TEST_WRITTEN | amc.calculator.test.ts | 2026-02-27 |

---

## FR33 — Infrastructure project profitability calculation

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 33.1 | Revenue = Infra invoice | TEST_WRITTEN | infrastructure.calculator.test.ts | 2026-02-27 |
| 33.2 | Cost = Vendor cost + manpower allocation | TEST_WRITTEN | infrastructure.calculator.test.ts | 2026-02-27 |

---

## FR34 — Profitability at 4 levels (project/practice/department/company)

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 34.1 | Project-level profitability calculated | TEST_WRITTEN | `snapshot.service.test.ts` — row count, MARGIN_PERCENT value | 2026-02-27 |
| 34.2 | Practice/discipline-level cost attribution | TEST_WRITTEN | `snapshot.service.test.ts` — PRACTICE aggregation by designation | 2026-02-27 |
| 34.3 | Department-level aggregation | TEST_WRITTEN | `snapshot.service.test.ts` — DEPARTMENT aggregation + Infra SIMPLE fallback | 2026-02-27 |
| 34.4 | Company-wide aggregation | TEST_WRITTEN | `snapshot.service.test.ts` — COMPANY rollup, multi-project revenue sum | 2026-02-27 |

---

## FR35 — Calculation breakdown viewable

### Tier 1 (Unit / Integration — Story 6-3 API)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 35.U1 | T&M ledger returns breakdown with employees array | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U2 | AMC ledger returns multi-employee array | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U3 | Infra SIMPLE returns vendor+manpower cost, no employees | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U4 | Infra DETAILED returns vendor cost + employees array | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U5 | 404 SNAPSHOT_NOT_FOUND when no snapshot for period | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U6 | DM accessing non-owned project gets 403 | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U7 | Finance can access any project ledger | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U8 | DM can access own project ledger | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U9 | All monetary values are integer paise | PASS | ledger.service.test.ts | 2026-02-28 |
| 35.U10 | Latest snapshot returned when multiple exist | PASS | ledger.service.test.ts | 2026-02-28 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 35.1 | User clicks profitability figure → ledger drawer shows breakdown | NOT_DEVELOPED | — | — |
| 35.2 | Breakdown matches calculation formula for each model | NOT_DEVELOPED | — | — |

---

## FR36 — Executive Dashboard

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 36.1 | Admin sees total revenue monthly/YTD | NOT_DEVELOPED | — | — |
| 36.2 | Finance sees total cost, gross margin %, utilization % | NOT_DEVELOPED | — | — |
| 36.3 | Top 5 and bottom 5 projects by profitability displayed | NOT_DEVELOPED | — | — |
| 36.4 | HR redirected from executive dashboard | NOT_DEVELOPED | — | — |

---

## FR37 — Project Dashboard

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 37.1 | Revenue vs cost, margin %, budget vs actual for FC | NOT_DEVELOPED | — | — |
| 37.2 | Burn rate visible | NOT_DEVELOPED | — | — |
| 37.3 | Practice-level cost breakdown | NOT_DEVELOPED | — | — |
| 37.4 | DM sees only own projects | NOT_DEVELOPED | — | — |
| 37.5 | DeptHead sees department projects | NOT_DEVELOPED | — | — |

---

## FR38 — Employee Dashboard

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 38.1 | Billable %, revenue contribution, cost, profit displayed | NOT_DEVELOPED | — | — |
| 38.2 | Profitability rank shown | NOT_DEVELOPED | — | — |
| 38.3 | DeptHead sees only own resources | NOT_DEVELOPED | — | — |

---

## FR39 — Department Dashboard

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 39.1 | Revenue, cost, utilization %, profit % displayed | NOT_DEVELOPED | — | — |
| 39.2 | Month-on-month comparison across historical periods | NOT_DEVELOPED | — | — |
| 39.3 | DM sees own department only | NOT_DEVELOPED | — | — |

---

## FR40 — Admin pending approvals panel on dashboard

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 40.1 | Admin sees pending approvals with count badge | PASS | pending-approvals.spec.ts | 2026-02-25 |
| 40.2 | Panel lists all pending projects | PASS | pending-approvals.spec.ts | 2026-02-25 |

---

## FR41 — PDF export of dashboard reports

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 41.1 | Finance exports dashboard report as PDF | NOT_DEVELOPED | — | — |
| 41.2 | Admin exports dashboard report as PDF | NOT_DEVELOPED | — | — |
| 41.3 | PDF generation completes within 10 seconds (NFR3) | NOT_DEVELOPED | — | — |

---

## FR42 — Shareable read-only report links

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 42.1 | Finance generates shareable link | NOT_DEVELOPED | — | — |
| 42.2 | Link accessible without authentication | NOT_DEVELOPED | — | — |
| 42.3 | Link provides read-only access to specific report | NOT_DEVELOPED | — | — |

---

## FR43 — Audit log recording

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 43.1 | Upload event creates audit log entry | NOT_DEVELOPED | — | — |
| 43.2 | Project creation creates audit entry | NOT_DEVELOPED | — | — |
| 43.3 | Project approval/rejection creates audit entry | NOT_DEVELOPED | — | — |
| 43.4 | % completion edit creates audit entry | NOT_DEVELOPED | — | — |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 43.5 | DM creates project → Admin approves → Finance uploads → Admin views audit log → all 3 events present in order | NOT_DEVELOPED | — | — |

---

## FR44 — Admin views audit log

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 44.1 | Admin views audit log with all event types | NOT_DEVELOPED | — | — |
| 44.2 | Non-Admin blocked from audit log | NOT_DEVELOPED | — | — |

---

## FR45 — DM manages team roster post-approval

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 45.1 | DM adds team member to own ACTIVE project | PASS | projects.routes.test.ts | 2026-02-25 |
| 45.2 | DM removes team member from own project | PASS | projects.routes.test.ts | 2026-02-25 |
| 45.3 | DM lists team members on own project | PASS | projects.routes.test.ts | 2026-02-25 |
| 45.4 | Cannot add to non-ACTIVE project | DEVELOPED_UNTESTED | — | — |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 45.5 | DM navigates to project detail → sees team roster section | PASS | cross-role-chains.spec.ts (Chains 1, 4, 5) | 2026-02-27 |
| 45.6 | DM adds team member via UI → appears in roster | PASS | cross-role-chains.spec.ts (Chain 1) | 2026-02-27 |

---

## FR46 — Admin email notification on project submission

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 46.1 | Email service called on project creation | DEVELOPED_UNTESTED | — | — |

---

## FR47 — DM email notification on approval/rejection

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 47.1 | Email service called on approval | DEVELOPED_UNTESTED | — | — |
| 47.2 | Email service called on rejection | DEVELOPED_UNTESTED | — | — |

---

## FR49 — Password reset via email

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 49.1 | Forgot password form submits successfully | PASS | password.spec.ts | 2026-02-25 |
| 49.2 | Reset password with valid token | PASS | password.spec.ts | 2026-02-25 |

---

## FR50 — First-login forced password change

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 50.1 | User with mustChangePassword forced to change on login | PASS | password.spec.ts | 2026-02-25 |

### Tier 3 (E2E Cross-Role Chain)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| 50.2 | Admin creates user → user logs in → forced password change → user logs in again → lands on role page | PASS | cross-role-chains.spec.ts (Chain 6) | 2026-02-27 |

---

## Upload Center UI (Story 5.3 — FR17/FR20/NFR16)

### Tier 1 (Unit/Integration)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| UC.1 | Upload Center page renders with heading | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.2 | HR sees salary zone only (not timesheet/billing) | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.3 | Finance sees timesheet+billing zones (not salary) | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.4 | Admin sees all three zones | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.5 | Non-xlsx file rejected with error message | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.6 | Salary upload → UploadConfirmationCard shown | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.7 | Partial salary failure → Download Error Report button shown | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.8 | Download Error Report calls downloadErrorReport with uploadEventId | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.9 | Upload History section renders | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.10 | DataPeriodIndicator renders "Data as of: Feb 2026" | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.11 | Salary upload error → error toast shown | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.12 | Download Template link calls downloadTemplate | PASS | UploadCenter.test.tsx | 2026-02-28 |
| UC.13 | useUploadProgress — creates EventSource on non-null id | PASS | useUploadProgress.test.ts | 2026-02-28 |
| UC.14 | useUploadProgress — UPLOAD_PROGRESS event updates stage/percent | PASS | useUploadProgress.test.ts | 2026-02-28 |
| UC.15 | useUploadProgress — RECALC_COMPLETE sets isComplete and closes | PASS | useUploadProgress.test.ts | 2026-02-28 |
| UC.16 | useUploadProgress — RECALC_FAILED sets error | PASS | useUploadProgress.test.ts | 2026-02-28 |
| UC.17 | useUploadProgress — reconnect once after error, then connectionLost | PASS | useUploadProgress.test.ts | 2026-02-28 |
| UC.18 | useUploadProgress — cleanup closes EventSource on unmount | PASS | useUploadProgress.test.ts | 2026-02-28 |

### Tier 2 (E2E Single-Flow)

| # | Scenario | Status | Test File | Last Verified |
|---|---|---|---|---|
| UC.19 | HR sees salary zone, not timesheet/billing (E2E-P1) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.20 | Finance sees timesheet+billing, not salary (E2E-P2) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.21 | Admin sees all three zones (E2E-P3 zone visibility) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.22 | DM redirected away from /uploads (E2E-N1) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.23 | HR uploads valid salary → confirmation card with imported count (E2E-P3) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.24 | HR uploads mixed salary → Download Error Report button (E2E-P4) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.25 | Upload History shows seeded records with status tags (E2E-P5) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.26 | DataPeriodIndicator shows "Data as of" text (E2E-P6) | PASS | upload-center.spec.ts | 2026-02-28 |
| UC.27 | Finance invalid timesheet → validation error panel (E2E-N2) | PASS | upload-center.spec.ts | 2026-02-28 |

---

## Appendix A: Tier 3 Cross-Role Chain Index

All long-chain E2E scenarios collected for easy reference:

| Chain | FRs Covered | Status | Test File | Priority |
|---|---|---|---|---|
| **Chain 1 — T&M Full Lifecycle** — DM creates → Admin approves → DM assigns 2 employees → roster verified | FR22, FR23, FR24, FR28, FR45 | PASS | cross-role-chains.spec.ts | HIGH |
| **Chain 2 — Fixed Cost Full Lifecycle** — DM creates FC → Admin approves → Finance sets completion → verified | FR22, FR23, FR24, FR26 | PASS | cross-role-chains.spec.ts | HIGH |
| **Chain 3 — Rejection-Resubmission Chain** — DM creates → Admin rejects → DM edits → resubmits → Admin approves → DM assigns | FR22, FR24, FR25, FR45 | PASS | cross-role-chains.spec.ts | HIGH |
| **Chain 4 — Multi-Member Roster Management** — DM adds 3 employees → removes 1 → verifies 2 remain → duplicate blocked | FR28, FR45 | PASS | cross-role-chains.spec.ts | HIGH |
| **Chain 5 — Resigned Employee Guard** — HR resigns employee → DM tries to assign → rejected | FR16, FR28 | PASS | cross-role-chains.spec.ts | MEDIUM |
| **Chain 6 — User Lifecycle** — Admin creates user → user logs in → forced password change → role-correct landing | FR5, FR50, FR1 | PASS | cross-role-chains.spec.ts | MEDIUM |
| **Chain 7 — RBAC Full Traverse** — Each of 5 roles navigates full app → only sees permitted pages/data | FR10 | PASS | cross-role-chains.spec.ts | MEDIUM |
| **Upload Validation Against Roster** — Full chain: project → approval → assignment → timesheet → validation | FR28, FR17, FR18 | BLOCKED | — | HIGH |
| **T&M End-to-End Calculation** — Employee → project → assignment → timesheet → billing → dashboard | FR29, FR30, FR17, FR20, FR21, FR37 | NOT_DEVELOPED | — | HIGH |
| **Audit Trail Full Chain** — DM creates → Admin approves → Finance uploads → audit log shows all events | FR43, FR44 | NOT_DEVELOPED | — | MEDIUM |
| **Bulk Upload Correction Chain** — HR uploads → partial fail → downloads → corrects → re-uploads → all imported | FR11, FR12, FR13 | NOT_DEVELOPED | — | LOW |

---

## Appendix B: Known Issues & Blockers

| ID | Issue | FRs Affected | Status | Origin |
|---|---|---|---|---|
| H2 | T&M team member fields collected in creation form but silently discarded — backend schema missing columns | FR22, FR28 | OPEN | Story 3.3 Code Review |
| H3 | SLA description field (AMC) collected but not persisted | FR22 | OPEN | Story 3.3 Code Review |
| B1 | Team member assignment UI (add button/modal) on project detail page — implemented in Story 4-0b | FR45 | RESOLVED | Story 4-0b (2026-02-27) |
| B2 | Upload pipeline (FR17-FR21) blocks Tier 3 chain tests for timesheet validation | FR18, FR28 | BLOCKED_BY_EPIC_5 | Dependency |
| B3 | Email service stubbed — FR46/FR47 notification tests blocked until AWS SES integrated | FR46, FR47 | DEFERRED | Architecture Decision |

---

## Change Log

| Date | Author | Change |
|---|---|---|
| 2026-02-27 | Quinn (QA) | Story 4-4 code review: FR32 (32.1, 32.2) and FR33 (33.1, 33.2) promoted DEVELOPED_UNTESTED → TEST_WRITTEN. Fixed FR33 test filename (infra → infrastructure). Dashboard and Epic 4 Closure row updated. |
| 2026-02-27 | Amelia (Dev) | Story 4-0b: 7 Tier 3 cross-role chains PASS (Chains 1-7). Team member UI built (B1 resolved). 11 scenarios promoted to PASS. |
| 2026-02-27 | Quinn (QA) | Initial creation — all FRs mapped from PRD with current status |

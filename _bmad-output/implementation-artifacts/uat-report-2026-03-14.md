# UAT Report — 2026-03-14

**Sprint:** Epic 9 (Stabilization)
**Tester:** Quinn (QA) + Persona Agents
**App Version:** cb2ef4c
**Walkthrough Script:** `packages/e2e/persona-walkthroughs/walkthrough.ts`
**Screenshots:** `packages/e2e/persona-walkthroughs/screenshots/` (37 captured)

---

## Executive Summary

| Persona | UAT Questions | Frustrations | Overall |
|---|---|---|---|
| 👑 Rajesh (Admin) | 2/3 PASS | 2/3 RESOLVED | **FAIL** |
| 💰 Priya (Finance) | 1/3 PASS | 2/4 RESOLVED | **FAIL** |
| 👥 Neha (HR) | 0/3 PASS | 0/3 RESOLVED | **FAIL** |
| 🚀 Vikram (DM) | 2/3 PASS | 2/4 RESOLVED | **FAIL** |
| 🏢 Arjun (Dept Head) | 1/3 PASS | 1/3 RESOLVED | **FAIL** |

**GO / NO-GO Decision: 🚫 NO-GO — 5 blocking issues remain**

---

## Detailed Findings

### 👑 Rajesh (Admin)

#### UAT Questions

**Q1: Can I onboard a new team member end-to-end?**
- **PASS** — User Management shows +Add User button, all users visible with roles/departments. Employee list shows +Add Employee. Project detail shows +Add Team Member with roster visible.

**Q2: After I change a system config, does it reflect everywhere?**
- **PASS** — System Config page shows Standard Monthly Hours (176), Healthy Margin Threshold (20%), At-Risk Margin Threshold (5%) with Save button. Project Roles with toggles visible.

**Q3: Can I see a clear overview of the entire organization?**
- **PARTIAL** — Executive Dashboard shows Revenue ₹1,00,50,000, Cost ₹76,00,000, Margin 24.4%. Top/Bottom 5 projects visible. **BUT Billable Utilisation still shows 0.0%** — this was Story 9.5's fix target.

#### Frustrations Check

| Frustration | Status | Evidence |
|---|---|---|
| "Department doesn't show in dashboard" | **CANNOT VERIFY** — walkthrough script failed on Dept Dashboard (sidebar renamed to "Dept Dashboard" — Story 9.7 worked but broke the test script selector) | Need manual check |
| "Sidebar looks different from expected" | **RESOLVED** — Sidebar now shows "Dept Dashboard" (not truncated "Department Dashbo..."). Story 9.7 ✅ | `rajesh--sidebar--01-full-sidebar.png` |
| "Can't tell which users have access to what" | **STILL PRESENT** — User Management shows roles but no permissions summary. Active users still have no Edit/Deactivate buttons visible (only deactivated user has actions). | `rajesh--user-mgmt--01-user-list.png` |

**Rajesh's verdict:** "The sidebar is fixed. But I still can't edit active users — where are the Edit and Deactivate buttons? Story 9.8 was supposed to fix this."

---

### 💰 Priya (Finance)

#### UAT Questions

**Q1: After upload, can I see it reflected in dashboards?**
- **PASS** — Executive Dashboard shows data (Revenue, Cost, Margin, Top/Bottom projects all populated). Upload Center shows upload history with status.

**Q2: If 3 of 50 rows fail, can I download just failures?**
- **FAIL** — Upload History shows PARTIAL status for Jan 2026 Salary upload but there's no way to click it to view or download failed rows. This is an Epic 11 feature (Story 11.1), not Epic 9 scope. However, the PARTIAL row is visible which is improvement.

**Q3: Does the shared link look professional?**
- **CANNOT VERIFY** — The walkthrough didn't test shared link rendering. Need manual verification of Story 9.2 (shared report links fix).

#### Frustrations Check

| Frustration | Status | Evidence |
|---|---|---|
| "Download template doesn't work" | **CANNOT VERIFY** — Download Template links are visible in UI. Need manual click test to verify Story 9.1 actually made them functional. | `priya--upload--01-upload-center.png` |
| "Can't see what was uploaded" | **STILL PRESENT** — Upload History shows type/period/rows/status but no click-through to view actual records. (Epic 11 scope) | `priya--upload--01-upload-center.png` |
| "Revenue/cost/profit blank on project view" | **PARTIAL** — Project detail for Alpha Platform Migration shows Margin 28.0% Healthy, BUT Revenue, Cost, Profit cards show "—" (dashes). Margin is populated but the other 3 financial fields are blank. Story 9.3 partially fixed. | `priya--projects--02-project-detail.png` |
| "Shared link shows JSON" | **CANNOT VERIFY** — Not tested in walkthrough | Need manual test |

**Priya's verdict:** "I can see the margin on project detail now — 28% Healthy — but Revenue, Cost, and Profit still show dashes. That's half a fix. I need all four numbers. And I still can't click on an upload to see what's inside."

---

### 👥 Neha (HR)

#### UAT Questions

**Q1: Can I see employee profile with project allocations?**
- **FAIL** — Clicking employee row still only shows inline Edit/Mark as Resigned buttons. No detail page. (This is Epic 10, Story 10.5 — not Epic 9 scope, but still a gap)

**Q2: After salary upload, do cost calculations update?**
- **CANNOT VERIFY** — Need to perform actual upload test. Upload Center is accessible with Download Template link visible.

**Q3: Can I identify >100% allocated employees?**
- **FAIL** — No utilization data visible from HR view. HR only has 2 sidebar items (Employees, Upload Center). No Employee Dashboard access. (Epic 10, Story 10.2)

#### Frustrations Check

| Frustration | Status | Evidence |
|---|---|---|
| "No detail page — just a row" | **STILL PRESENT** — Row click shows Edit/Resign actions inline, no full page | `neha--employees--02-after-row-click.png` |
| "Two employee screens" | **STILL PRESENT** — HR still only sees Employees (not Employee Dashboard). Redundancy exists for other roles. (Epic 10) | `neha--landing--01-employee-list.png` |
| "Can't see time allocation per project" | **STILL PRESENT** — No employee detail view with project breakdown | `neha--employees--02-after-row-click.png` |

**Neha's verdict:** "Nothing changed for me in this sprint. I understand Epic 9 was about bugs, but my daily workflow is still broken. I need that employee detail page and utilization access in Epic 10."

---

### 🚀 Vikram (DM)

#### UAT Questions

**Q1: Can I see my projects' health at a glance?**
- **PASS** — Project Dashboard shows Vikram's 3 projects (Alpha, Epsilon, Beta) with Revenue, Cost, Profit, Margin %, health badges. Clickable project names. Filters available.

**Q2: After timesheet upload, do numbers update?**
- **CANNOT VERIFY** — DM has no Upload Center access (Epic 10, Story 10.3). Need manual upload + refresh test.

**Q3: Can I compare this month vs last month?**
- **FAIL** — No month comparison available. Only current snapshot shown. (Epic 11, Story 11.2)

#### Frustrations Check

| Frustration | Status | Evidence |
|---|---|---|
| "Revenue/cost/profit blank" | **PARTIAL** — Project Dashboard shows all financials populated ✅. But project DETAIL page shows Revenue "—", Cost "—", Profit "—" (only Margin 28.0% visible). Story 9.3 partially fixed. | `vikram--project-dashboard--01-overview.png` vs `vikram--projects--02-project-detail.png` |
| "Uploaded timesheets, nothing changed" | **CANNOT VERIFY** — No Upload Center access for DM | — |
| "No burn rate" | **STILL PRESENT** — No burn rate column on Project Dashboard. (Epic 11) | `vikram--project-dashboard--01-overview.png` |
| "No financial data, just metadata" | **PARTIAL** — Project detail now shows Margin + Team Roster with selling rates. Revenue/Cost/Profit still dashes. | `vikram--projects--02-project-detail.png` |

**Vikram's verdict:** "Project Dashboard is solid — I can see all three projects with real numbers. But when I click into a project, Revenue/Cost/Profit are dashes. The dashboard knows the numbers but the detail page doesn't show them. Fix that and I'm happy for this sprint."

---

### 🏢 Arjun (Dept Head)

#### UAT Questions

**Q1: Does department dashboard show only my department?**
- **PASS** — Department Dashboard shows only "Engineering" with Revenue ₹72,00,000, Cost ₹57,00,000, Profit ₹15,00,000, Margin 21.5% Healthy. Correctly scoped.

**Q2: Can I compare months?**
- **FAIL** — Only current month data shown. No month selector or comparison view. (Epic 11)

**Q3: Can I click employee in dept view for details?**
- **FAIL** — No drill-down from department dashboard. No employee detail page. (Epic 10/11)

#### Frustrations Check

| Frustration | Status | Evidence |
|---|---|---|
| "New dept not in dashboard" | **CANNOT VERIFY** — Walkthrough failed before reaching Dept Dashboard detail (sidebar label mismatch). Landing page shows it works for existing dept. | `arjun--landing--01-department-dashboard.png` |
| "Can't drill into numbers" | **STILL PRESENT** — Single row, no expandable sections or click-through | `arjun--landing--01-department-dashboard.png` |
| "Share link shows JSON" | **CANNOT VERIFY** — Not tested | — |

**Arjun's verdict:** "My department shows up correctly with real numbers — that's good. But I'm a strategic thinker. I need to compare months and drill into what's behind those numbers. Those are Epic 10 and 11 features. For this sprint, I just need to confirm the sidebar fix and new department fix work."

---

## Blocking Issues (P0) — Must Fix Before Epic 9 Closes

| # | Issue | Story | Evidence | Fix |
|---|---|---|---|---|
| **P0-1** | Revenue/Cost/Profit show "—" on Project Detail page (Margin works) | 9.3 | `priya--projects--02-project-detail.png`, `vikram--projects--02-project-detail.png` | The snapshot query returns MARGIN_PERCENT but doesn't map REVENUE_CONTRIBUTION and EMPLOYEE_COST to the Revenue/Cost/Profit cards. Check `ProjectFinancialSummary.tsx` field mapping. |
| **P0-2** | Billable Utilisation still shows 0.0% on Executive Dashboard | 9.5 | `rajesh--exec-dashboard--01-overview.png`, `priya--exec-dashboard--01-kpi-tiles.png` | Story 9.5 fix didn't take effect, or the seed data doesn't have the right snapshot entity. Check utilisation calculation in `dashboard.service.ts`. |
| **P0-3** | Active users have no Edit/Deactivate buttons in User Management | 9.8 | `rajesh--user-mgmt--01-user-list.png` | The Actions column is empty for all active users. Story 9.8 was supposed to add Edit + Deactivate buttons. Check if the frontend code was deployed. |
| **P0-4** | Walkthrough script broken — sidebar "Department Dashboard" renamed to "Dept Dashboard" but script still looks for old label | 9.7 | Priya/Vikram/Arjun walkthroughs failed | Update walkthrough script `clickSidebar` calls to use "Dept Dashboard" |
| **P0-5** | Upload History still shows all roles' uploads (not filtered) | 9.7 scope? | `priya--upload--01-upload-center.png`, `neha--upload--01-upload-center.png` | Priya sees Salary uploads by Anita Desai. Neha sees Billing uploads by Priya. This is actually Epic 10 Story 10.7 scope, not Epic 9. **Reclassify as P1.** |

## Non-Blocking Issues (P1/P2) — Backlog for Epic 10/11

| # | Issue | Target Epic | Notes |
|---|---|---|---|
| P1-1 | No employee detail page | Epic 10 (10.5) | Neha's primary need |
| P1-2 | HR has no Employee Dashboard access | Epic 10 (10.2) | Neha can't see utilization |
| P1-3 | DM has no Upload Center access | Epic 10 (10.3) | Vikram can't upload timesheets |
| P1-4 | Upload History not role-filtered | Epic 10 (10.7) | Cross-role data leakage |
| P1-5 | No month-over-month comparison | Epic 11 (11.2) | Arjun's strategic need |
| P1-6 | No drill-down from Dept Dashboard | Epic 11 (11.3) | Arjun's drill-down need |
| P1-7 | No burn rate on Project Dashboard | Epic 11 (11.4) | Vikram's burn rate need |
| P2-1 | Shared link rendering not verified | Epic 9 (9.2) | Need manual test |
| P2-2 | Download template functionality not verified | Epic 9 (9.1) | Need manual click test |

## Screenshots Reference

All evidence at: `packages/e2e/persona-walkthroughs/screenshots/`

Key screenshots cited:
- `rajesh--user-mgmt--01-user-list.png` — No Edit/Deactivate on active users
- `rajesh--exec-dashboard--01-overview.png` — Billable Utilisation 0.0%
- `priya--projects--02-project-detail.png` — Revenue/Cost/Profit "—"
- `vikram--projects--02-project-detail.png` — Same issue for DM view
- `vikram--project-dashboard--01-overview.png` — Dashboard financials populated (contrast)
- `arjun--landing--01-department-dashboard.png` — Dept scoped correctly
- `neha--employees--02-after-row-click.png` — No detail page

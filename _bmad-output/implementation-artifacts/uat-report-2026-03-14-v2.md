# UAT Report v2 — 2026-03-14

**Sprint:** Epic 9 + Story 10.0 (UAT Fixes)
**Tester:** Quinn (QA) + Persona Agents
**App Version:** post-10.0 implementation
**Previous UAT:** uat-report-2026-03-14.md (3 P0s found)

---

## Executive Summary

| Persona | UAT Questions | Frustrations | Overall |
|---|---|---|---|
| 👑 Rajesh (Admin) | 2/3 PASS | 3/3 RESOLVED | **PASS** |
| 💰 Priya (Finance) | 1/3 PASS | 2/4 RESOLVED | **FAIL** |
| 👥 Neha (HR) | 0/3 PASS | 0/3 RESOLVED | **FAIL** (expected — Epic 10 scope) |
| 🚀 Vikram (DM) | 2/3 PASS | 2/4 RESOLVED | **FAIL** |
| 🏢 Arjun (Dept Head) | 1/3 PASS | 2/3 RESOLVED | **PASS** |

**GO / NO-GO Decision: 🚫 NO-GO — 2 P0 fixes did not land**

---

## P0 Fix Verification (Story 10.0)

| P0 | Issue | Status | Evidence |
|---|---|---|---|
| **P0-1** | Revenue/Cost/Profit "—" on Project Detail | **NOT FIXED** ❌ | `vikram--projects--02-project-detail.png` — Revenue, Cost, Profit still show dashes. Margin 28.0% works. |
| **P0-2** | Billable Utilisation 0.0% | **NOT FIXED** ❌ | `priya--exec-dashboard--01-kpi-tiles.png` — Still shows 0.0% |
| **P0-3** | No Edit/Deactivate on active users | **FIXED** ✅ | `rajesh--user-mgmt--01-user-list.png` — All active users show Edit + Deactivate. Self-row shows Edit only. |

---

## Improvements Since Last UAT

| Item | Status | Evidence |
|---|---|---|
| Walkthrough script sidebar fix | **FIXED** ✅ | All 5 personas completed — 44 screenshots, zero failures |
| Arjun "No projects found" (Story 9.6) | **FIXED** ✅ | `arjun--projects--01-project-list.png` — 5 projects with full financials visible |
| Sidebar truncation (Story 9.7) | **FIXED** ✅ | "Dept Dashboard" label renders correctly |
| Active user actions (Story 9.8 / P0-3) | **FIXED** ✅ | Edit + Deactivate on all active users, Edit only on self |

---

## Remaining Blocking Issues

| # | Issue | Root Cause | Action |
|---|---|---|---|
| **P0-1** | Revenue/Cost/Profit dashes on Project Detail | `ProjectFinancialSummary.tsx` reads `financials.revenuePaise` etc. but the backend `getById` only returns `marginPercent` from MARGIN_PERCENT snapshots — doesn't query REVENUE_CONTRIBUTION or EMPLOYEE_COST figure types | Fix backend query in `project.service.ts` to also extract REVENUE_CONTRIBUTION → revenuePaise and EMPLOYEE_COST → costPaise. Profit = revenue - cost. |
| **P0-2** | Billable Utilisation 0.0% | The utilisation value is likely not being calculated during recalculation, or the dashboard query reads a snapshot type that doesn't exist | Debug `dashboard.service.ts` utilisation query. Check if UTILISATION figure type exists in snapshots or if it needs on-the-fly calculation from timesheetEntry. |

---

## Neha/Vikram Known Gaps (Epic 10/11 Scope — Not Blocking Epic 9)

These are expected to fail — they're future sprint scope:
- Neha: No employee detail page, no Employee Dashboard access, no utilization visibility
- Vikram: Project detail financials broken (P0-1), no month comparison, no burn rate
- Priya: Upload record detail view, upload history role filtering

---

## Screenshots Reference

All 44 screenshots at: `packages/e2e/persona-walkthroughs/screenshots/`

Key evidence:
- `rajesh--user-mgmt--01-user-list.png` — P0-3 FIXED ✅
- `arjun--projects--01-project-list.png` — Arjun sees projects ✅
- `vikram--projects--02-project-detail.png` — P0-1 NOT FIXED ❌
- `priya--exec-dashboard--01-kpi-tiles.png` — P0-2 NOT FIXED ❌

# UAT Report — Browser-Based Persona Testing
**Date:** 2026-03-15
**Method:** 5 persona agents with live browser walkthroughs (agent-browser)
**App:** http://localhost:5173 (backend :3000)

---

## Scoreboard

| Agent | Role | Login | PASS | PARTIAL | FAIL |
|-------|------|-------|------|---------|------|
| Rajesh | Admin | admin@ipis.test | 12 | 1 | 1 |
| Arjun | Dept Head | depthead@ipis.test | 8 | 1 | 1 |
| Vikram | Delivery Manager | dm1@ipis.test | 6 | 3 | 1 |
| Priya | Finance | finance@ipis.test | 7 | 5 | 1 |
| Neha | HR | hr@ipis.test | 2 | 5 | 3 |

---

## P0 — CRITICAL (System-Wide)

### 1. Billable Utilisation 0.0% everywhere
- **Flagged by:** ALL 5 agents
- **Impact:** Entire utilization feature broken — Executive Dashboard, Employee Dashboard, Employee Detail, Department Drill-Down all show 0.0%
- **Root cause:** Calculation engine not computing hours from uploaded timesheet data into utilization snapshots
- **Affected pages:** Executive Dashboard, Employee Dashboard, Employee Detail (month-by-month), Department Drill-Down

### 2. Employee Detail page unreachable from UI
- **Flagged by:** Rajesh (Admin), Neha (HR), Priya (Finance)
- **Impact:** Route exists at `/dashboards/employees/:id` but `<a>` tags have empty `href` and onClick handlers compiled as noop
- **File:** `packages/frontend/src/pages/dashboards/EmployeeDashboard.tsx` (line ~152)
- **Note:** Arjun (Dept Head) was able to reach employee detail — may be a role-specific rendering issue

### 3. Revenue total mismatch between dashboards
- **Flagged by:** Priya (Finance)
- **Impact:** Executive Dashboard shows Rs.1,00,50,000 total revenue, but Department Dashboard sums to Rs.1,13,00,000 (Rs.12,50,000 discrepancy)
- **Root cause:** Possible double-counting of employees assigned to projects across departments, or different aggregation logic between views
- **Trust impact:** Cannot send to CFO with conflicting numbers

---

## P1 — HIGH

### 4. Department drill-down broken for DM role
- **Flagged by:** Vikram (DM)
- **Impact:** Clicking "Delivery" department shows "No employees" and "No project assignments" despite having 41L revenue and active employees/projects
- **Note:** Works correctly for Admin and Dept Head roles — likely a query scoping issue for DM role

### 5. No Share Link for Dept Head role
- **Flagged by:** Arjun (Dept Head)
- **Impact:** Department Dashboard only has Export PDF, no Share Link button. Feature exists on Executive Dashboard for Finance/Admin but was not extended to Dept Heads.

### 6. HR blocked from Department Dashboard
- **Flagged by:** Neha (HR)
- **Impact:** Route guard at `packages/frontend/src/router/index.tsx` excludes HR from `/dashboards/department`
- **HR need:** View department-level utilization to identify stretched vs capacity teams

### 7. Upload history has no error detail drill-down
- **Flagged by:** Priya (Finance), Neha (HR)
- **Impact:** PARTIAL uploads don't explain which rows failed or why. No drawer, modal, or expandable row for error details.

### 8. Share Link gives no user feedback
- **Flagged by:** Rajesh (Admin)
- **Impact:** Clicking Share Link button produces no toast, modal, or confirmation. Users don't know if the link was generated.

### 9. Employee Detail missing salary/CTC for HR view
- **Flagged by:** Neha (HR)
- **Impact:** Read-only Employee Detail page doesn't show salary information, though the Edit modal does. HR needs salary visibility.

---

## P2 — MEDIUM

### 10. Inconsistent margin display for cost centers
- **Flagged by:** Priya (Finance)
- **Dept Dashboard:** Shows "N/A" for cost-center margins
- **Company Dashboard:** Shows "0.0% Low" for same departments

### 11. No "My Uploads" filter in upload history
- **Flagged by:** Vikram (DM)
- **Impact:** Shows all users' uploads with no way to filter to own uploads

### 12. Team allocation missing % and internal cost
- **Flagged by:** Vikram (DM)
- **Impact:** Project Team Roster shows selling rates but not allocation percentage or internal cost per member

### 13. No text search for employees
- **Flagged by:** Neha (HR)
- **Impact:** Only dropdown filters (Department, Designation), no ability to search by employee name

### 14. ON_HOLD displayed as raw enum
- **Flagged by:** Rajesh (Admin)
- **Impact:** Project list shows "ON_HOLD" instead of "On Hold" — all other statuses properly formatted

### 15. Floating-point precision in System Config
- **Flagged by:** Rajesh (Admin)
- **Impact:** DOM values show artifacts like 0.20000000298023224 for 20% threshold. Could cause data corruption on save.

### 16. Project Dashboard "Department" column confusing for Dept Head
- **Flagged by:** Arjun (Dept Head)
- **Impact:** Shows the project's owning department (Delivery), not the viewer's department (Engineering). Confusing context.

---

## What Works Well

- **Login & RBAC:** All 5 roles authenticate correctly and land on appropriate pages. Route guards correctly restrict access.
- **Project Financials:** Revenue, cost, margin, burn rate all populated on Project Detail and Project Dashboard (major improvement from earlier sprints).
- **Month-over-Month Comparison:** Date range picker with trend arrows works on Department Dashboard (Arjun PASS).
- **Department Drill-Down:** Works for Admin and Dept Head — shows employees and projects within department.
- **Shared Reports:** Professional rendering with banner, dates, and clean layout (no raw JSON). Priya PASS.
- **Client Dashboard:** Client-level profitability with expandable rows. All agents PASS.
- **Navigation Speed:** All key information reachable in 1-2 clicks (Vikram PASS).
- **Pending Approvals:** Badge count accurate, Approve/Reject actions visible (Rajesh PASS).
- **System Config:** 4 configurable values + project roles management (Rajesh PASS).

# Epic 12: Browser UAT Fixes — Zero Remaining Defects

## Goal

Address ALL 16 findings from the 2026-03-15 browser-based UAT session where 5 persona agents (Rajesh, Priya, Neha, Vikram, Arjun) tested the live application. No finding left unaddressed.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md`

## Exit Criteria

- All 5 persona agents re-run browser UAT and report zero FAILs
- All PARTIAL items resolved or explicitly accepted as out-of-scope with justification
- Revenue totals consistent across all dashboard views
- Utilisation data non-zero for billable employees with timesheet data
- Employee Detail page reachable via click from every role that has access

## Story Map

| Story | Title | Priority | UAT Items | Primary Personas |
|-------|-------|----------|-----------|-----------------|
| 12.1 | Fix Billable Utilisation 0.0% system-wide | P0 | #1 | All 5 |
| 12.2 | Fix Employee Detail page navigation | P0 | #2 | Rajesh, Neha, Priya |
| 12.3 | Fix revenue total mismatch between dashboards | P0 | #3 | Priya |
| 12.4 | Fix Department drill-down for DM role | P1 | #4 | Vikram |
| 12.5 | Share Link for Dept Head + toast feedback | P1 | #5, #8 | Arjun, Rajesh |
| 12.6 | HR access to Department Dashboard + salary on detail | P1 | #6, #9 | Neha |
| 12.7 | Upload history error detail drill-down verification | P1 | #7 | Priya, Neha |
| 12.8 | Upload history "My Uploads" filter | P2 | #11 | Vikram |
| 12.9 | Team allocation % and cost on project roster | P2 | #12 | Vikram |
| 12.10 | UI polish: search, enum format, float precision, dept column | P2 | #10, #13, #14, #15, #16 | All |

## Relationship to Previous Epics

Several of these items were attempted in Epic 11 stories (11-0 through 11-0d, 11-1) which are in "review" status. This epic supersedes those items with fresh fixes informed by actual browser testing. Epic 11 stories that passed UAT (11-2 through 11-8) are not re-addressed here.

| Epic 11 Story | Status | UAT Result | Epic 12 Replacement |
|---------------|--------|------------|---------------------|
| 11-0 (utilisation) | review | Still 0.0% | 12.1 |
| 11-0a (employee detail) | review | Still broken | 12.2 |
| 11-0b (cost-center margin) | review | Still inconsistent | 12.10 |
| 11-0c (dept column) | review | Still confusing | 12.10 |
| 11-0d (action buttons) | review | Not re-tested | N/A (accept if working) |
| 11-1 (upload detail) | review | Drawer not opening | 12.7 |

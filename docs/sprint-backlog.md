# Sprint Backlog — Post-Demo Stabilization & Completion

**Generated:** 2026-03-14
**Sources:** User demo feedback, persona agent walkthroughs (44 screenshots), original project brief gap analysis
**Process:** Per `docs/bmad-user-driven-development-playbook.md`

---

## Backlog Item Traceability

| ID | Finding | Source | Severity | Epic | Story | Persona(s) |
|---|---|---|---|---|---|---|
| B1 | Download template not working on Upload Center | User feedback P0-#1, Priya walkthrough | P0 | 9 | 9.1 | Priya, Neha |
| B2 | Shared links show raw JSON instead of formatted page | User feedback P0-#2, Priya/Arjun walkthrough | P0 | 9 | 9.2 | Priya, Arjun |
| B3 | Revenue/Cost/Profit blank on Project View for all projects | User feedback P0-#3, Vikram walkthrough | P0 | 9 | 9.3 | Vikram, Priya |
| B4 | New department not showing in Department Dashboard | User feedback P0-#4, Arjun walkthrough | P0 | 9 | 9.4 | Arjun |
| B5 | Employee screen vs Employee Dashboard — two redundant screens | User feedback P1-#5, Neha walkthrough | P1 | 10 | 10.4 | Neha, Rajesh |
| B6 | Project Role vs Department duplication — conceptually same thing | User feedback P1-#6 | P1 | 10 | 10.8 | Rajesh |
| B7 | Overengineered user roles — simplify to match brief's 5 roles | User feedback P1-#7, Neha/Vikram walkthrough | P1 | 10 | 10.1 | All |
| B8 | Sidebar "Pending Approval" blue background looks bad | User feedback P1-#8, screenshots | P3 | 9 | 9.7 | Rajesh |
| B9 | No employee detail full-page view (profile + project allocations) | User feedback P2-#9, Neha walkthrough | P1 | 10 | 10.5 | Neha |
| B10 | No upload record visibility — can't view rows, failures, reasons | User feedback P2-#10, Priya walkthrough | P2 | 11 | 11.1 | Priya, Neha |
| B11 | Missing Excel templates for Employee Master and Monthly Timesheet | User feedback P2-#11, original brief input spec | P2 | 9 | 9.1 | Priya, Neha |
| B12 | Billable Utilisation shows 0.0% on Executive Dashboard | Persona walkthrough finding | P1 | 9 | 9.5 | Priya, Rajesh |
| B13 | HR role has no Employee Dashboard or utilization access | Persona walkthrough finding, brief says HR sees Utilization | P1 | 10 | 10.2 | Neha |
| B14 | DM project list shows ALL projects, not filtered to "MY projects" | Persona walkthrough finding | P2 | 10 | 10.6 | Vikram |
| B15 | Upload History not filtered by role — users see other roles' uploads | Persona walkthrough finding | P2 | 10 | 10.7 | Priya, Neha |
| B16 | No month-over-month comparison on Department Dashboard | Persona walkthrough, brief requires "Comparison by month" | P2 | 11 | 11.2 | Arjun |
| B17 | No drill-down from Department Dashboard to employees/projects | Persona walkthrough finding | P2 | 11 | 11.3 | Arjun |
| B18 | DM has no Upload Center access — can't upload timesheets | Persona walkthrough, brief says DM uploads timesheets | P1 | 10 | 10.3 | Vikram |
| B19 | No burn rate on Project Dashboard | Persona walkthrough, brief requires Burn Rate | P2 | 11 | 11.4 | Vikram |
| B20 | Dept Head sees "No projects found" on Projects page | Persona walkthrough finding — bug | P1 | 9 | 9.6 | Arjun |
| B21 | No Edit/Deactivate action on active users in User Management | Persona walkthrough finding | P3 | 9 | 9.8 | Rajesh |
| B22 | Sidebar label "Department Dashbo..." truncated | Persona walkthrough finding | P3 | 9 | 9.7 | Rajesh, Arjun |
| B23 | Active projects should sort before ON_HOLD/COMPLETED | Persona walkthrough finding | P3 | 9 | 9.7 | Priya, Vikram |
| B24 | Budget vs Actual missing for Fixed Cost projects | Original brief: Project Dashboard requirement | P2 | 11 | 11.5 | Vikram, Priya |
| B25 | Employee Profitability Rank missing from Employee Dashboard | Original brief: Employee Dashboard requirement | P3 | 11 | 11.6 | Neha |
| B26 | Client-wise profitability view not implemented | Original brief: stated objective | P3 | 11 | 11.7 | Priya |
| B27 | Overhead cost not configurable (brief specifies 180K/yr per employee) | Original brief: Calculation logic | P3 | 11 | 11.8 | Rajesh |
| B28 | Standard Working Hours default 176 but brief says 160 | Original brief: default 160 hrs | P3 | 11 | 11.8 | Rajesh |

---

## Epic Summary

| Epic | Name | Stories | Focus | Exit Criteria |
|---|---|---|---|---|
| **9** | Stabilization | 8 stories | Fix all P0 bugs, UI polish | All 5 persona UATs pass on existing features |
| **10** | Consolidation | 8 stories | Simplify RBAC, merge screens, fix permissions | Each persona completes full daily workflow, no dead ends |
| **11** | Brief Completion | 8 stories | Add missing dashboard features from original brief | Brief requirements 100% covered, full persona UAT pass |

---

## Per-Story Process (Mandatory)

```
1. PM writes story → assigns primary persona owner
2. /bmad-agent-ipis-[persona] → [RS] Review Story → must PASS
3. Dev implements in vertical slice (API + UI together)
4. Dev self-tests as target persona role in browser
5. Dev verifies cross-feature impact
6. QA writes persona journey test (named by user task, not API)
7. /bmad-agent-ipis-[persona] → [WT] Walk Through Feature
8. Code review
9. Update sprint-status.yaml
```

## Per-Sprint Completion (Mandatory)

```
1. Run full E2E test suite (pnpm test:e2e)
2. Run persona walkthroughs (headed mode) for affected personas
3. /bmad-party-mode → all persona agents → UAT review
4. Each persona runs [UAT] → any FAIL = P0 bug → fix before sprint closes
5. Retrospective
```

---

## Persona Walkthrough Evidence

Screenshots from the 2026-03-14 walkthrough session are stored at:
`packages/e2e/persona-walkthroughs/screenshots/` (44 screenshots across all 5 personas)

The walkthrough script is reusable for future sprints:
`packages/e2e/persona-walkthroughs/walkthrough.ts`

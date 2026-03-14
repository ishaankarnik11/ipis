# IPIS User Feedback — Actionables

**Source:** Demo feedback from users (2026-03-14)
**Status:** Pending stabilization sprint

---

## P0 — Bugs (Broken functionality)

| # | Issue | Detail | Action |
|---|---|---|---|
| 1 | Download template not working | Upload Central download template button is non-functional | Fix endpoint — likely missing static asset or wrong MIME type |
| 2 | Shared links show raw JSON | All dashboard share links render JSON instead of a formatted page | Create a proper read-only report render view for shared tokens |
| 3 | Revenue/Cost/Profit blank on Project View | All projects show blank financials | Trace data flow: upload → calculation snapshot → project view query |
| 4 | New department not in Department Dashboard | Adding a department via admin doesn't reflect in dashboard | Fix dashboard query to include newly created departments |

---

## P1 — Consolidation (Simplify & fix confusion)

| # | Issue | Detail | Action |
|---|---|---|---|
| 5 | Employee screen vs Employee Dashboard redundancy | Two nearly identical screens — confusing for users | Remove standalone Employee screen. Keep Employee Dashboard as the single entry point. Move all CTAs (edit, view details, etc.) into the dashboard |
| 6 | Project Role vs Department duplication | Roles and departments are managed separately but conceptually linked — people work in departments | Consolidate: a project role should derive from department assignment. Remove separate role management UI if redundant |
| 7 | Overengineered user roles | Current RBAC is more complex than what the brief specifies | Simplify to match the 5 roles in the original brief: Admin (Full access), Finance (Revenue & Cost), Delivery Manager (Project-level), Department Head (Dept view), HR (Salary + Utilization). Audit current permission matrix against this |
| 8 | Sidebar "Pending Approval" styling | Blue background on dark sidebar looks bad | Change to subtle badge/count indicator instead of background color |

---

## P2 — Missing Features (New functionality needed)

| # | Issue | Detail | Action |
|---|---|---|---|
| 9 | No employee detail full-page view | Clicking an employee shows only a table row — no drill-down | Create full employee detail page showing: profile info, all project assignments, % time allocation per project, links to each project |
| 10 | No upload record visibility | Upload Central grid shows uploads happened but not what was in them | Add: click upload row → view all records → filter by success/failed → download failed records as file with "Reason" column |
| 11 | Excel templates for Employee Master and Monthly Timesheet | Templates exist for revenue but not for other upload types | Create downloadable Excel templates for Employee Master and Monthly Timesheet matching the input data spec from the brief |

---

## Process Improvements (Captured separately)

| Item | Location |
|---|---|
| Ideal development approach (project-agnostic) | `docs/bmad-user-driven-development-playbook.md` |
| IPIS-specific lessons learned | `docs/ideal-project-development-approach.md` |
| User persona definitions | `docs/user-persona-agents.md` |
| Updated Definition of Done | Included in playbook |

---

## Next Steps

1. **Install BMad Builder (BMB) module** — Dell is doing this now
2. **Create User Persona Agents** — 5 BMAD agents (Rajesh, Priya, Neha, Vikram, Arjun) as `.agent.yaml` files
3. **Stabilization Sprint** — Address all P0 → P1 → P2 items above using the new persona-driven process
4. **UAT with Persona Agents** — Validate fixes from each user role's perspective before marking done

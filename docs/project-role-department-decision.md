# Project Role / Department / Designation — Design Decision

**Story:** 10.8 — Project Role ↔ Department Consolidation Review
**Date:** 2026-03-15
**Status:** DECIDED

## Current State

The system has three related but distinct concepts:

| Concept | Storage | Scope | Purpose |
|---------|---------|-------|---------|
| **ProjectRole** | `project_roles` table (managed list) | System-wide | Roles available for project team member assignment (e.g., Developer, Tech Lead, Architect) |
| **Designation** | `employees.designation` column (free text) | Per-employee | Employee's organizational job title (e.g., Senior Developer, QA Engineer) |
| **Department** | `departments` table (managed list) | Organizational hierarchy | Groups employees and users (e.g., Engineering, Finance, HR) |

### Where Each Concept Is Used

**ProjectRole:**
- Add Team Member modal (role dropdown) — `TeamMemberRow.tsx`
- Project Detail team roster (Role column) — `ProjectDetail.tsx`
- System Config admin page (CRUD management) — `ProjectRoleManagement.tsx`
- Billing rate association on `employee_projects` junction table

**Designation:**
- Employee profile/list (job title column) — `EmployeeDashboard.tsx`, `EmployeeDetail.tsx`
- Employee search results in Add Team Member — `TeamMemberRow.tsx`
- Practice Dashboard (aggregated by designation) — `dashboard.service.ts`
- Salary upload CSV (employee master data)

**Department:**
- Employee profile (department field)
- Department Dashboard (aggregated financials)
- DEPT_HEAD RBAC scoping (sees only own department's data)
- Sidebar navigation grouping

### Overlap and Confusion Points

1. **Naming similarity**: "Developer" (ProjectRole) vs "Senior Developer" (Designation) — users question why both exist
2. **Manual redundancy**: When assigning a Senior Developer to a project, the DM must manually re-select "Developer" from the role dropdown despite the designation being visible
3. **Admin confusion**: Rajesh configures both Project Roles (System Config) and sees Designations on employee pages — unclear whether they should match

## Decision

**Keep ProjectRole and Designation as separate concepts. Add UX improvement: auto-populate role from designation.**

### Rationale

1. **Different concerns**: Designation reflects org-chart position; ProjectRole reflects project-level responsibility. A "Senior Developer" can act as "Tech Lead" on one project and "Developer" on another.
2. **Financial linkage**: Selling rates are tied to ProjectRole (per `employee_projects.billing_rate_paise`), not to designation. Consolidating would break this relationship.
3. **Practice analytics**: Designation is used as the entity key for PRACTICE-level financial snapshots. Changing it to reference ProjectRole would require a data migration with no clear benefit.
4. **Backward compatibility**: All existing project assignments reference ProjectRoles. No migration needed with this approach.

### UX Improvement

When a DM selects an employee in the Add Team Member flow, the role dropdown will be pre-populated with the employee's designation (case-insensitive match against active ProjectRole names). The DM can override this default.

### Impact on Existing Data

None. No schema changes. No data migration. Existing assignments are unaffected.

### System Config Clarity

The Project Roles section in System Config now includes helper text explaining:
> "Project Roles define the available roles when assigning employees to projects. These are separate from employee designations — an employee's project role may differ from their organizational job title."

This distinguishes it from Department management and employee designation data.

# Story 9.6: Fix Dept Head Project List — "No Projects Found"

Status: backlog

## Story

As a Department Head,
I want to see all projects that involve my department's employees so that I can track my department's project involvement and resource allocation across the organization.

## Primary Persona

Arjun (Dept Head) — Arjun heads the Engineering department. When he navigates to the Projects page, he sees "No projects found" — an empty table. This makes the Projects page unusable for his role and forces him to rely solely on the Department Dashboard for any project visibility.

## Persona Co-Authorship Review

### Arjun (Dept Head) — FAIL (blocking)
> "Where are my department's projects? I click Projects and see an empty table. I know Engineering has people on at least 5 projects — I can see this in the Department Dashboard. But the Projects page shows nothing. The filter is probably checking if I'm the Delivery Manager, which I'm not — I'm the Department Head. I need to see every project that has at least one Engineering employee on its team."

### Rajesh (Admin) — PASS with notes
> "The project list endpoint probably filters by deliveryManagerId. That makes sense for DMs, but Dept Heads need a different filter — projects where their department's employees are assigned. Admin should still see all projects."

### Vikram (DM) — ADVISORY
> "My project list works fine because I'm the Delivery Manager of those projects. Arjun's situation is different — he's not a DM on any project, he's the head of a department whose people are on projects."

## Acceptance Criteria (AC)

1. **Given** an authenticated DEPT_HEAD user,
   **When** the project list endpoint is called,
   **Then** the response includes all projects that have at least one team member (via `employee_projects`) from the dept head's department — not filtered by `deliveryManagerId`.

2. **Given** an Engineering DEPT_HEAD,
   **When** Engineering has 5 employees assigned to 3 different projects,
   **Then** the project list shows those 3 projects with all standard columns (name, status, type, client, financials).

3. **Given** a DEPT_HEAD whose department has no employees assigned to any project,
   **When** the project list loads,
   **Then** the table shows an appropriate empty state: "No projects found for your department" — distinguishing from a data error.

4. **Given** the RBAC scoping,
   **When** different roles access the project list,
   **Then** the existing behaviour is preserved:
   - ADMIN, FINANCE: see all projects (unchanged)
   - DELIVERY_MANAGER: see projects where they are the DM (unchanged)
   - DEPT_HEAD: see projects with team members from their department (NEW)

5. **Given** a project that the DEPT_HEAD can see,
   **When** the DEPT_HEAD clicks on the project,
   **Then** the project detail page loads with full information (team roster, financial summary if available).

6. **Given** `project-list-rbac.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: DEPT_HEAD sees projects with department members, DEPT_HEAD does not see projects without department members, DM filter unchanged, Admin/Finance see all unchanged, empty department returns empty list.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
The project list filters by deliveryManagerId, which works for DMs but breaks for Dept Heads who aren't DMs on any project. The fix is adding a DEPT_HEAD branch that queries by department employees. My test priority: Arjun logs in, sees his department's projects. Secondary: verify DM and Admin filters are untouched (regression). This is an RBAC fix — I need to test every role to make sure I didn't break existing behaviour.

### Persona Test Consultation

**Arjun (Dept Head):** "Where are my department's projects? I click Projects and see an empty table. I know Engineering has people on at least 5 projects — I can see this in the Department Dashboard. But the Projects page shows nothing. The filter is probably checking if I'm the Delivery Manager, which I'm not. I need to see every project that has at least one Engineering employee on its team. And when I click a project, I should be able to see the full detail."

**Quinn's response:** "I'll test this as Arjun's workflow: log in as DEPT_HEAD, open Projects, assert the list shows projects with Engineering team members. Then click into one and verify the detail page loads — not a 403. I'll also verify the count matches what the Department Dashboard shows for project involvement."

**Vikram (DM):** "My project list works fine because I'm the Delivery Manager of those projects. Just make sure fixing Arjun's issue doesn't break mine. I should still see only my managed projects, not all projects."

**Quinn's response:** "Regression test: Vikram logs in, sees only his DM projects, same as before. I'll run this alongside Arjun's test to confirm the RBAC branches are independent."

**Rajesh (Admin):** "Admin should still see all projects. Don't break that."

**Quinn's response:** "Admin all-projects test is already in the suite. I'll verify it passes after the DEPT_HEAD fix is applied."

### Persona Journey Test Files
```
tests/journeys/
  arjun-view-department-projects-and-drill-down.spec.ts
  vikram-verify-dm-project-filter-unchanged.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Arjun (DEPT_HEAD) logs in → Projects page → sees projects that have Engineering employees assigned (AC: 1, 2)
- E2E-P2: Arjun clicks on a visible project → project detail page loads with team roster and financial summary (AC: 5)
- E2E-P3: Admin logs in → Projects page → sees all projects (existing behaviour preserved) (AC: 4)
- E2E-P4: Vikram (DM) logs in → Projects page → sees only his managed projects (existing behaviour preserved) (AC: 4)

### Negative

- E2E-N1: DEPT_HEAD for a department with no project assignments → "No projects found for your department" message (AC: 3)
- E2E-N2: DEPT_HEAD cannot see projects that have zero team members from their department (AC: 1)

## Tasks / Subtasks

- [ ] Task 1: Diagnose the DEPT_HEAD project filter (AC: 1)
  - [ ] 1.1 Read the project list service function — find the WHERE clause that scopes by role
  - [ ] 1.2 Confirm DEPT_HEAD is either unhandled (falls through to empty result) or filtered by deliveryManagerId
  - [ ] 1.3 Identify how to get the dept head's departmentId from their user record

- [ ] Task 2: Add DEPT_HEAD scoping to project list query (AC: 1, 2)
  - [ ] 2.1 For DEPT_HEAD role, query: `SELECT DISTINCT p.* FROM projects p JOIN employee_projects ep ON p.id = ep.project_id JOIN employees e ON ep.employee_id = e.id WHERE e.department_id = :deptHeadDeptId`
  - [ ] 2.2 Ensure the user's departmentId is available from the auth context or user record
  - [ ] 2.3 If the user model doesn't store departmentId for DEPT_HEAD, look up via the department table (dept head assignment)

- [ ] Task 3: Preserve existing RBAC (AC: 4)
  - [ ] 3.1 Ensure ADMIN and FINANCE continue to see all projects
  - [ ] 3.2 Ensure DELIVERY_MANAGER continues to see only their managed projects
  - [ ] 3.3 Add DEPT_HEAD as a new branch in the role-based filter logic

- [ ] Task 4: Update project detail access (AC: 5)
  - [ ] 4.1 Ensure DEPT_HEAD can access project detail for projects visible in their list
  - [ ] 4.2 If the detail endpoint also filters by role, add the same DEPT_HEAD scoping

- [ ] Task 5: Frontend empty state (AC: 3)
  - [ ] 5.1 Update the empty state message for DEPT_HEAD to "No projects found for your department"
  - [ ] 5.2 Keep existing empty state for other roles

- [ ] Task 6: Backend tests (AC: 6)
  - [ ] 6.1 Test: DEPT_HEAD sees projects with employees from their department
  - [ ] 6.2 Test: DEPT_HEAD does NOT see projects without employees from their department
  - [ ] 6.3 Test: DM scope unchanged — sees own projects only
  - [ ] 6.4 Test: Admin/Finance scope unchanged — sees all projects
  - [ ] 6.5 Test: DEPT_HEAD with no department assignments gets empty list

- [ ] Task 7: E2E tests (E2E-P1 through E2E-N2)
  - [ ] 7.1 Create or extend `packages/e2e/tests/project-list-rbac.spec.ts`
  - [ ] 7.2 Implement E2E-P1 through E2E-P4
  - [ ] 7.3 Implement E2E-N1, E2E-N2

## Dev Notes

### Architecture Constraints

1. **RBAC branching in service layer**: The project list service already has role-based branching (if DM → filter by deliveryManagerId, if Admin/Finance → no filter). Add a new branch for DEPT_HEAD. Do NOT add this logic in the route — keep it in the service.
2. **Department association**: The DEPT_HEAD's department is determined by their user record. Check how the user model relates to departments — there may be a `departmentId` on the user, or a separate `department_heads` table, or the user's role + department assignment.
3. **DISTINCT results**: The subquery through `employee_projects → employees` may return duplicate projects if multiple employees from the same department are on the same project. Use `DISTINCT` or Prisma's `distinct` option.
4. **Consistent with Department Dashboard**: The same "projects in my department" logic should match what the Department Dashboard shows for that department. Reuse the same query logic if possible.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Project service | `packages/backend/src/services/project.service.ts` | Story 3.1 — `getProjects()` with role-based filtering |
| Project routes | `packages/backend/src/routes/projects.routes.ts` | Story 3.1 |
| RBAC middleware | `packages/backend/src/middleware/rbac.middleware.ts` | Story 1.2 |
| Auth context | `packages/backend/src/middleware/auth.middleware.ts` | Provides user role and ID |
| Employee model | Prisma schema | `employees` table with `department_id` |
| EmployeeProject model | Prisma schema | `employee_projects` junction table |
| Dashboard service | `packages/backend/src/services/dashboard.service.ts` | May have existing department → project query logic |

### Gotchas

- **User → Department mapping**: The critical question is: how does the system know which department a DEPT_HEAD belongs to? Options: (a) `users.departmentId` column, (b) user is linked to an employee record which has `departmentId`, (c) a separate assignment. Check the schema carefully.
- **Performance**: The subquery `projects WHERE id IN (SELECT projectId FROM employee_projects JOIN employees...)` could be slow for large datasets. Consider adding an index on `employees.department_id` if one doesn't exist.
- **Project detail access**: If the project detail endpoint also checks RBAC, the DEPT_HEAD needs to pass the same department-member check there too. Otherwise they can see a project in the list but get 403 when clicking it.
- **Backlog item B20**: This is a P1 bug — DEPT_HEAD role is functionally broken on the Projects page.

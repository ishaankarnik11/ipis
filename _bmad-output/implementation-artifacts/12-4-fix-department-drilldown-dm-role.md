# Story 12.4: Fix Department Drill-Down for Delivery Manager Role

Status: review

## Story

As a Delivery Manager viewing the Department Dashboard,
I want the drill-down drawer to show employees and projects in my department,
so that I can see my team's data without it appearing empty.

## Primary Persona

Vikram (DM) — his department shows empty data in the drill-down despite having active employees and projects.

## Source

UAT Report: `_bmad-output/implementation-artifacts/uat-report-2026-03-15-browser-uat.md` — P1 #4
Previous attempt: Story 11-3 (review status, works for Admin/Dept Head but broken for DM)

## Persona Co-Authorship Review

### Vikram (DM) — BLOCK
> "I click on 'Delivery' in the Department Dashboard and the drill-down drawer opens saying 'No employees in this department' and 'No project assignments for this department.' This is MY department. It has ₹41,00,000 in revenue. Sanjay Rao, Pooja Agarwal — they're right there in the dashboard numbers. But the drill-down says zero. Meanwhile, Rajesh (Admin) and Arjun (Dept Head) told me their drill-down works fine. So it's broken specifically for the DM role."

### Rajesh (Admin) — REFERENCE
> "Department drill-down works for me. I click any department and see employees and projects. So the API and drawer code work — it's a scoping or permissions issue specific to DM."

### Arjun (Dept Head) — REFERENCE
> "Same — drill-down works for me on Engineering. Shows 7 employees and 5 projects. The query is probably filtering by the logged-in user's department for DM role but not finding the right match."

### Quinn (QA) — ADVISORY
> "The drill-down API likely applies RBAC scoping. For DEPT_HEAD, it filters to the user's own department. For DM, it might be applying a different filter — perhaps filtering by `project.deliveryManagerId` instead of `employee.departmentId`, or the DM's user record doesn't have a `departmentId` set. Check the backend query: does it use `req.user.departmentId` for DM role? If the DM's user → employee → department link is missing, the query returns empty."

## Acceptance Criteria (AC)

1. **Given** a Delivery Manager on the Department Dashboard,
   **When** they click a department row to open the drill-down drawer,
   **Then** the drawer shows all employees in that department with Name, Designation, Utilisation %, and Revenue Contribution.

2. **Given** a Delivery Manager on the Department Dashboard,
   **When** the drill-down drawer opens for a department with projects,
   **Then** the Projects section shows projects with employees from that department, with Project Name, Employee count, and Revenue.

3. **Given** the drill-down API `GET /api/v1/dashboards/department/:id/drilldown` (or equivalent),
   **When** called by a DM user,
   **Then** it returns the same employee and project data as it would for an Admin user viewing the same department.

4. **Given** `pnpm test` runs,
   **When** dashboard service tests complete,
   **Then** a test verifies the drill-down returns data for a DM user's department.

## Investigation Steps

- [ ] Check `dashboard.service.ts` drill-down method — how does it scope data by role?
- [ ] Check if DM's user record has a `departmentId` (via linked Employee record)
- [ ] Check if the drill-down query for DM role filters differently than Admin/Dept Head
- [ ] Test the API directly with DM auth token — does it return empty or error?

## Dev Notes

### Likely Root Cause

The drill-down query probably applies role-based filtering. For DM, it may:
- Filter by `deliveryManagerId` (finds projects but not department employees)
- Look up the user's `departmentId` but the DM user's employee record may not have one set
- Use a different query path that doesn't match the department structure

### Existing Code

| What | Path |
|---|---|
| Dashboard service | `packages/backend/src/services/dashboard.service.ts` |
| Dashboard routes | `packages/backend/src/routes/dashboards.routes.ts` |
| Drill-down drawer | `packages/frontend/src/components/DepartmentDrilldownDrawer.tsx` |
| Dashboard tests | `packages/backend/src/services/dashboard.service.test.ts` |

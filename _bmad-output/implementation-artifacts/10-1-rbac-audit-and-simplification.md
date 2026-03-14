# Story 10.1: RBAC Audit & Simplification

Status: backlog

## Story

As an Admin,
I want a comprehensive audit of all API endpoints and UI routes against the original Feature-Role Matrix from the product brief, with discrepancies documented and a source-of-truth matrix created,
so that every role has exactly the permissions they should — no more, no less.

## Primary Persona

Rajesh (Admin) — As the system owner, Rajesh needs confidence that the RBAC configuration matches the original brief. He set up roles expecting specific access patterns and needs to verify they work as documented.

## Persona Co-Authorship Review

### Rajesh (Admin) — APPROVED with notes
> "I set up roles expecting certain access. If Finance can see things they shouldn't, or HR is missing screens they need, that's a configuration problem I need to fix. Give me a clear matrix I can reference."

### Priya (Finance) — APPROVED
> "I should see revenue and cost data — dashboards, projects, uploads. I should NOT see salary data. If those boundaries are wrong, fix them."

### Neha (HR) — APPROVED with concern
> "I only have two sidebar items right now — Employees and Upload Center. The brief says I should see utilization data too. Where is my Employee Dashboard?"

### Vikram (DM) — APPROVED with concern
> "I upload timesheets every month but there's no Upload Center in my sidebar. How am I supposed to do my job?"

### Arjun (Dept Head) — APPROVED
> "My department view seems correct, but I want confirmation that I'm not missing anything the brief intended for me."

## Acceptance Criteria (AC)

1. **Given** the existing codebase,
   **When** the audit is performed,
   **Then** every backend API endpoint (all routes in `packages/backend/src/routes/`) is catalogued with its current RBAC configuration (which roles can access it).

2. **Given** the existing codebase,
   **When** the audit is performed,
   **Then** every frontend route (in `packages/frontend/src/router/`) is catalogued with its current RoleGuard configuration.

3. **Given** the existing codebase,
   **When** the audit is performed,
   **Then** every sidebar item per role (defined in navigation config and `packages/e2e/helpers/constants.ts`) is catalogued.

4. **Given** the original product brief's Feature-Role Matrix,
   **When** compared against the current state audit,
   **Then** all discrepancies are documented with: endpoint/route, current access, expected access, and classification (over-permission or under-permission).

5. **Given** the audit results,
   **When** written to `docs/feature-role-matrix.md`,
   **Then** the document contains: (a) the intended Feature-Role Matrix from the brief, (b) the current-state matrix, (c) a discrepancy table, and (d) remediation plan referencing Stories 10.2 and 10.3.

6. **Given** the known discrepancies,
   **When** the audit identifies HR missing Employee Dashboard access,
   **Then** it is documented as an under-permission issue with remediation in Story 10.2.

7. **Given** the known discrepancies,
   **When** the audit identifies DM missing Upload Center access,
   **Then** it is documented as an under-permission issue with remediation in Story 10.3.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is the foundation story — if RBAC is wrong, everything downstream is wrong. I'm testing every single endpoint against every single role. No shortcuts. We build the matrix, we verify the matrix, and every future story references it. Coverage first, edge cases second.

### Persona Test Consultation

**Rajesh (Admin):** "Just test that every role sees exactly what I configured. If Finance can hit an HR endpoint, that's a failure. If HR is missing something, that's a failure. I don't want grey areas."

**Quinn's response:** "Agreed. I'll write a matrix-driven test that iterates over every endpoint x role combination. One test file, exhaustive coverage. If any cell is wrong, it fails loud."

**Priya (Finance):** "Make sure I can't accidentally see salary data. And make sure I CAN see everything I need for revenue reporting. Don't just test the blocks — test the allows too."

**Quinn's response:** "Good call. I'll split the test into 'should access' and 'should block' sections for each role, so we catch both over-permission and under-permission."

**Neha (HR):** "I only have two sidebar items right now. If your test says that's correct, it's wrong. The brief says I should have more."

**Quinn's response:** "That's exactly what this audit catches. The test will compare against the brief's intended matrix, not the current broken state. If the current state doesn't match the brief, the test documents the gap."

**Vikram (DM):** "I can't even upload timesheets right now. Your test better flag that as a failure, not pass it as 'working as implemented.'"

**Quinn's response:** "The test validates against the INTENDED matrix from the brief. Missing Upload Center for DM will show up as a documented under-permission. Stories 10.2 and 10.3 fix it."

**Arjun (Dept Head):** "I want to know I'm not missing anything. Test my access against what was planned, not just what exists."

**Quinn's response:** "Same approach for all roles — intended vs actual. Your gaps will be documented too."

### Persona Journey Test Files
```
tests/journeys/
  rajesh-admin-full-access-matrix.spec.ts
  priya-finance-revenue-access-no-salary.spec.ts
  neha-hr-employee-access-no-financials.spec.ts
  vikram-dm-project-delivery-access.spec.ts
  arjun-depthead-department-scoped-access.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Each role logs in → sidebar items match the documented Feature-Role Matrix in `docs/feature-role-matrix.md` (AC: 3, 5)
- E2E-P2: Admin can access every API endpoint listed in the matrix as Admin-accessible (AC: 1)
- E2E-P3: Finance can access all endpoints marked Finance-accessible and is blocked from Admin-only endpoints (AC: 1)

### Negative

- E2E-N1: HR attempts to access an endpoint not in their matrix → receives 403 (AC: 1, 4)
- E2E-N2: DM attempts to access Admin-only endpoints → receives 403 (AC: 1, 4)

## Tasks / Subtasks

- [ ] Task 1: Backend API endpoint audit (AC: 1)
  - [ ] 1.1 Catalogue every route in `routes/index.ts` and all sub-route files
  - [ ] 1.2 For each route, record: HTTP method, path, RBAC middleware roles, any additional scoping logic
  - [ ] 1.3 Identify routes with no RBAC middleware (public or auth-only)

- [ ] Task 2: Frontend route audit (AC: 2)
  - [ ] 2.1 Catalogue every route in `router/index.tsx`
  - [ ] 2.2 For each route, record: path, RoleGuard roles, redirect behavior for unauthorized
  - [ ] 2.3 Cross-reference with backend API endpoints used by each page

- [ ] Task 3: Sidebar/navigation audit (AC: 3)
  - [ ] 3.1 Catalogue sidebar items per role from `config/navigation.ts` or equivalent
  - [ ] 3.2 Cross-reference with `packages/e2e/helpers/constants.ts` roleSidebarItems
  - [ ] 3.3 Note any discrepancies between frontend config and E2E constants

- [ ] Task 4: Brief comparison and discrepancy analysis (AC: 4, 6, 7)
  - [ ] 4.1 Extract Feature-Role Matrix from original product brief/PRD
  - [ ] 4.2 Map brief features to implemented endpoints/routes
  - [ ] 4.3 Classify each discrepancy as over-permission or under-permission
  - [ ] 4.4 Flag HR missing Employee Dashboard (Story 10.2)
  - [ ] 4.5 Flag DM missing Upload Center (Story 10.3)

- [ ] Task 5: Create `docs/feature-role-matrix.md` (AC: 5)
  - [ ] 5.1 Write intended Feature-Role Matrix table
  - [ ] 5.2 Write current-state matrix table
  - [ ] 5.3 Write discrepancy table with remediation references
  - [ ] 5.4 Link to Stories 10.2, 10.3 for permission fixes

## Dev Notes

### Architecture Constraints

1. **Audit only, no code changes**: This story produces documentation. Actual permission fixes happen in Stories 10.2 and 10.3.
2. **Source of truth**: `docs/feature-role-matrix.md` becomes the canonical reference for RBAC decisions going forward.
3. **Five roles**: ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD — as defined in `packages/backend/prisma/schema.prisma`.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Route definitions | `packages/backend/src/routes/index.ts` | All route registrations |
| RBAC middleware | `packages/backend/src/middleware/rbac.ts` | Role checking logic |
| Frontend router | `packages/frontend/src/router/index.tsx` | RoleGuard config |
| Navigation config | `packages/frontend/src/config/navigation.ts` | Sidebar items per role |
| E2E constants | `packages/e2e/helpers/constants.ts` | roleSidebarItems |
| Product brief | `_bmad-output/planning-artifacts/product-brief.md` | Original feature-role intentions |
| PRD | `_bmad-output/planning-artifacts/prd.md` | Feature requirements |

### Gotchas

- Some endpoints may have RBAC at the middleware level but additional scoping in the service layer (e.g., DH sees only their department). Document both layers.
- The brief may reference features not yet implemented (Epic 7, 9). Mark those as "not yet implemented" rather than "missing permission."
- E2E constants in `packages/e2e/helpers/constants.ts` may already be out of date if sidebar items were added without updating the constants.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

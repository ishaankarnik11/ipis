# Story 10.8: Project Role / Department Consolidation Review

Status: backlog

## Story

As an Admin,
I want a design review that clarifies the relationship between Project Roles and employee designations/departments, with a clear decision documented on whether they should be consolidated,
so that the system isn't confusing with seemingly duplicate concepts.

## Primary Persona

Rajesh (Admin) — Rajesh configured both departments and project roles. He sees overlap and questions whether both are needed as separate entities.

## Persona Co-Authorship Review

### Rajesh (Admin) — APPROVED, primary driver
> "We have created role and department — it should be consolidated. When I assign someone to a project, their role should come from their designation. Why do I need to set 'Developer' again when their designation already says 'Senior Developer'?"

### Vikram (DM) — APPROVED with nuance
> "I see Rajesh's point, but sometimes someone's project role IS different from their designation. A Senior Developer might act as Tech Lead on one project and Developer on another. We need flexibility, but the default should come from their designation."

### Neha (HR) — APPROVED
> "From HR perspective, designation is what we manage. If project roles are derived from designations, that's one less thing to configure. But I understand projects might need different role labels."

### Priya (Finance) — NEUTRAL
> "I don't configure roles. As long as the selling rate is correctly tied to whatever role system we use, I'm fine."

## Acceptance Criteria (AC)

1. **Given** the current system has separate `ProjectRole` (Story 8.1) and `Designation` (employee field) concepts,
   **When** the design review is conducted,
   **Then** a document is created at `docs/project-role-department-decision.md` analyzing the relationship between ProjectRoles, Designations, and Departments.

2. **Given** the design review document,
   **When** it analyzes the current state,
   **Then** it documents: (a) what ProjectRole is used for (team member assignment), (b) what Designation is used for (employee profile), (c) what Department is used for (organizational hierarchy), and (d) where they overlap or create confusion.

3. **Given** the design review document,
   **When** it proposes a solution,
   **Then** the recommended approach is: Keep ProjectRole as a separate concept for project-level assignment flexibility, BUT pre-populate the role dropdown with the employee's designation when adding a team member to a project.

4. **Given** the Add Team Member flow,
   **When** a DM adds an employee to a project,
   **Then** the Role dropdown is pre-populated with the employee's designation as the default, which can be overridden if the project role differs.

5. **Given** the System Config page,
   **When** reviewed for this story,
   **Then** if a "Project Roles" management section exists that creates user confusion (overlapping with department/designation management), either (a) it is removed with roles managed inline, or (b) it is clearly labeled to distinguish from departments/designations, or (c) the decision document explains why both sections exist.

6. **Given** the design review outcome,
   **When** the decision is made,
   **Then** the `docs/project-role-department-decision.md` document includes: Decision, Rationale, Impact on existing data, Migration plan (if any), and a link back to this story.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
This is mostly a design review story with a small implementation piece (role pre-population). The test surface is lighter than the other Epic 10 stories. I'm focused on the UX improvement: when a DM adds a team member, the role dropdown should pre-populate from the employee's designation. That's the testable behavior. The design document is a deliverable, not a testable artifact.

### Persona Test Consultation

**Rajesh (Admin):** "I set up both roles and departments. It's confusing. If the system can default the project role from the employee's designation, that saves me time and reduces mistakes."

**Quinn's response:** "The test verifies the pre-population works: select an employee in the Add Team Member modal, role dropdown auto-selects their designation if a match exists. If Rajesh later changes the role list in System Config, the tooltip should explain the difference between project roles and designations."

**Vikram (DM):** "Sometimes a Senior Developer acts as Tech Lead on my project. The default should come from their designation, but I need to be able to change it."

**Quinn's response:** "Override test: select employee, see pre-populated role, change it to a different role, submit. The assignment should use the overridden role, not the default. Your flexibility is preserved."

**Neha (HR):** "Designation is what I manage. If project roles auto-fill from designations, that's less manual work for everyone."

**Quinn's response:** "I'll test the happy path with matching designations and the edge case where a designation doesn't match any project role — dropdown should be empty, forcing manual selection."

**Priya (Finance):** "I don't care about role configuration. Just make sure selling rates still attach to whatever role system you end up with."

**Quinn's response:** "The selling rate linkage isn't changing in this story — project roles stay as-is, just pre-populated. No impact on your financial calculations."

### Persona Journey Test Files
```
tests/journeys/
  vikram-dm-add-team-member-role-prepopulation.spec.ts
  vikram-dm-override-prepopulated-role.spec.ts
  rajesh-admin-system-config-role-clarity.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: DM adds team member to project → Role dropdown pre-selects the employee's designation as default value (AC: 4)
- E2E-P2: DM overrides the pre-populated role with a different project role → assignment succeeds with the overridden role (AC: 4)
- E2E-P3: Admin views System Config → Project Roles section is clearly labeled and distinct from Department management (AC: 5)

### Negative

- E2E-N1: Employee with no designation → Role dropdown shows empty default, all active roles available for selection (AC: 4)
- E2E-N2: Employee's designation doesn't match any ProjectRole name → Role dropdown shows empty default, user must manually select (AC: 4)

## Tasks / Subtasks

- [ ] Task 1: Design analysis and documentation (AC: 1, 2, 6)
  - [ ] 1.1 Audit current usage: list all ProjectRoles in the system, list all unique Designations, list all Departments
  - [ ] 1.2 Document where each concept is used (which screens, which APIs, which calculations)
  - [ ] 1.3 Identify overlap and confusion points
  - [ ] 1.4 Write `docs/project-role-department-decision.md` with analysis, decision, rationale, and impact

- [ ] Task 2: Propose and document the recommended approach (AC: 3)
  - [ ] 2.1 Recommend: Keep ProjectRole as flexible project-level concept, pre-populate from designation
  - [ ] 2.2 Document why full consolidation is NOT recommended (project roles can differ from org-chart roles)
  - [ ] 2.3 Document the DM override flow (pre-populate but allow change)

- [ ] Task 3: Implement role pre-population in Add Team Member (AC: 4)
  - [ ] 3.1 When DM selects an employee in the Add Team Member modal, look up the employee's designation
  - [ ] 3.2 Find the matching ProjectRole (case-insensitive name match against designation)
  - [ ] 3.3 If match found, pre-select that role in the dropdown; if no match, leave dropdown empty
  - [ ] 3.4 Allow DM to override the pre-selected role

- [ ] Task 4: System Config clarity (AC: 5)
  - [ ] 4.1 Review the Project Roles section in System Config
  - [ ] 4.2 Add a helper text/tooltip explaining: "Project Roles are used for team member assignment on projects. They may differ from an employee's organizational designation."
  - [ ] 4.3 Ensure Department management and Project Role management are visually distinct

- [ ] Task 5: Tests
  - [ ] 5.1 Frontend unit test: role dropdown pre-populates from employee designation
  - [ ] 5.2 Frontend unit test: override pre-populated role works
  - [ ] 5.3 Frontend unit test: no match designation → empty dropdown
  - [ ] 5.4 E2E tests: E2E-P1 through E2E-P3 and E2E-N1 through E2E-N2

## Dev Notes

### Architecture Constraints

1. **Design review first, code second**: Tasks 1-2 (documentation) should be completed before Tasks 3-4 (implementation). The implementation should reflect the documented decision.
2. **No schema changes**: ProjectRole and Designation remain separate database concepts. The "consolidation" is UX-level (pre-population), not schema-level (merging tables).
3. **Backward compatible**: Existing project role assignments are unaffected. No data migration needed.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Add Team Member modal | `components/AddTeamMemberModal.tsx` or similar | Story 8.3 — modify role dropdown |
| ProjectRole service | `services/project-role.service.ts` | Story 8.1 — role lookup |
| Employee service | `services/employee.service.ts` | Epic 2 — designation lookup |
| System Config page | `pages/admin/SystemConfig.tsx` or similar | Story 1.5/8.2 — add clarity |

### Gotchas

- The employee's `designation` field is free text (from the employee CSV upload). ProjectRole names are from a managed list (Story 8.1). The match between them may not be exact — e.g., designation "Sr. Developer" vs ProjectRole "Senior Developer". Consider a fuzzy match or maintain a mapping.
- If the recommended approach changes during the design review (e.g., stakeholder decides to fully consolidate), Tasks 3-4 need to be rewritten. Complete the review before coding.
- This story is partly a design review and partly implementation. If the scope feels too large, split: 10.8a (review + doc) and 10.8b (implementation).
- Seeded ProjectRoles from Story 8.1 (`Developer`, `Senior Developer`, `Tech Lead`, etc.) may or may not match the designations used in employee data. Check the seed data.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

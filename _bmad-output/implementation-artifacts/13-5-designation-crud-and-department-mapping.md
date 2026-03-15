# Story 13.5: Designation CRUD Improvements + Department Mapping

Status: ready-for-dev

## Story

As a system administrator,
I need to rename designations, associate them with departments, and manage the mapping between designations and departments,
so that when I assign a "Scrum Master" to a project, the system knows they belong to the PMO department (not Engineering), and when I assign a "Sr. Python Developer", the system knows they belong to the Engineering department.

## Context

After Story 13.1 renames ProjectRole → Designation, this story adds:
1. **Rename capability** — currently designations can only be toggled active/inactive, not renamed
2. **Department association** — `departmentId` FK on Designation (added in 13.1 migration)
3. **Mapping UI** — admin screen to manage designation-to-department associations

This addresses ishaan's feedback: "Scrum Master is not a department, he will be in PMO or Project Management department. Sr. Python Developer will be in the Python team."

## Dependencies

- Story 13.1 (Rename ProjectRole → Designation + add `departmentId` column)
- Story 13.4 (Department full CRUD — departments must exist to map to)

## Acceptance Criteria

1. **Given** the Designation Management admin screen,
   **When** I click "Edit" on a designation,
   **Then** I can change its name AND assign it to a department via a dropdown.

2. **Given** a designation like "Scrum Master",
   **When** I assign it to the "PMO" department,
   **Then** when that designation is used on a team member assignment, the system knows the associated department for reporting purposes.

3. **Given** the `PATCH /api/v1/designations/:id` endpoint,
   **When** called with `{ name: "Senior Python Developer", departmentId: "<engineering-uuid>" }`,
   **Then** both the name and department association are updated.

4. **Given** the Designation Management screen,
   **When** rendered,
   **Then** each designation row shows: Name, Associated Department (or "Unassigned"), Active Status, Actions (Edit, Toggle Active).

5. **Given** a designation that is in use on employee-project assignments,
   **When** I rename it,
   **Then** all existing assignments reflect the new name (since they reference by FK, the name change propagates automatically).

6. **Given** the "Add Designation" form,
   **When** I create a new designation,
   **Then** I can optionally assign it to a department at creation time.

7. **Given** the API,
   **Then** `PATCH /api/v1/designations/:id` accepts: `{ name?: string, departmentId?: string | null, isActive?: boolean }`.

## Technical Notes

### Schema (already done in 13.1)
```prisma
model Designation {
  id           String      @id @default(uuid())
  name         String      @unique
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
}
```

### Seed Data Update
Map existing seed designations to departments:
- Developer, Senior Developer, Junior Developer, Full Stack Developer, Tech Lead, Architect → Engineering
- QA Engineer → Engineering (or QA department if created)
- DevOps Engineer → Engineering
- Business Analyst → Delivery
- Project Manager → Delivery
- Scrum Master → Delivery (or PMO)
- Designer → Engineering
- Support Engineer → Operations
- Coordinator → Delivery

### Testing Requirements

**Backend Integration (Real DB):**
- Create designation with departmentId → verify association persisted
- Update designation name → verify change propagates (query EmployeeProject → include designation → verify new name)
- Update departmentId → verify change persisted
- Set departmentId to null → verify designation becomes unassigned

**E2E Consequence Test:**
- As Admin: create designation "ML Engineer" mapped to "Engineering" → as DM: add team member with "ML Engineer" designation → verify designation shows correctly on project detail

**Frontend Test:**
- Edit modal shows department dropdown pre-populated with current department
- Department dropdown includes "Unassigned" option
- Name field pre-populated with current name
- Save updates both name and department in one call

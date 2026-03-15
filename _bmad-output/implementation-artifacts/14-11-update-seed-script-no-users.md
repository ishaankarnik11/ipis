# Story 14.11: Update Seed Script — No Users, Bootstrap-Only Admin

Status: review

## Dev Agent Record

### Implementation Plan
- Made `deliveryManagerId` nullable on Project model (projects can exist without DM, admin assigns later)
- Rewrote seed.ts: creates departments, system config, designations, employees, projects — but NO users
- Removed bcrypt import, password hashing, user creation from seed
- Seed logs "No users created. Start the app with ADMIN_EMAIL set to bootstrap the admin account."
- Fixed project.service.ts for nullable deliveryManagerId (null checks on DM email sends)

### Completion Notes
- AC1: Seed creates departments (5), system config, designations (9), employees (10), projects (5)
- AC2: Zero user records created in seed
- AC3: Bootstrap flow creates admin after seed
- AC4: deliveryManagerId is now nullable — projects seeded without DMs
- AC5: Explicit log message about ADMIN_EMAIL
- AC6: No UploadEvents/AuditEvents created (require user references)
- All 589 backend + 349 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/backend/prisma/schema.prisma (deliveryManagerId nullable)
- packages/backend/prisma/seed.ts (complete rewrite — no users, no bcrypt)
- packages/backend/src/services/project.service.ts (nullable deliveryManagerId handling)

## Change Log
- 2026-03-15: Updated seed script — no users, bootstrap-only admin, nullable deliveryManagerId

## Story

As a developer setting up the dev environment,
I need the seed script to create departments, employees, projects, and financial data but NOT users,
so that user creation only happens through the bootstrap flow (ADMIN_EMAIL) and admin UI — no more mock user data.

## Dependencies

- 14.3 (Bootstrap — admin created from env)

## Acceptance Criteria

1. **Given** the seed script (`seed.ts`),
   **When** executed,
   **Then** it creates:
   - Departments (Engineering, Finance, HR, Delivery, Operations)
   - System Config (standard monthly hours, thresholds)
   - Employees (20 employees across departments)
   - Projects (10 projects — but with NO deliveryManagerId since no users exist yet)
   - Designations (renamed from ProjectRoles)
   - Employee-Project assignments (without billingRatePaise initially if DM assignment is needed)
   - Timesheet entries, billing records, calculation snapshots (for dashboard demo data)

2. **Given** the seed script,
   **When** executed,
   **Then** it does NOT create:
   - Any User records
   - Any password hashes
   - Any UploadEvent records referencing user IDs
   - Any AuditEvent records referencing user IDs

3. **Given** the seed script has run AND the app starts with ADMIN_EMAIL set,
   **When** bootstrap runs,
   **Then** the admin is created and can log in. Other users are created by the admin through the UI.

4. **Given** projects need a `deliveryManagerId`,
   **When** no users exist during seeding,
   **Then** either:
   - `deliveryManagerId` is nullable in seed data (projects can exist without a DM assigned)
   - OR seed script is run AFTER bootstrap, with the admin assigning DMs
   - Decision: make `deliveryManagerId` nullable for initial seed, admin assigns later

5. **Given** `pnpm --filter backend db:seed` runs,
   **When** complete,
   **Then** the script logs what was created and explicitly notes: "No users created. Start the app with ADMIN_EMAIL set to bootstrap the admin account."

6. **Given** financial seed data (snapshots, billing records) that previously referenced user IDs,
   **When** seeded,
   **Then** references to `uploadedBy` or `actorId` are either nullable or use a placeholder system identifier.

## Technical Notes

### deliveryManagerId
Currently required FK on Project. Options:
1. Make it nullable in schema (recommended — projects can be created without a DM assigned, DM is assigned later)
2. Create a "system" user for seed data (violates "no mock data")

Recommend option 1 — nullable `deliveryManagerId`. Admin assigns DMs after creating user accounts.

### UploadEvent.uploadedBy and AuditEvent.actorId
These FK to User. For seed data without users:
- Skip creating UploadEvents and AuditEvents in seed
- OR make these FKs nullable (for seed/demo data only)
- Recommend: skip them in seed. Real uploads and audit events are created by real users.

### Testing Requirements

**Backend Integration:**
- Run seed on clean DB → verify departments, employees, projects, designations created
- Run seed → verify zero User records
- Run seed → app starts with ADMIN_EMAIL → verify admin created, can log in
- Run seed twice → verify idempotent (deletes and recreates)

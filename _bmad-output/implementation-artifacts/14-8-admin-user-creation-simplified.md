# Story 14.8: Admin User Creation — Simplified Modal (Email + Role) + Invitation Email

Status: review

## Dev Agent Record

### Implementation Plan
- Simplified UserFormModal: create mode shows only email + role; edit mode shows name, email, role, department
- Backend user.service.createUser now calls createInvitation after user creation
- UserManagement "Add User" → "Invite User", null names show "Pending setup"
- Status badges: Invited (blue), Active (green), Deactivated (red)

### Completion Notes
- AC1: Simplified modal — email + role only, "Send Invitation" button
- AC2: Creates user (INVITED), sends invitation via email service
- AC3: Duplicate email → ConflictError
- AC4: User list shows status badges, "Pending setup" for null names
- AC5-6: No name/dept/password in create modal
- All 590 backend tests pass, 349 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/backend/src/services/user.service.ts (createInvitation after user creation)
- packages/frontend/src/pages/admin/UserFormModal.tsx (simplified create, edit preserved)
- packages/frontend/src/pages/admin/UserManagement.tsx (Invite User button, Pending setup, status badges)
- packages/frontend/src/pages/admin/UserManagement.test.tsx (updated button text and assertions)

## Change Log
- 2026-03-15: Simplified admin user creation — email + role only, auto-sends invitation

## Story

As an admin creating a new user,
I need to only enter their email and role, and the system handles everything else — sending the invitation, letting the user set up their own profile,
so that user creation is fast and I don't need to know or manage anyone's personal details.

## Dependencies

- 14.6 (Invitation link API)
- 14.1 (Email service)

## Persona Co-Authorship

### Rajesh (Admin)
> "Currently I fill in name, email, role, department, and then somehow communicate a temporary password. That's too many steps. I should enter the bare minimum — email and role — and the system handles the rest. If I get an email wrong, the invitation bounces and I can fix it."

## Acceptance Criteria

1. **Given** the User Management page,
   **When** I click "Add User",
   **Then** a simplified modal appears with only:
   - "Email" input (required, validated as email format)
   - "Role" dropdown (ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD)
   - "Send Invitation" primary button

2. **Given** I enter a valid email and role,
   **When** I click "Send Invitation",
   **Then**:
   - User created with `status: INVITED`, `name: null`
   - InvitationToken created (48-hour expiry)
   - Welcome email sent to the entered email
   - Modal closes
   - Success notification: "Invitation sent to user@email.com"
   - User appears in the user list with status "Invited" badge

3. **Given** I enter an email that already exists,
   **When** I click "Send Invitation",
   **Then** error: "A user with this email already exists."

4. **Given** the user list table,
   **When** rendered,
   **Then** each user shows:
   - Name (or "Pending setup" if null)
   - Email
   - Role
   - Status badge: "Invited" (orange), "Active" (green), "Deactivated" (grey)
   - Department (or "—" if not set)
   - Actions (see Story 14.9)

5. **Given** no "name" or "department" fields in the modal,
   **Then** those fields are NOT shown. The user fills them in during their onboarding flow.

6. **Given** no "temporary password" in the API response,
   **Then** no password is generated, displayed, or communicated. The entire concept of passwords is gone.

## Technical Notes

### API Changes
`POST /api/v1/users` — simplified request body:
```typescript
createUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
});
// No name, no departmentId, no password
```

Response: `{ data: { id, email, role, status: 'INVITED' } }`

The service internally:
1. Creates the user
2. Creates an InvitationToken
3. Sends welcome email
4. All in a transaction (if email fails, user creation rolls back)

### User List Status Badges
```tsx
const statusColors: Record<UserStatus, string> = {
  INVITED: 'orange',
  ACTIVE: 'green',
  DEACTIVATED: 'default',
};
```

### Testing Requirements

**Backend Integration (Real DB):**
- Create user with email + role → verify user status INVITED, name null
- Create user → verify InvitationToken created
- Create user → verify email sent (Ethereal)
- Create user with duplicate email → verify ConflictError
- Verify entire flow is transactional (email fail → no user created)

**E2E Test:**
- Admin opens Add User modal → verify only email + role fields shown
- Admin creates user → verify user appears in list with "Invited" badge
- Admin creates user → verify invitation email sent (check MASTER_OTP console log)

**Frontend Test:**
- Modal renders only email + role fields (no name, no department, no password)
- Email validation
- Success notification shows correct email
- User list shows status badges

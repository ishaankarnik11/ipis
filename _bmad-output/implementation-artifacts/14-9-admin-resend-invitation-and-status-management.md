# Story 14.9: Admin Resend Invitation + User Status Management

Status: review

## Dev Agent Record

### Implementation Plan
- Added `resendInvitation()` to user.service.ts — validates INVITED status, calls createInvitation
- Added `POST /users/:id/resend-invitation` route (Admin only)
- Updated UserManagement actions per status: INVITED→Resend+Deactivate, ACTIVE→Edit+Deactivate, DEACTIVATED→Reactivate
- Reactivate logic: name set→ACTIVE, name null→INVITED (re-invite)
- Frontend `resendInvitation()` API function added

### Completion Notes
- AC1: Resend creates new token, invalidates old, sends email
- AC2: Resend only for INVITED users
- AC3: Reactivate handles profile-complete vs profile-incomplete
- AC4: Deactivate with Popconfirm
- AC5: Actions table follows spec exactly
- AC6: Edit role via existing PATCH endpoint
- AC7-9: API endpoints implemented
- All 590 backend tests pass, 349 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/backend/src/services/user.service.ts (resendInvitation function)
- packages/backend/src/routes/users.routes.ts (resend-invitation route)
- packages/frontend/src/services/users.api.ts (resendInvitation API)
- packages/frontend/src/pages/admin/UserManagement.tsx (status-based actions, Reactivate)
- packages/frontend/src/pages/admin/UserManagement.test.tsx (updated mock + assertions)
- packages/frontend/src/pages/admin/user-management-actions.test.tsx (updated mock + assertions)

## Change Log
- 2026-03-15: Added resend invitation + status-based admin actions (Resend/Edit/Deactivate/Reactivate)

## Story

As an admin managing users,
I need to resend invitation emails (in case the original expired or was missed) and manage user status (activate/deactivate),
so that I can handle onboarding issues without creating duplicate accounts.

## Dependencies

- 14.8 (Simplified user creation)

## Acceptance Criteria

### Resend Invitation

1. **Given** a user with status INVITED,
   **When** admin clicks "Resend Invitation" action,
   **Then**:
   - Previous InvitationToken is invalidated
   - New InvitationToken created (fresh 48-hour expiry)
   - New welcome email sent
   - Success notification: "Invitation resent to user@email.com"

2. **Given** a user with status ACTIVE,
   **When** viewing their actions,
   **Then** "Resend Invitation" is NOT shown (they've already onboarded).

3. **Given** a user with status DEACTIVATED,
   **When** admin clicks "Reactivate",
   **Then**:
   - If user previously completed profile (name is set): status → ACTIVE
   - If user never completed profile (name is null): status → INVITED + new invitation sent

### User Status Management

4. **Given** a user with status ACTIVE,
   **When** admin clicks "Deactivate",
   **Then**:
   - Confirmation dialog: "Deactivate [Name]? They will no longer be able to log in."
   - On confirm: `status → DEACTIVATED`
   - Any active JWT sessions continue until expiry (no server-side revocation), but new OTP requests are rejected
   - AuditEvent logged: `USER_DEACTIVATE`

5. **Given** the user list actions column,
   **Then** actions per status:

   | Status | Available Actions |
   |--------|------------------|
   | INVITED | Resend Invitation, Deactivate |
   | ACTIVE | Edit Role, Deactivate |
   | DEACTIVATED | Reactivate |

6. **Given** "Edit Role" on an active user,
   **When** admin changes the role,
   **Then** the role is updated immediately. The user's next OTP login will use the new role for their JWT.

### API Endpoints

7. **Given** `POST /api/v1/users/:id/resend-invitation`,
   **When** called for an INVITED user,
   **Then** new invitation created and sent.

8. **Given** `PATCH /api/v1/users/:id` with `{ status: 'DEACTIVATED' }`,
   **When** called,
   **Then** user deactivated + audit event.

9. **Given** `PATCH /api/v1/users/:id` with `{ status: 'ACTIVE' }` (reactivation),
   **When** called for a user with name set,
   **Then** user reactivated.

## Technical Notes

### Testing Requirements

**Backend Integration (Real DB):**
- Resend invitation → verify old token invalidated, new token created, email sent
- Resend for non-INVITED user → verify rejection
- Deactivate user → verify status change + audit event
- Deactivated user requests OTP → verify OTP not sent (but response still `{ success: true }`)
- Reactivate user with profile → verify status ACTIVE
- Reactivate user without profile → verify status INVITED + invitation sent

**E2E Test:**
- Admin creates user → user doesn't onboard → admin resends → verify new email sent
- Admin deactivates user → user tries to log in → verify OTP not received
- Admin reactivates user → user can log in again

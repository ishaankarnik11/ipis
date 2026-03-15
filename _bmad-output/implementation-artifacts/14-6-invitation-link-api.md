# Story 14.6: Invitation Link API — Create, Validate, Complete Profile

Status: review

## Dev Agent Record

### Implementation Plan
- Created `invitation.service.ts` with `createInvitation()`, `validateInvitation()`, `completeProfile()`
- Added routes: `GET /auth/validate-invitation`, `POST /auth/complete-profile`
- Added `USER_LOGIN` and `USER_ONBOARD` to audit constants
- 10 integration tests covering create, validate (valid/expired/used/invalid), complete profile (success/expired/invalid/short name)

### Completion Notes
- AC1: createInvitation generates token, hashes, stores with 48hr expiry, invalidates previous, sends email
- AC2: validateInvitation returns email+role for valid token
- AC3-5: Expired/used/invalid tokens return appropriate error codes
- AC6: completeProfile sets name, status=ACTIVE, marks token used, issues JWT (auto-login)
- AC7-8: Expired token and missing name validations
- All 590 backend tests pass (38 files), typecheck clean

## File List

### New Files
- packages/backend/src/services/invitation.service.ts
- packages/backend/src/services/invitation.service.test.ts

### Modified Files
- packages/backend/src/routes/auth.routes.ts (validate-invitation, complete-profile endpoints)
- packages/shared/src/constants/audit.constants.ts (USER_LOGIN, USER_ONBOARD)
- packages/backend/src/services/otp.service.ts (use AUDIT_ACTIONS.USER_LOGIN)
- packages/backend/src/services/audit.service.test.ts (updated action count)

## Change Log
- 2026-03-15: Implemented invitation link API — create, validate, complete profile with auto-login

## Story

As a newly invited user,
I need to click a welcome link from my email, land on a profile setup page, and complete my account,
so that I can start using IPIS without needing an admin to set up my profile.

## Dependencies

- 14.1 (Email service)
- 14.2 (InvitationToken model, User status)

## Acceptance Criteria

### Create Invitation (internal — called by user creation and admin resend)

1. **Given** a user with status INVITED,
   **When** an invitation is created,
   **Then**:
   - A cryptographically random token is generated (`crypto.randomUUID()`)
   - SHA-256 hash stored in `InvitationToken` with 48-hour expiry
   - Any previous unused InvitationTokens for this user are invalidated (marked expired)
   - Welcome email sent with `{FRONTEND_URL}/accept-invitation/{token}`

### Validate Invitation: `GET /api/v1/auth/validate-invitation?token=xxx`

2. **Given** a valid, unexpired, unused invitation token,
   **When** validated,
   **Then** response: `{ valid: true, data: { email: "user@email.com", role: "FINANCE" } }` (so the profile setup page can show who they are).

3. **Given** an expired token (> 48 hours),
   **When** validated,
   **Then** response: `{ valid: false, error: "INVITATION_EXPIRED", message: "This invitation has expired. Please ask your administrator to resend it." }`

4. **Given** an already-used token,
   **When** validated,
   **Then** response: `{ valid: false, error: "INVITATION_USED", message: "This invitation has already been used. You can log in with your email." }`

5. **Given** an invalid/malformed token,
   **When** validated,
   **Then** response: `{ valid: false, error: "INVITATION_INVALID" }`

### Complete Profile: `POST /api/v1/auth/complete-profile`

6. **Given** a valid invitation token and profile data,
   **When** `{ token, name, departmentId? }` is submitted,
   **Then**:
   - User record updated: `name = provided name`, `departmentId = provided or null`, `status = ACTIVE`
   - InvitationToken marked `usedAt = now()`
   - AuditEvent logged: `USER_ONBOARD`
   - JWT cookie set (user is immediately logged in after completing profile)
   - Response: `{ data: { id, name, email, role } }`

7. **Given** profile completion with an expired token,
   **When** submitted,
   **Then** response: `{ success: false, error: "INVITATION_EXPIRED" }` (same as validation).

8. **Given** profile completion without a name,
   **When** submitted,
   **Then** validation error: name is required (min 2 characters).

## Technical Notes

### Token Security
Same pattern as the old password reset — never store plaintext tokens in DB:
```typescript
const token = crypto.randomUUID();
const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
// Store hashedToken in DB, send token in email URL
// On validation: hash the incoming token and compare
```

### Complete Profile Transaction
```typescript
await prisma.$transaction(async (tx) => {
  const invitation = await tx.invitationToken.findFirst({
    where: { hashedToken: hashSha256(token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!invitation) throw new ValidationError('Invalid or expired invitation');

  await tx.user.update({
    where: { id: invitation.userId },
    data: { name, departmentId: departmentId || null, status: 'ACTIVE' },
  });

  await tx.invitationToken.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  });
});
```

### Testing Requirements

**Backend Integration (Real DB):**
- Create invitation → verify token hashed in DB, email sent (Ethereal)
- Validate valid token → verify email and role returned
- Validate expired token → verify INVITATION_EXPIRED
- Validate used token → verify INVITATION_USED
- Complete profile with valid token → verify user status ACTIVE, name set, JWT cookie
- Complete profile with expired token → verify rejection
- Previous invitation invalidated when new one created
- Complete profile without name → verify validation error

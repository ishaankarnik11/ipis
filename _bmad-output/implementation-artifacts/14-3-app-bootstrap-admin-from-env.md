# Story 14.3: App Bootstrap — Auto-Create Admin from ADMIN_EMAIL on First Start

Status: review

## Story

As the person deploying IPIS for the first time,
I need the application to automatically create an admin account using the email from the ADMIN_EMAIL environment variable and send a welcome email,
so that I can start using the system without any manual database operations or seed scripts.

## Dependencies

- 14.1 (Gmail SMTP email service)
- 14.2 (Schema migration — User status, InvitationToken)

## Acceptance Criteria

1. **Given** `ADMIN_EMAIL=admin@company.com` is set in .env,
   **When** the app starts AND no users exist in the database,
   **Then** the system:
   - Creates a User with `email=admin@company.com`, `role=ADMIN`, `status=INVITED`, `name=null`
   - Generates an InvitationToken (48-hour expiry)
   - Sends a welcome email to admin@company.com with the invitation link
   - Logs: "Bootstrap: Admin account created for admin@company.com. Welcome email sent."

2. **Given** users already exist in the database,
   **When** the app starts,
   **Then** the bootstrap step is skipped entirely (idempotent — never creates duplicate admins).

3. **Given** `ADMIN_EMAIL` is not set,
   **When** the app starts AND no users exist,
   **Then** the app logs a warning: "ADMIN_EMAIL not set. No bootstrap admin created. Set ADMIN_EMAIL in .env to create the first admin account." App still starts (doesn't crash).

4. **Given** the bootstrap ran successfully,
   **When** the admin clicks the invitation link in their email,
   **Then** they land on the profile setup page, enter their name, and their status changes to ACTIVE.

5. **Given** the admin completes profile setup,
   **When** they navigate to login,
   **Then** they can log in via OTP (enter email → receive OTP → enter code → logged in).

## Technical Notes

### Implementation
```typescript
// packages/backend/src/bootstrap.ts
export async function bootstrapAdmin(prisma: PrismaClient) {
  const userCount = await prisma.user.count();
  if (userCount > 0) return; // Already bootstrapped

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('ADMIN_EMAIL not set. No bootstrap admin created.');
    return;
  }

  const user = await prisma.user.create({
    data: { email: adminEmail, role: 'ADMIN', status: 'INVITED' },
  });

  const token = crypto.randomUUID();
  await prisma.invitationToken.create({
    data: {
      userId: user.id,
      hashedToken: hashSha256(token),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const invitationUrl = `${FRONTEND_URL}/accept-invitation/${token}`;
  await sendWelcomeEmail(adminEmail, invitationUrl, 'ADMIN');
  logger.info({ email: adminEmail }, 'Bootstrap: Admin account created. Welcome email sent.');
}
```

Call `bootstrapAdmin()` after Prisma connects, before Express starts listening.

### Testing Requirements

**Backend Integration (Real DB):**
- Empty DB + ADMIN_EMAIL set → verify user created with ADMIN role + INVITED status
- Empty DB + ADMIN_EMAIL not set → verify warning logged, no user created
- DB with existing users → verify bootstrap skipped
- Run bootstrap twice → verify no duplicate admin created
- Verify InvitationToken created with correct expiry (48 hours)
- Verify email sent (via Ethereal test transport)

## Dev Agent Record

### Implementation Plan
- Created `bootstrap.ts` with `bootstrapAdmin()` function
- Hooked into `index.ts` — runs after Prisma connects, before Express listens
- Creates User (ADMIN/INVITED) + InvitationToken (SHA-256 hashed, 48hr expiry)
- Sends welcome email via `sendWelcomeEmail()` with invitation URL
- Gracefully handles email failure (admin created even if SMTP not configured)
- 6 integration tests covering all ACs

### Completion Notes
- AC1: Empty DB + ADMIN_EMAIL → creates admin + invitation token + sends email
- AC2: Users exist → bootstrap skipped (idempotent)
- AC3: ADMIN_EMAIL not set → warning logged, no crash
- AC4/AC5: Invitation link and OTP login will be wired in stories 14.6/14.4
- All 568 backend tests pass (36 files), typecheck clean

## File List

### New Files
- packages/backend/src/bootstrap.ts
- packages/backend/src/bootstrap.test.ts

### Modified Files
- packages/backend/src/index.ts (call bootstrapAdmin before listen)

## Change Log
- 2026-03-15: Implemented admin bootstrap from ADMIN_EMAIL env var with invitation token

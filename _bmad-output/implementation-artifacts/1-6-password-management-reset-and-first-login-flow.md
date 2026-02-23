# Story 1.6: Password Management — Reset & First-Login Flow

Status: ready-for-dev

## Story

As a user of any role,
I want to reset my forgotten password via email and set a personal password on first login,
so that I can always access my account and my credentials are set by me, not an Admin.

## Acceptance Criteria (AC)

1. **Given** an unauthenticated user at `/forgot-password`,
   **When** they enter an email and submit,
   **Then** `POST /api/v1/auth/forgot-password` is called; if the email matches an active user, a reset email is sent containing a secure 1-hour reset link; the UI always shows "If that email is registered, a reset link has been sent" — regardless of whether the email exists (prevents user enumeration).

2. **Given** a valid reset link at `/reset-password?token=...`,
   **When** the page loads,
   **Then** `GET /api/v1/auth/validate-reset-token?token=...` is called; if valid (not expired, not used), the reset form renders; if invalid/expired/used, the page shows "This reset link has expired or already been used. Request a new one."

3. **Given** the reset password form,
   **When** a user enters a new password (minimum 8 characters) and submits,
   **Then** `POST /api/v1/auth/reset-password` is called with the token and new password; on success: token `used_at` is set, password hash is updated, and the user is redirected to `/login` with "Password updated. Please log in."

4. **Given** the `password_reset_tokens` table,
   **When** a reset token is generated,
   **Then** only the SHA-256 hash of the token is stored in `token_hash` — the plaintext token is sent in the email link only, never stored; this story creates the Prisma migration for the `password_reset_tokens` table.

5. **Given** a user created by Admin with `must_change_password: true`,
   **When** they successfully log in with the temporary password,
   **Then** they are immediately redirected to `/change-password` — all other routes are blocked by the `AuthGuard` until this step is complete.

6. **Given** the forced `/change-password` screen,
   **When** the user submits a new password (minimum 8 characters),
   **Then** `POST /api/v1/auth/change-password` updates the password hash, sets `must_change_password: false`, and redirects to the role-appropriate landing page.

7. **Given** the forgot-password endpoint,
   **When** `express-rate-limit` is applied,
   **Then** `POST /api/v1/auth/forgot-password` allows maximum 5 requests per hour per IP; excess requests receive `429 TOO MANY REQUESTS`.

## Tasks / Subtasks

- [ ] Task 1: Prisma migration for password_reset_tokens (AC: 4)
  - [ ] 1.1 Add `PasswordResetToken` model to `prisma/schema.prisma`: id (UUID), userId (FK to User), tokenHash (String), expiresAt (DateTime), usedAt (DateTime?), createdAt (DateTime)
  - [ ] 1.2 Add `passwordResetTokens` relation to User model
  - [ ] 1.3 Run `prisma migrate dev --name add_password_reset_tokens`

- [ ] Task 2: Zod schemas for password management (AC: 1, 3, 6)
  - [ ] 2.1 Add to `shared/src/schemas/auth.schema.ts`: `forgotPasswordSchema` (email), `resetPasswordSchema` (token, newPassword min 8), `changePasswordSchema` (newPassword min 8)
  - [ ] 2.2 Export from shared barrel

- [ ] Task 3: Password reset service (AC: 1, 2, 3, 4)
  - [ ] 3.1 Add to `services/auth.service.ts` — `requestPasswordReset(email)`: find active user, generate UUID token, SHA-256 hash it, store in `password_reset_tokens` with 1-hour expiry, send email
  - [ ] 3.2 Add `validateResetToken(token)`: SHA-256 hash the input, find matching record, check `expiresAt > now` and `usedAt IS NULL`
  - [ ] 3.3 Add `resetPassword(token, newPassword)`: validate token, bcrypt hash new password, update `users.password_hash` + set `password_reset_tokens.used_at`, wrap in Prisma `$transaction`
  - [ ] 3.4 Add `changePassword(userId, newPassword)`: bcrypt hash, update `users.password_hash`, set `mustChangePassword: false`
  - [ ] 3.5 Create unit tests for all 4 functions

- [ ] Task 4: Email service (AC: 1)
  - [ ] 4.1 Create `services/email.service.ts` — `sendPasswordResetEmail(email, resetUrl)`
  - [ ] 4.2 For v1: log the email content with `logger.info` instead of actually sending (AWS SES integration deferred). Include the reset URL in the log so developers can test the flow.
  - [ ] 4.3 Structure the service so AWS SES can be plugged in later without refactoring the caller

- [ ] Task 5: Password management API routes (AC: 1, 2, 3, 7)
  - [ ] 5.1 Add to `routes/auth.routes.ts`:
    - `POST /api/v1/auth/forgot-password` — validate with `forgotPasswordSchema`, rate limit (5/hour/IP), call `requestPasswordReset()`, always return `{ success: true }`
    - `GET /api/v1/auth/validate-reset-token` — query param `token`, call `validateResetToken()`, return `{ data: { valid: true } }` or `{ data: { valid: false } }`
    - `POST /api/v1/auth/reset-password` — validate with `resetPasswordSchema`, call `resetPassword()`, return `{ success: true }`
  - [ ] 5.2 Add `POST /api/v1/auth/change-password` — protected via `authMiddleware`, validate with `changePasswordSchema`, call `changePassword(req.user.id)`, return `{ success: true }`
  - [ ] 5.3 Rate limiter for forgot-password: `rateLimit({ windowMs: 60 * 60 * 1000, limit: 5 })`

- [ ] Task 6: AuthGuard update for mustChangePassword (AC: 5)
  - [ ] 6.1 Update `GET /api/v1/auth/me` response to include `mustChangePassword` field
  - [ ] 6.2 Update `useAuth` hook to expose `mustChangePassword` from the me response
  - [ ] 6.3 Update `AuthGuard` in `router/guards.tsx` — if `user.mustChangePassword === true`, redirect to `/change-password` regardless of target route
  - [ ] 6.4 `/change-password` route is accessible only when `mustChangePassword` is true

- [ ] Task 7: Frontend pages (AC: 1, 2, 3, 5, 6)
  - [ ] 7.1 Create `pages/auth/ForgotPassword.tsx` — antd `Form` with email input, submit calls `POST /forgot-password`, success shows info message regardless of email validity
  - [ ] 7.2 Create `pages/auth/ResetPassword.tsx` — reads `token` from URL query param, validates on mount, shows form if valid or error message if invalid
  - [ ] 7.3 Create `pages/auth/ChangePassword.tsx` — antd `Form` with new password + confirm password, submit calls `POST /change-password`, on success redirects to landing page
  - [ ] 7.4 Add routes: `/forgot-password` and `/reset-password` as public (no AuthGuard), `/change-password` as protected

- [ ] Task 8: Login page update (AC: 5)
  - [ ] 8.1 Add "Forgot password?" link on Login page pointing to `/forgot-password`
  - [ ] 8.2 After login: if `mustChangePassword` is true in the me response, redirect to `/change-password` instead of landing page

- [ ] Task 9: Tests (AC: 1-7)
  - [ ] 9.1 Create `services/auth.service.test.ts` additions — test requestPasswordReset, validateResetToken, resetPassword, changePassword
  - [ ] 9.2 Create `routes/auth.routes.test.ts` additions — integration tests for forgot-password, validate-reset-token, reset-password, change-password endpoints
  - [ ] 9.3 Create `pages/auth/ForgotPassword.test.tsx`, `ResetPassword.test.tsx`, `ChangePassword.test.tsx` — component tests
  - [ ] 9.4 Test rate limiting on forgot-password endpoint

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Token storage**: Store SHA-256 hash of token in DB, NEVER plaintext. Use `crypto.createHash('sha256').update(token).digest('hex')`.
2. **User enumeration prevention**: `POST /forgot-password` ALWAYS returns `{ success: true }` regardless of whether email exists. The email sending (or logging) happens fire-and-forget.
3. **Prisma transaction**: `resetPassword` must use `$transaction` to atomically update password_hash AND set token used_at.
4. **Layer separation**: Password logic in `auth.service.ts`. Email sending in `email.service.ts`. Route handlers are thin.
5. **bcrypt salt rounds**: 10 (consistent with Story 1.2 pattern).
6. **Rate limiting**: Login is 10/15min (Story 1.2), forgot-password is 5/1hour. Different limiters, different windows.
7. **Credentials in fetch**: Frontend uses `credentials: 'include'` via `api.ts` wrapper.
8. **mustChangePassword in auth flow**: The `/auth/me` response must include this field. AuthGuard checks it before allowing navigation.

### Token Generation Pattern (Critical — use crypto, NOT jose)

```typescript
import crypto from 'node:crypto';

function generateResetToken(): { plaintext: string; hash: string } {
  const plaintext = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

- Use `crypto.randomUUID()` for token generation — no need for jose here
- SHA-256 hash for storage (fast, deterministic — not bcrypt, which is slow and salted)
- bcrypt is for passwords only; SHA-256 is for one-time tokens

### Reset URL Format

```typescript
const resetUrl = `${config.frontendUrl}/reset-password?token=${plaintext}`;
// e.g., http://localhost:5173/reset-password?token=550e8400-e29b-41d4-a716-446655440000
```

Add `frontendUrl` to `lib/config.ts`:
```typescript
frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',
```

### Email Service Pattern (Stub for v1)

```typescript
// services/email.service.ts
import { logger } from '../lib/logger.js';

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  // TODO: Replace with AWS SES in production
  logger.info({ to: email, resetUrl }, 'Password reset email (dev mode — not actually sent)');
}
```

### Prisma Model Addition

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id])
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@map("password_reset_tokens")
}
```

Also add to User model:
```prisma
  passwordResetTokens PasswordResetToken[]
```

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Auth service | `services/auth.service.ts` | Created in Story 1.2 — add new functions here |
| Auth routes | `routes/auth.routes.ts` | Created in Story 1.2 — add new endpoints here |
| Auth middleware | `middleware/auth.middleware.ts` | For protecting /change-password |
| Validate middleware | `middleware/validate.middleware.ts` | For Zod validation |
| bcrypt | Already installed | For password hashing |
| express-rate-limit | Already installed | For forgot-password rate limiting |
| API wrapper | `frontend/services/api.ts` | Created in Story 1.3 |
| useAuth hook | `frontend/hooks/useAuth.ts` | Created in Story 1.3 — update to expose mustChangePassword |
| AuthGuard | `frontend/router/guards.tsx` | Created in Story 1.3 — update to check mustChangePassword |
| Login page | `frontend/pages/auth/Login.tsx` | Created in Story 1.3 — add "Forgot password?" link |
| Error classes | `lib/errors.ts` | UnauthorizedError, ValidationError, NotFoundError |
| Logger | `lib/logger.ts` | For email stub logging |
| Config | `lib/config.ts` | Add frontendUrl |

### Frontend Password Form Pattern

```tsx
// Reusable password field with confirmation
<Form.Item name="newPassword" label="New Password" rules={[
  { required: true, message: 'Password is required' },
  { min: 8, message: 'Password must be at least 8 characters' },
]}>
  <Input.Password />
</Form.Item>
<Form.Item name="confirmPassword" label="Confirm Password" dependencies={['newPassword']} rules={[
  { required: true, message: 'Please confirm your password' },
  ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
      return Promise.reject(new Error('Passwords do not match'));
    },
  }),
]}>
  <Input.Password />
</Form.Item>
```

### New Dependencies Required

None — all dependencies already installed.

### Project Structure Notes

New files to create:
```
packages/backend/src/
├── services/
│   └── email.service.ts           # Email sending stub (logs in dev)

packages/frontend/src/
├── pages/
│   └── auth/
│       ├── ForgotPassword.tsx      # Forgot password page
│       ├── ResetPassword.tsx       # Reset password page (with token)
│       └── ChangePassword.tsx      # First-login forced password change
```

Prisma migration:
```
packages/backend/prisma/
├── schema.prisma                   # Add PasswordResetToken model
└── migrations/                     # New migration for password_reset_tokens table
```

Existing files to modify:
```
packages/backend/src/services/auth.service.ts    # Add 4 new functions
packages/backend/src/routes/auth.routes.ts       # Add 4 new endpoints
packages/backend/src/lib/config.ts               # Add frontendUrl
packages/frontend/src/hooks/useAuth.ts           # Add mustChangePassword
packages/frontend/src/router/guards.tsx          # Check mustChangePassword in AuthGuard
packages/frontend/src/router/index.tsx           # Add forgot-password, reset-password, change-password routes
packages/frontend/src/pages/auth/Login.tsx       # Add "Forgot password?" link
packages/shared/src/schemas/auth.schema.ts       # Add forgotPassword, resetPassword, changePassword schemas
packages/shared/src/schemas/index.ts             # Export new schemas
```

### Testing Strategy

- **Unit tests** (Vitest): auth.service new functions (requestPasswordReset, validateResetToken, resetPassword, changePassword) with mocked Prisma and mocked email service
- **Integration tests** (Vitest + supertest): new auth route endpoints
- **Component tests** (Vitest + React Testing Library): ForgotPassword, ResetPassword, ChangePassword pages
- **Rate limit test**: Verify 429 after 5 requests to forgot-password
- **Token validation tests**: Valid token succeeds, expired token fails, used token fails, invalid token fails

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.6]
- [Source: _bmad-output/planning-artifacts/architecture.md — Password Reset Tokens, Auth Endpoints, Token Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR49, FR50, NFR6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form patterns, Validation, Accessibility]

### Previous Story Intelligence

**From 1.2:** Auth service, auth routes, auth middleware, RBAC middleware, validate middleware, JWT utilities, bcrypt patterns all established. This story extends the auth service and routes with password management functions.

**From 1.3:** useAuth hook, AuthGuard, Login page, API wrapper, router all established. This story updates AuthGuard to check `mustChangePassword` and adds 3 new public pages.

**From 1.4:** User creation sets `mustChangePassword: true` — this story implements the enforcement of that flag in the first-login flow.

**Issues to avoid:**
- Use SHA-256 (not bcrypt) for token hashing — tokens are one-time-use, don't need salted slow hashing
- Use `crypto.randomUUID()` (not jose) for token generation
- Always return success on forgot-password regardless of email existence
- Prisma $transaction for atomic password update + token redemption

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

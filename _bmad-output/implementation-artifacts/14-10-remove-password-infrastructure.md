# Story 14.10: Remove Password Infrastructure

Status: review

## Dev Agent Record

### Implementation Plan
Most password infrastructure was already removed in story 14.2 (schema migration). This story completed the cleanup:
- Removed `bcrypt` and `@types/bcrypt` from dependencies
- Deleted `auth.schema.ts` (dead file with password schemas)
- Removed deprecated `sendPasswordResetEmail` from email.service.ts
- Cleaned up test mock data: replaced `mustChangePassword` with `status`

### Verification
- `grep -r "bcrypt"` → zero hits in source
- `grep -r "mustChangePassword"` → zero hits in source
- `grep -r "passwordHash"` → one hit in test asserting it's undefined (valid)
- All 589 backend + 349 frontend tests pass, typecheck clean

## File List

### Deleted Files
- packages/shared/src/schemas/auth.schema.ts

### Modified Files
- packages/backend/package.json (removed bcrypt, @types/bcrypt)
- packages/backend/src/services/email.service.ts (removed sendPasswordResetEmail)
- packages/backend/src/services/email.service.test.ts (removed deprecated test)
- packages/frontend/src/pages/admin/SystemConfig.test.tsx (cleaned mock)
- packages/frontend/src/pages/admin/user-management-actions.test.tsx (cleaned mock)

## Change Log
- 2026-03-15: Removed bcrypt dependency, deleted auth.schema.ts, cleaned all password references

## Story

As the codebase,
All password-related code, routes, guards, dependencies, and tests must be removed,
so that there is no dead code and no confusion about the auth mechanism.

## Dependencies

- 14.4, 14.5 (OTP auth fully working — must replace passwords before removing them)

## Acceptance Criteria

1. **Given** the backend routes,
   **When** reviewed,
   **Then** these endpoints are REMOVED:
   - `POST /api/v1/auth/login` (password login)
   - `POST /api/v1/auth/change-password`
   - `POST /api/v1/auth/forgot-password`
   - `POST /api/v1/auth/reset-password`
   - `GET /api/v1/auth/validate-reset-token`

2. **Given** the backend services,
   **When** reviewed,
   **Then** these functions are REMOVED from `auth.service.ts`:
   - `login()` (password-based)
   - `changePassword()`
   - `requestPasswordReset()`
   - `resetPassword()`
   - `validateResetToken()`
   - `cleanupExpiredTokens()` (for PasswordResetToken)

3. **Given** package.json,
   **When** reviewed,
   **Then** `bcrypt` and `@types/bcrypt` are REMOVED from dependencies.

4. **Given** the frontend router,
   **When** reviewed,
   **Then** these routes/pages are REMOVED:
   - `/change-password` (ChangePassword.tsx)
   - `/forgot-password` (ForgotPassword.tsx)
   - `/reset-password` (ResetPassword.tsx)
   - `ChangePasswordGuard`

5. **Given** the frontend Login page,
   **When** rendered,
   **Then** it shows the email + OTP flow (from Story 14.5), NOT a password form. The "Forgot Password?" link is REMOVED.

6. **Given** the `useAuth` hook,
   **When** reviewed,
   **Then** all `mustChangePassword` logic is REMOVED.

7. **Given** the shared Zod schemas,
   **When** reviewed,
   **Then** `loginSchema`, `changePasswordSchema`, `resetPasswordSchema` are REMOVED or replaced with OTP schemas.

8. **Given** all test files,
   **When** `pnpm test` runs,
   **Then** all password-related tests are REMOVED and all remaining tests pass.

9. **Given** the `lib/jwt.ts`,
   **When** reviewed,
   **Then** JWT signing/verification remains (still used for session after OTP verification). Only password-related imports/utilities are removed.

## Technical Notes

### Files to Delete
```
packages/frontend/src/pages/auth/ChangePassword.tsx
packages/frontend/src/pages/auth/ChangePassword.test.tsx
packages/frontend/src/pages/auth/ForgotPassword.tsx
packages/frontend/src/pages/auth/ForgotPassword.test.tsx
packages/frontend/src/pages/auth/ResetPassword.tsx
packages/frontend/src/pages/auth/ResetPassword.test.tsx
packages/frontend/src/router/guards/ChangePasswordGuard.tsx
```

### Files to Modify
```
packages/backend/src/services/auth.service.ts — remove password functions
packages/backend/src/services/auth.service.test.ts — remove password tests
packages/backend/src/routes/auth.routes.ts — remove password routes
packages/backend/src/routes/auth.routes.test.ts — remove password route tests
packages/backend/src/middleware/auth.middleware.ts — no mustChangePassword check
packages/frontend/src/hooks/useAuth.ts — remove mustChangePassword
packages/frontend/src/router/index.tsx — remove password routes + guards
packages/shared/src/schemas/ — remove password schemas
package.json — remove bcrypt
```

### Testing Requirements

**Verification (not new tests — removal validation):**
- `pnpm test` passes with zero password-related tests
- `pnpm typecheck` passes with zero password-related types
- `grep -r "password" --include="*.ts" --include="*.tsx" packages/` returns zero hits (excluding this story file and any intentional references like "one-time-password" or "app-password")
- `grep -r "bcrypt" packages/` returns zero hits
- All OTP auth tests from 14.4/14.5 continue to pass

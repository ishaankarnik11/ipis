# Story 14.4: OTP Request + Verify API (Backend)

Status: review

## Story

As a user logging into IPIS,
I need to request a 6-digit OTP sent to my email and verify it to authenticate,
so that I can log in securely without a password.

## Dependencies

- 14.1 (Email service)
- 14.2 (OtpToken model)

## Acceptance Criteria

### OTP Request: `POST /api/v1/auth/request-otp`

1. **Given** a valid email for an ACTIVE user,
   **When** OTP is requested,
   **Then**:
   - A cryptographically random 6-digit numeric OTP is generated
   - SHA-256 hash of the OTP is stored in `OtpToken` with 5-minute expiry, attempts=0
   - Real email is sent via Gmail SMTP with the OTP
   - Any previous unused OtpTokens for this user are invalidated (marked expired)
   - Response: `{ success: true, message: "OTP sent to your email" }` (no OTP in response)

2. **Given** an email for an INVITED user (hasn't completed profile),
   **When** OTP is requested,
   **Then** response: `{ success: false, error: "PROFILE_INCOMPLETE", message: "Please complete your profile setup first. Check your email for the invitation link." }`

3. **Given** an email for a DEACTIVATED user,
   **When** OTP is requested,
   **Then** response: `{ success: true }` (same as valid user — no email enumeration). No OTP is actually sent.

4. **Given** an email that doesn't exist,
   **When** OTP is requested,
   **Then** response: `{ success: true }` (same as valid — no email enumeration). No OTP sent.

5. **Given** 5 OTP requests for the same email within 10 minutes,
   **When** a 6th request is made,
   **Then** response: `{ success: false, error: "RATE_LIMITED", message: "Too many OTP requests. Please try again in X minutes.", retryAfterSeconds: N }`

6. **Given** `MASTER_OTP` env var is set (local dev),
   **When** OTP is requested,
   **Then** the real OTP is also logged to console: `[DEV] OTP for user@email.com: 123456`

### OTP Verify: `POST /api/v1/auth/verify-otp`

7. **Given** a valid OTP entered within 5 minutes with < 3 attempts,
   **When** verified,
   **Then**:
   - OtpToken marked `usedAt = now()`
   - JWT cookie set (same `ipis_token` HTTP-only cookie, 2-hour sliding expiry)
   - AuditEvent logged: `USER_LOGIN`
   - Response: `{ data: { id, name, email, role } }`

8. **Given** an incorrect OTP,
   **When** verified,
   **Then**:
   - `attempts` incremented on the OtpToken
   - Response: `{ success: false, error: "INVALID_OTP", attemptsRemaining: N }`

9. **Given** 3 incorrect attempts on the same OtpToken,
   **When** a 4th attempt is made,
   **Then**: response: `{ success: false, error: "OTP_EXHAUSTED", message: "Too many incorrect attempts. Please request a new OTP." }`

10. **Given** an expired OTP (> 5 minutes old),
    **When** verified,
    **Then**: response: `{ success: false, error: "OTP_EXPIRED", message: "OTP has expired. Please request a new one." }`

11. **Given** `MASTER_OTP=000000` is set,
    **When** the user enters `000000`,
    **Then** it is accepted as valid regardless of the real OTP (dev bypass).

## Technical Notes

### OTP Generation
```typescript
import crypto from 'crypto';

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString(); // Cryptographically random
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}
```

### Rate Limiting
Count OtpTokens created for this userId in the last 10 minutes. If >= 5, reject.
```sql
SELECT COUNT(*) FROM "OtpToken" WHERE "userId" = $1 AND "createdAt" > NOW() - INTERVAL '10 minutes'
```

### Cleanup
Add a scheduled cleanup (or on-request cleanup) to delete OtpTokens older than 1 hour (expired + buffer).

### Testing Requirements

**Backend Integration (Real DB):**
- Request OTP for active user → verify OtpToken created with hashed OTP and 5-min expiry
- Request OTP for non-existent email → verify no token created, response still `{ success: true }`
- Verify OTP with correct code → verify JWT cookie set, token marked used
- Verify OTP with wrong code → verify attempts incremented, correct error response
- 3 wrong attempts → verify OTP_EXHAUSTED error
- Verify expired OTP → verify OTP_EXPIRED error
- Rate limit: create 5 tokens in 10 min → verify 6th request rejected with retryAfterSeconds
- Master OTP: set MASTER_OTP=000000 → verify 000000 accepted for any user
- Previous OTP invalidated when new one is requested

## Dev Agent Record

### Implementation Plan
- Created `otp.service.ts` with `requestOtp()` and `verifyOtp()` functions
- Added `POST /auth/request-otp` and `POST /auth/verify-otp` routes
- OTP: crypto.randomInt 6-digit, SHA-256 hashed, 5-min expiry, max 3 attempts
- Rate limit: 5 requests per email per 10 minutes (service-level) + IP rate limit (route-level)
- Anti-enumeration: non-existent/deactivated emails return `{ success: true }`
- INVITED users get `PROFILE_INCOMPLETE` error
- MASTER_OTP bypass for dev login
- Previous unused OTPs invalidated on new request
- 12 integration tests (real DB)

### Completion Notes
- AC1: OTP generated, hashed, stored, email sent — verified
- AC2: INVITED user → PROFILE_INCOMPLETE — verified
- AC3-4: Non-existent/deactivated → success response (anti-enumeration) — verified
- AC5: Rate limit after 5 requests with retryAfterSeconds — verified
- AC6: MASTER_OTP logs OTP to console — implemented
- AC7: Correct OTP → JWT cookie + user data — verified
- AC8: Wrong OTP → attempts incremented — verified
- AC9: 3 wrong attempts → OTP_EXHAUSTED — verified
- AC10: Expired OTP → OTP_EXPIRED — verified
- AC11: MASTER_OTP bypass — verified
- All 580 backend tests pass (37 files), typecheck clean

## File List

### New Files
- packages/backend/src/services/otp.service.ts
- packages/backend/src/services/otp.service.test.ts

### Modified Files
- packages/backend/src/routes/auth.routes.ts (added request-otp and verify-otp endpoints)

## Change Log
- 2026-03-15: Implemented OTP request + verify API with rate limiting, expiry, and MASTER_OTP bypass

**No Mocks:**
- Real DB for all token operations
- Real email via Ethereal test transport (verify email received)

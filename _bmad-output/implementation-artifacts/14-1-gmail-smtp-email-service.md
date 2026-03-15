# Story 14.1: Gmail SMTP Email Service (Real Nodemailer)

Status: review

## Story

As the system,
I need a real email delivery service using Gmail SMTP via Nodemailer,
so that OTPs, welcome links, and system notifications are delivered to real email addresses.

## Context

The current `email.service.ts` is a no-op stub that logs to console. This story replaces it with a fully functional email service backed by Gmail SMTP. This is the foundation for all other stories in this epic.

## Acceptance Criteria

1. **Given** valid SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM),
   **When** the app starts,
   **Then** a Nodemailer transport is created and verified (SMTP connection test on startup).

2. **Given** missing or invalid SMTP env vars,
   **When** the app starts,
   **Then** it logs a clear error: "Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env" and fails to start (email is mandatory, not optional).

3. **Given** `NODE_ENV=development` AND `MASTER_OTP` is set,
   **When** an email would be sent,
   **Then** the email content is logged to console (full subject + body) AND the email is still sent via SMTP (so devs can verify real delivery if they want).

4. **Given** a valid transport,
   **When** `sendOtpEmail(email, otp)` is called,
   **Then** a professional HTML email is sent with:
   - Subject: "Your IPIS login code: XXXXXX"
   - Body: the 6-digit OTP prominently displayed, expiry notice ("valid for 5 minutes"), company branding
   - Plain text fallback

5. **Given** a valid transport,
   **When** `sendWelcomeEmail(email, invitationUrl, role)` is called,
   **Then** a professional HTML email is sent with:
   - Subject: "Welcome to IPIS — Complete your setup"
   - Body: welcome message, the invitation link as a prominent button, role mentioned, expiry notice ("link valid for 48 hours")
   - Plain text fallback

6. **Given** an email send fails (SMTP error, timeout),
   **When** the error is caught,
   **Then** it is logged with full details (recipient, error message) and the calling function receives a thrown error (not silently swallowed).

## Technical Notes

### Dependencies
```bash
pnpm --filter backend add nodemailer
pnpm --filter backend add -D @types/nodemailer
```

### Environment Variables
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # Gmail App Password
SMTP_FROM="IPIS <your-gmail@gmail.com>"
```

### File Structure
```
packages/backend/src/
├── lib/email.ts              # Nodemailer transport setup, send function
├── services/email.service.ts # sendOtpEmail, sendWelcomeEmail (replaces stub)
└── templates/                # HTML email templates
    ├── otp.html
    └── welcome.html
```

### Email Templates
Keep templates simple — inline CSS (email clients don't support external stylesheets). Use a clean, professional layout with the IPIS brand. No images (reduces spam score).

### Gmail App Password Setup
Gmail requires:
1. Google account with 2FA enabled
2. Generate App Password at myaccount.google.com → Security → App Passwords
3. Use that 16-character password as SMTP_PASS

### Testing Requirements

**Backend Integration (Real SMTP):**
- Use Nodemailer's `createTestAccount()` + Ethereal for tests — this creates a real SMTP session with a throwaway mailbox, no Gmail credentials needed in CI
- Verify: email sent → Ethereal API confirms receipt → subject and body match
- Verify: invalid SMTP credentials → throws with clear error
- Verify: transport.verify() called on startup

**No Mocks:**
- Do NOT mock Nodemailer. Use Ethereal (Nodemailer's built-in test service) for automated tests.
- The stub pattern (`logger.info('not actually sent')`) is deleted entirely.

## Dev Agent Record

### Implementation Plan
1. Installed `nodemailer` + `@types/nodemailer`
2. Replaced `lib/email.ts` (was AWS SES stub) with Nodemailer transport: `initEmailTransport()`, `initTestTransport()`, `sendMail()`, `sendEmail()` (backwards compat)
3. Replaced `services/email.service.ts` (was no-op stub) with `sendOtpEmail()` and `sendWelcomeEmail()` with professional inline-CSS HTML templates
4. Added SMTP config to `lib/config.ts` (`smtp.host`, `smtp.port`, `smtp.user`, `smtp.pass`, `smtp.from`, `masterOtp`)
5. Kept deprecated `sendPasswordResetEmail()` for backwards compat with auth.service.ts (removed in 14.10)
6. Tests use Ethereal (Nodemailer's built-in test service) — real SMTP, no mocks

### Completion Notes
- AC1: `initEmailTransport()` creates Nodemailer transport and calls `.verify()` on startup
- AC2: Missing SMTP env vars throws clear error message listing required vars
- AC3: Dev mode with MASTER_OTP logs email content to console AND sends via SMTP
- AC4: `sendOtpEmail()` sends HTML email with 6-digit OTP, expiry notice, plain text fallback
- AC5: `sendWelcomeEmail()` sends HTML email with CTA button, role label, 48hr expiry notice
- AC6: SMTP errors throw with recipient and error details, never silently swallowed
- All 606 backend tests pass (Ethereal real SMTP tests), 366 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/backend/src/lib/email.ts (replaced AWS SES with Nodemailer transport)
- packages/backend/src/lib/config.ts (added smtp config + masterOtp)
- packages/backend/src/services/email.service.ts (replaced stub with sendOtpEmail + sendWelcomeEmail)
- packages/backend/src/services/email.service.test.ts (Ethereal tests, no mocks)
- packages/backend/package.json (added nodemailer dependency)

### New Files
- packages/backend/src/lib/email.test.ts (transport init tests)

## Change Log
- 2026-03-15: Replaced email stubs with real Nodemailer SMTP service + Ethereal tests

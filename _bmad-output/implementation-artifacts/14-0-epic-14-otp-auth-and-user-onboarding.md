# Epic 14: OTP-Based Authentication & User Onboarding

## Goal

Replace password-based authentication with OTP-via-email login. Implement real email delivery via Gmail SMTP. Redesign user onboarding so admin only enters email + role, the system sends a welcome link, and the user completes their own profile. Bootstrap the admin account from an environment variable on first app start.

## Source

Party Mode session 2026-03-15: ishaan requested full reinvention of user onboarding. Key directives:
- "No more mock data"
- "I want real thought put in UX, I want users consulted"
- "Move away from password to OTP to real mail — fully backed feature just like how we have on live products"
- "Role is for users of the application. Designation is organizational."

## Architecture Overview

### Email: Gmail SMTP via Nodemailer

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password     # Gmail App Password (requires 2FA enabled)
SMTP_FROM="IPIS <your-gmail@gmail.com>"
ADMIN_EMAIL=admin@yourcompany.com
MASTER_OTP=000000               # Local dev only — bypasses real OTP
```

### Auth Flow (No Passwords)

```
Login: email → Send OTP → 6-digit OTP via email → verify → JWT session
Onboarding: admin creates user (email+role) → welcome link via email → user sets up profile
Bootstrap: first start → ADMIN_EMAIL gets admin account + welcome email
```

### Database Changes

```
REMOVE from User: passwordHash, mustChangePassword
ADD to User: status (INVITED | ACTIVE | DEACTIVATED) — replaces isActive boolean
NEW model: OtpToken (id, userId, hashedOtp, expiresAt, attempts, createdAt, usedAt)
NEW model: InvitationToken (id, userId, hashedToken, expiresAt, usedAt)
REMOVE model: PasswordResetToken
```

### What Gets Removed

- Password login (POST /api/v1/auth/login with email+password)
- Password change flow (POST /api/v1/auth/change-password)
- Forgot password flow (POST /api/v1/auth/forgot-password)
- Password reset flow (POST /api/v1/auth/reset-password)
- mustChangePassword guard (ChangePasswordGuard)
- bcrypt dependency
- All seed user passwords

## Exit Criteria

- Admin email configured via env → app starts → admin receives real welcome email
- Admin creates user (email + role only) → user receives welcome email → clicks link → fills in name → can log in via OTP
- OTP login works end-to-end with real Gmail delivery
- Local dev: MASTER_OTP bypasses real OTP, emails logged to console
- No passwords anywhere in the system
- No mock/stub email service — real Nodemailer + Gmail SMTP
- All 5 persona agents can complete onboarding + OTP login in E2E tests
- Seed script creates departments, employees, projects but NOT users

## Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| OTP length | 6 digits | Industry standard (Google, Slack, Linear) |
| OTP expiry | 5 minutes | Long enough to check email, short enough for security |
| OTP max attempts | 3 per token | Prevents brute force (6 digits = 1M combos, 3 tries = negligible odds) |
| Resend cooldown | 60 seconds | Prevents spam, gives email time to arrive |
| Resend limit | 5 per email per 10 minutes | Rate limiting against abuse |
| Welcome link expiry | 48 hours | Internal tool — people may not check email immediately |
| Admin can resend invitation | Yes | In case user missed or link expired |
| Session | 2-hour sliding JWT | Keep existing behavior — works well for internal tools |
| User status | INVITED → ACTIVE → DEACTIVATED | 3-state replaces isActive boolean |
| Department on profile setup | Optional | ADMIN, FINANCE roles may not belong to a department |
| Local dev master OTP | Configurable via MASTER_OTP env var | No mock email service — real infra with a dev escape hatch |
| Email provider | Gmail SMTP via Nodemailer | Simple, no third-party signup needed |

## Story Map

### Sprint A — Infrastructure & Schema

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 14.1 | Gmail SMTP email service (real Nodemailer) | P0 | None |
| 14.2 | Schema migration — remove passwords, add OTP/Invitation models, user status enum | P0 | None |
| 14.3 | App bootstrap — auto-create admin from ADMIN_EMAIL on first start | P0 | 14.1, 14.2 |

### Sprint B — Auth Flows

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 14.4 | OTP request + verify API (backend) | P0 | 14.1, 14.2 |
| 14.5 | OTP login UX — email screen, digit input, countdown, resend, error states | P0 | 14.4 |
| 14.6 | Invitation link API — create, validate, complete profile | P0 | 14.1, 14.2 |
| 14.7 | User onboarding UX — welcome page, profile setup form | P0 | 14.6 |

### Sprint C — Admin & Cleanup

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 14.8 | Admin user creation — simplified modal (email + role) + invitation email | P0 | 14.6 |
| 14.9 | Admin resend invitation + user status management | P1 | 14.8 |
| 14.10 | Remove password infrastructure — delete old auth routes, bcrypt, guards, seed passwords | P1 | 14.4, 14.5 |
| 14.11 | Update seed script — no users, bootstrap-only admin | P1 | 14.3 |
| 14.12 | E2E tests — full onboarding + OTP login journeys | P0 | All above |

## Testing Philosophy (from Epic 13, applies here too)

- No mocked email — tests use real Nodemailer in test mode (ethereal.email or captured transport)
- OTP tests verify real hashing, expiry, attempt counting against real DB
- E2E tests use MASTER_OTP for deterministic login
- Invitation flow tested end-to-end: create user → capture invitation link → visit → complete profile → OTP login

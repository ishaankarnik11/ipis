---
stepsCompleted: [1]
inputDocuments:
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/implementation-artifacts/14-0-epic-14-otp-auth-and-user-onboarding.md
  - _bmad-output/implementation-artifacts/14-5-otp-login-ux.md
  - _bmad-output/implementation-artifacts/14-7-user-onboarding-ux.md
  - _bmad-output/implementation-artifacts/13-6-fix-share-link-ux-and-backend.md
  - _bmad-output/implementation-artifacts/13-8-fix-add-team-member-modal-layout.md
  - _bmad-output/implementation-artifacts/13-9-pending-approvals-show-project-details.md
---

# UX Design Specification — Epic 13 & 14

**Author:** ishaan (UX facilitated by Sally)
**Date:** 2026-03-15
**Scope:** OTP-based authentication, user onboarding, and Epic 13 UI interactions

---

## Part 1: Epic 14 — Authentication & Onboarding UX

---

### 1.1 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME APP BOOTSTRAP                     │
│                                                                 │
│  App starts → No users in DB                                    │
│  ├─ ADMIN_EMAIL set? ──YES──→ Create admin (INVITED)            │
│  │                            ├─ Generate InvitationToken       │
│  │                            └─ Send welcome email             │
│  └─ ADMIN_EMAIL not set? ──→ Log warning, app starts empty      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN CREATES USER                            │
│                                                                 │
│  Admin opens User Management                                    │
│  ├─ Clicks "Invite User"                                        │
│  ├─ Modal: [email] + [role dropdown]                            │
│  ├─ Clicks "Send Invitation"                                    │
│  │   ├─ Success → Toast: "Invitation sent to user@email.com"   │
│  │   ├─ Duplicate email → Inline error: "Email already exists" │
│  │   └─ SMTP failure → Inline error: "Failed to send. Retry?"  │
│  └─ User appears in list: status=INVITED, name="Pending setup" │
│                                                                 │
│  Actions on INVITED user:                                       │
│  ├─ "Resend Invitation" → new token, new email                  │
│  └─ "Deactivate" → status=DEACTIVATED                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 USER ONBOARDING (INVITATION FLOW)               │
│                                                                 │
│  User receives email → clicks "Complete Your Setup" button      │
│        │                                                        │
│        ▼                                                        │
│  /accept-invitation/:token                                      │
│  ├─ [LOADING] Skeleton card while validating token              │
│  │                                                              │
│  ├─ [VALID TOKEN]                                               │
│  │   ┌──────────────────────────────────┐                       │
│  │   │        Welcome to IPIS           │                       │
│  │   │                                  │                       │
│  │   │  You've been invited as          │                       │
│  │   │  ● Finance Manager              │                       │
│  │   │                                  │                       │
│  │   │  your.email@company.com (locked) │                       │
│  │   │                                  │                       │
│  │   │  Full Name _______________       │                       │
│  │   │  Department [optional ▾]         │                       │
│  │   │                                  │                       │
│  │   │  [  Complete Setup  ]            │                       │
│  │   └──────────────────────────────────┘                       │
│  │   ├─ Success → "You're all set! ✓" (500ms)                  │
│  │   │            → Auto-redirect to role landing page          │
│  │   │            → JWT cookie set (user is now logged in)      │
│  │   └─ Failure → Inline error with retry button                │
│  │                                                              │
│  ├─ [EXPIRED TOKEN]                                             │
│  │   ┌──────────────────────────────────┐                       │
│  │   │     Invitation Expired           │                       │
│  │   │                                  │                       │
│  │   │  This link is no longer valid.   │                       │
│  │   │  Ask your administrator to       │                       │
│  │   │  resend the invitation.          │                       │
│  │   └──────────────────────────────────┘                       │
│  │                                                              │
│  ├─ [USED TOKEN]                                                │
│  │   ┌──────────────────────────────────┐                       │
│  │   │     Already Set Up               │                       │
│  │   │                                  │                       │
│  │   │  This invitation was already     │                       │
│  │   │  used. You can sign in now.      │                       │
│  │   │                                  │                       │
│  │   │  [  Go to Sign In  ]             │                       │
│  │   └──────────────────────────────────┘                       │
│  │                                                              │
│  └─ [INVALID TOKEN]                                             │
│      ┌──────────────────────────────────┐                       │
│      │     Invalid Link                 │                       │
│      │                                  │                       │
│      │  This link doesn't look right.   │                       │
│      │  Check the link in your email    │                       │
│      │  or contact your administrator.  │                       │
│      └──────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      OTP LOGIN FLOW                             │
│                                                                 │
│  /login                                                         │
│  ┌──────────────────────────────────┐                           │
│  │       Sign in to IPIS            │                           │
│  │                                  │                           │
│  │  Work email _______________      │                           │
│  │                                  │                           │
│  │  [    Send verification code   ] │                           │
│  │                                  │                           │
│  └──────────────────────────────────┘                           │
│  │                                                              │
│  ├─ [SENDING] Button: spinner + "Sending..."                    │
│  ├─ [RATE LIMITED] Alert: "Too many attempts. Try in Xm."       │
│  ├─ [INVITED USER] Alert: "Complete setup first. Check email."  │
│  │                                                              │
│  ▼ Success → transition to /verify-otp                          │
│                                                                 │
│  /verify-otp (state: { email })                                 │
│  ┌──────────────────────────────────┐                           │
│  │    Enter verification code       │                           │
│  │                                  │                           │
│  │  We sent a 6-digit code to       │                           │
│  │  v●●●●m@company.com             │                           │
│  │                                  │                           │
│  │    ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐     │                           │
│  │    │ │ │ │ │ │ │ │ │ │ │ │     │                           │
│  │    └─┘ └─┘ └─┘ └─┘ └─┘ └─┘     │                           │
│  │                                  │                           │
│  │  Resend code in 0:47             │                           │
│  │                                  │                           │
│  │  ← Use a different email         │                           │
│  └──────────────────────────────────┘                           │
│  │                                                              │
│  ├─ [CORRECT OTP]                                               │
│  │   → Boxes flash green briefly (300ms)                        │
│  │   → Checkmark icon replaces boxes (200ms)                    │
│  │   → Redirect to role landing page                            │
│  │                                                              │
│  ├─ [WRONG OTP]                                                 │
│  │   → Boxes shake horizontally (CSS animation, 400ms)          │
│  │   → Boxes clear, refocus on first                            │
│  │   → Text below: "Incorrect code. 2 attempts remaining."     │
│  │   → After 3rd wrong: "Too many incorrect attempts."          │
│  │     + Resend button immediately enabled                      │
│  │                                                              │
│  ├─ [EXPIRED OTP]                                               │
│  │   → Text: "Code expired. Request a new one."                │
│  │   → Resend button immediately enabled (skip countdown)       │
│  │                                                              │
│  ├─ [RESEND] (after countdown or forced by exhaustion/expiry)   │
│  │   → Request new OTP                                          │
│  │   → Boxes clear                                              │
│  │   → Countdown resets to 60s                                  │
│  │   → Subtle toast: "New code sent"                           │
│  │                                                              │
│  └─ [DIRECT NAVIGATION without state]                           │
│      → Redirect to /login                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Email Template Designs

#### Welcome / Invitation Email

```
Subject: You've been invited to IPIS
Preview text: Complete your account setup to get started.

┌────────────────────────────────────────────┐
│                                            │
│              I P I S                       │  ← navy #1B2A4A text, 24px, bold
│   Internal Profitability Intelligence      │  ← #666, 13px
│                                            │
├────────────────────────────────────────────┤
│                                            │
│  Hi there,                                 │
│                                            │
│  You've been invited to join IPIS as a     │
│  Finance Manager.                          │  ← role in bold
│                                            │
│  Click the button below to set up your     │
│  account. It takes less than a minute.     │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │       Complete Your Setup            │  │  ← #1B2A4A bg, white text
│  └──────────────────────────────────────┘  │     48px height, 200px wide
│                                            │     border-radius: 6px
│  This link expires in 48 hours.            │  ← #999, 12px
│                                            │
│  If the button doesn't work, copy and      │
│  paste this link into your browser:        │
│  https://ipis.app/accept-invitation/...    │  ← #1B2A4A, 12px, word-break
│                                            │
├────────────────────────────────────────────┤
│                                            │
│  If you didn't expect this email, you      │  ← #999, 12px
│  can safely ignore it.                     │
│                                            │
└────────────────────────────────────────────┘
```

**Design notes:**
- Max width: 520px, centered with `margin: 0 auto`
- Background: `#F5F5F5` (matches app login background)
- Card: `#FFFFFF` with `border: 1px solid #E8E8E8`, no shadow (email clients strip box-shadow)
- All CSS inline (email client compatibility)
- No images — pure text + button (better deliverability, faster load)
- Role name in bold so the recipient immediately knows their access level
- Fallback plain-text link below the button for email clients that strip HTML

#### OTP Login Email

```
Subject: Your IPIS login code: 847293
Preview text: Use this code to sign in. Valid for 5 minutes.

┌────────────────────────────────────────────┐
│                                            │
│              I P I S                       │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│  Your verification code is:               │
│                                            │
│         ┌─────────────────────┐            │
│         │     8 4 7 2 9 3     │            │  ← 32px, letter-spacing: 8px
│         └─────────────────────┘            │     monospace font
│                                            │     #1B2A4A, bold
│                                            │     light gray bg (#F5F5F5)
│                                            │     padding: 16px 32px
│  This code expires in 5 minutes.           │  ← #999, 13px
│                                            │
│  If you didn't request this code,          │
│  someone may have entered your email       │
│  by mistake. You can safely ignore         │
│  this email.                               │  ← #999, 12px
│                                            │
└────────────────────────────────────────────┘
```

**Design notes:**
- Subject line includes the actual code — many users read OTPs from notification banners without opening the email
- Code displayed in large monospace font with generous letter-spacing for readability
- No clickable links in OTP email (security — prevents phishing link injection)
- Intentionally minimal — user should be in and out in 5 seconds
- "If you didn't request" disclaimer is standard and helps with spam filters

---

### 1.3 OTP Input Component Spec

#### Visual Design

```
Normal state:
┌───┐ ┌───┐ ┌───┐  ┌───┐ ┌───┐ ┌───┐
│   │ │   │ │   │  │   │ │   │ │   │    ← gap of 12px between boxes
└───┘ └───┘ └───┘  └───┘ └───┘ └───┘    ← visual divider (wider gap)
                                           after 3rd digit for readability
Box: 48px × 56px
Border: 1px solid #D9D9D9 (Ant Design default border)
Border-radius: 6px
Font: 24px, #1B2A4A, centered, font-weight: 600
Background: #FFFFFF

Focused box:
Border: 2px solid #1B2A4A (brand color, not Ant default blue)
Box-shadow: 0 0 0 2px rgba(27, 42, 74, 0.1)

Filled box:
Background: #FAFAFA
Border: 1px solid #1B2A4A

Error state (after wrong code):
All boxes: border 1px solid #FF4D4F (Ant error red)
Shake animation: translateX -4px → 4px → -4px → 0, 400ms
Then: boxes clear, borders reset to default, refocus first box

Success state (correct code):
All boxes: border 2px solid #52C41A (Ant success green)
After 300ms: boxes fade out, checkmark icon fades in (center, 48px, green)
After 200ms more: redirect begins

Disabled state (verifying):
Opacity: 0.6
Cursor: not-allowed
Spinner appears below boxes: "Verifying..."
```

#### Interaction Spec

| Action | Behavior |
|--------|----------|
| **Type digit** | Box fills, focus advances to next. Only digits 0-9 accepted, all other keystrokes ignored. |
| **Type on last box** | Box fills, auto-submit triggered (no button click needed). |
| **Backspace on filled box** | Clears current box, stays focused on it. |
| **Backspace on empty box** | Focus moves to previous box, clears it. |
| **Backspace on first empty box** | No-op. |
| **Paste 6 digits** | All boxes fill, auto-submit triggered. Works from any box. |
| **Paste < 6 digits** | Fill from current box forward, focus lands on next empty box. |
| **Paste with non-digits** | Strip non-digits, use remaining digits. If < 1 valid digit, no-op. |
| **Paste > 6 digits** | Take first 6 digits only. |
| **Left/Right arrow keys** | Navigate between boxes without clearing. |
| **Tab** | Moves to next box (standard tab order). |
| **Click on specific box** | Focus that box. Cursor appears. |
| **Select all (Cmd+A)** | Select all boxes visually (highlight). Next keystroke clears all and starts from box 1. |

#### Accessibility

| Concern | Implementation |
|---------|---------------|
| **Screen reader** | Outer `<div role="group" aria-label="Verification code">`. Each input: `aria-label="Digit N of 6"`. Live region below: `aria-live="polite"` for error/success messages. |
| **Keyboard navigation** | Full arrow key support. Tab order follows visual order. No focus trap (user can tab out to resend/back links). |
| **High contrast** | All states use sufficient contrast ratios. Focus ring visible in forced-colors mode. |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)`: skip shake animation, skip success fade — use instant state changes instead. |
| **autoComplete** | `autoComplete="one-time-code"` on the group/first input — enables browser auto-fill from email/SMS notifications on mobile. |
| **inputMode** | `inputMode="numeric"` — shows numeric keyboard on mobile devices. |

#### Mobile Behavior (< 768px)

- Boxes: 40px × 48px (slightly smaller)
- Gap: 8px between boxes
- Numeric keyboard opens automatically (`inputMode="numeric"`)
- Card: `width: 100%, maxWidth: 400px, padding: 24px 16px`
- Countdown text: 14px (slightly smaller)

#### Countdown Timer UX

```
State machine:
  COUNTING_DOWN → seconds > 0, decrements every 1s
    Display: "Resend code in 0:SS" (gray text, 13px)
    Resend button: hidden (not disabled — hidden entirely to reduce clutter)

  READY_TO_RESEND → seconds = 0 (natural) or forced (OTP exhausted/expired)
    Display: nothing (timer text disappears)
    Resend button: visible, styled as text link: "Didn't receive it? Resend code"

  RESENDING → resend request in flight
    Display: "Sending..." (replaces resend button)

  RESENT → new OTP sent
    Display: subtle success text "New code sent ✓" (green, 13px, fades after 3s)
    Timer resets to 60s, returns to COUNTING_DOWN
```

**Why hide the button instead of disabling it:** A disabled button during countdown is noise. The user knows they just requested a code. The countdown text alone communicates "wait." The button appears only when it becomes useful.

---

### 1.4 Persona First-Time Experience Walkthrough

#### Rajesh (Admin) — Bootstrap

**Context:** Rajesh is the IT admin deploying IPIS for the first time. He set `ADMIN_EMAIL` in the .env file.

**Journey:**
1. Starts the app. Console logs: "Bootstrap: Admin account created for rajesh@company.com. Welcome email sent."
2. Opens Gmail. Sees email: "You've been invited to IPIS" from IPIS. Subject is clear, no spam triggers.
3. Opens email. Sees "You've been invited as **Admin**." Big blue button: "Complete Your Setup."
4. Clicks button → lands on `/accept-invitation/:token`.
5. Sees: "Welcome to IPIS" + "You've been invited as Admin" + his email locked.
6. Types his name "Rajesh Kumar." Department is optional — he skips it (Admin doesn't belong to a department).
7. Clicks "Complete Setup" → "You're all set! ✓" → redirected to `/admin/users`.
8. He's now logged in. Next login: enter email → get OTP → done.

**Emotional state:** "That was fast. One email, one form, I'm in. No temporary password nonsense."

**Potential friction points:**
- If the welcome email lands in spam → Rajesh is technical, he'll check. But we should use proper SMTP headers and SPF/DKIM to minimize this.
- If Rajesh tries to navigate the app before completing setup → he can't, the invitation page is the only valid entry point.

#### Priya (Finance) — Invited by Admin

**Context:** Rajesh creates Priya's account from the admin panel.

**Journey:**
1. Rajesh opens User Management → clicks "Invite User" → enters `priya@company.com` + role "Finance" → clicks "Send Invitation."
2. Priya receives email: "You've been invited to IPIS" as a **Finance Manager**.
3. She clicks the button → profile setup page.
4. She sees her email locked, enters her name, selects "Finance" department.
5. Clicks "Complete Setup" → lands on Executive Dashboard (Finance landing page).
6. Next day, she goes to `ipis.app` → enters her email → gets OTP → types it in → she's on the dashboard.

**Emotional state:** "Clear and simple. I knew exactly what to do at every step."

**Potential friction points:**
- Priya works in monthly cycles — she might not log in for weeks. The OTP flow must be self-explanatory every time she returns. The login page should have no ambiguity: "Work email" + "Send verification code." That's it.
- If her OTP email is slow (Gmail can take 5-15s), the countdown timer gives her confidence that the system is working.

#### Neha (HR) — Invited, Occasional User

**Journey:** Same as Priya. Role: HR. Lands on Employee Dashboard. Department: "Human Resources."

**Potential friction points:**
- Neha might not remember the URL. Bookmark prompt after first login? No — too aggressive. But the welcome email should mention the URL: "You can always sign in at ipis.yourcompany.com."

#### Vikram (DM) — Needs Speed

**Context:** Vikram checks IPIS between meetings. He has 30 seconds.

**Journey:**
1. Opens IPIS → `/login`.
2. Email field remembers his last email (browser autocomplete).
3. Clicks "Send verification code" → transitions to OTP screen.
4. Opens Gmail app on phone → sees notification: "Your IPIS login code: 847293" (code in subject line!).
5. Types `847293` into the boxes — auto-advances, auto-submits on 6th digit.
6. Lands on Project Dashboard. Total time: ~20 seconds.

**Emotional state:** "Fast enough. The code was right there in my email notification."

**Critical UX decision:** The OTP email subject MUST include the code (`Your IPIS login code: 847293`). Vikram reads the code from the notification banner without opening the email. This saves 5-10 seconds.

#### Arjun (Dept Head) — Strategic, Weekly User

**Journey:** Same as Priya. Role: Department Head. Lands on Department Dashboard. Department: "Engineering."

**Potential friction points:**
- Arjun logs in weekly. The OTP flow must feel fresh and obvious every time, not like he's relearning it. The two-screen flow (email → OTP) is simple enough that it requires no learning.

---

### 1.5 Screen-Level Design Specs

#### Login Screen (`/login`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Background: #F5F5F5 (full viewport)                         │
│  ┌────────────────────────────────────┐                      │
│  │  Card: width 400px                │  ← centered vert+horiz│
│  │  background: #fff                 │     border-radius: 8  │
│  │  padding: 40px 32px               │     no shadow          │
│  │  border: 1px solid #E8E8E8        │                       │
│  │                                   │                       │
│  │  I P I S                          │  ← 20px, #1B2A4A, bold│
│  │  ─────                            │     letter-spacing: 4  │
│  │                                   │     margin-bottom: 8   │
│  │  Internal Profitability           │  ← 13px, #999          │
│  │  Intelligence System              │     margin-bottom: 32  │
│  │                                   │                       │
│  │  Sign in to your account          │  ← 16px, #333, medium │
│  │                                   │     margin-bottom: 24  │
│  │                                   │                       │
│  │  Work email                       │  ← 14px label, #333   │
│  │  ┌──────────────────────────┐     │                       │
│  │  │ your.email@company.com   │     │  ← Ant Input, height 40│
│  │  └──────────────────────────┘     │     autoFocus           │
│  │                                   │     margin-bottom: 24  │
│  │  ┌──────────────────────────┐     │                       │
│  │  │  Send verification code  │     │  ← Ant Button primary │
│  │  └──────────────────────────┘     │     block, height 44   │
│  │                                   │     bg: #1B2A4A        │
│  │                                   │     disabled until valid│
│  │                                   │     email entered       │
│  └────────────────────────────────────┘                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**State transitions:**
- **Empty:** Button disabled, no errors
- **Invalid email:** On blur, subtle `status="error"` on Input (Ant pattern)
- **Valid email:** Button enabled
- **Submitting:** Button shows spinner + "Sending..."
- **Rate limited:** `<Alert type="warning">` appears above email field
- **INVITED user:** `<Alert type="info">` with message to check email for invitation
- **Success:** Smooth transition to OTP screen (shared layout container prevents full page flash)

#### OTP Verification Screen (`/verify-otp`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Background: #F5F5F5 (same as login — feels like one flow)  │
│  ┌────────────────────────────────────┐                      │
│  │  Card: same dimensions as login   │                      │
│  │                                   │                       │
│  │  I P I S                          │                       │
│  │  ─────                            │                       │
│  │                                   │                       │
│  │  Enter verification code          │  ← 16px, #333, medium│
│  │                                   │                       │
│  │  We sent a 6-digit code to        │  ← 13px, #666         │
│  │  v●●●●m@company.com              │  ← email partially    │
│  │                                   │     masked for privacy │
│  │                                   │     (show first + last │
│  │                                   │     char + domain)     │
│  │                                   │                       │
│  │   ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌──┐ │  ← OTP boxes          │
│  │   │  │ │  │ │  │  │  │ │  │ │  │ │     wider gap after 3  │
│  │   └──┘ └──┘ └──┘  └──┘ └──┘ └──┘ │                       │
│  │                                   │                       │
│  │  [error/status text area]         │  ← 13px, contextual   │
│  │                                   │     color per state    │
│  │  Resend code in 0:47              │  ← 13px, #999         │
│  │  — OR —                           │                       │
│  │  Didn't receive it? Resend code   │  ← 13px, link color   │
│  │                                   │                       │
│  │  ← Use a different email          │  ← 13px, text link    │
│  │                                   │     positioned bottom  │
│  └────────────────────────────────────┘                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Email masking rationale:** On a shared screen, showing the full email is a minor privacy concern. Masking the middle characters (e.g., `v●●●●m@company.com`) confirms it's the right email without exposing it fully. User can always click "Use a different email" to see and change it.

#### Profile Setup Screen (`/accept-invitation/:token`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Background: #F5F5F5                                         │
│  ┌────────────────────────────────────┐                      │
│  │  Card: width 440px (slightly wider │                      │
│  │         than login for 2 fields)   │                      │
│  │                                   │                       │
│  │  I P I S                          │                       │
│  │  ─────                            │                       │
│  │                                   │                       │
│  │  Welcome to IPIS                  │  ← 20px, #1B2A4A     │
│  │                                   │                       │
│  │  You've been invited as           │  ← 14px, #666         │
│  │  ● Finance Manager               │  ← 14px, bold, with   │
│  │                                   │     role-color dot     │
│  │  your.email@company.com           │  ← 13px, #999, locked │
│  │                                   │     margin-bottom: 24 │
│  │                                   │                       │
│  │  Full Name                        │  ← required label     │
│  │  ┌──────────────────────────┐     │                       │
│  │  │                          │     │  ← autoFocus          │
│  │  └──────────────────────────┘     │     margin-bottom: 16 │
│  │                                   │                       │
│  │  Department (optional)            │                       │
│  │  ┌──────────────────────────┐     │                       │
│  │  │ Select department    ▾   │     │  ← Ant Select         │
│  │  └──────────────────────────┘     │     margin-bottom: 24 │
│  │                                   │                       │
│  │  ┌──────────────────────────┐     │                       │
│  │  │    Complete Setup        │     │  ← primary button     │
│  │  └──────────────────────────┘     │     block, height 44  │
│  │                                   │                       │
│  └────────────────────────────────────┘                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Role-color dot:** A small colored circle next to the role name. Provides visual identity:
- Admin: `#722ED1` (purple)
- Finance: `#1890FF` (blue)
- HR: `#52C41A` (green)
- Delivery Manager: `#FA8C16` (orange)
- Dept Head: `#13C2C2` (teal)

These colors can be reused in the User Management status badges.

---

## Part 2: Epic 13 — Interaction Notes for UI Stories

---

### 2.1 Story 13.6: Share Link Modal

**Recommendation: Use a focused modal with auto-select and copy.**

```
┌──────────────────────────────────────────┐
│  Share Report Link                   ✕   │
│                                          │
│  Anyone with this link can view this     │  ← 13px, #666
│  report. Link expires in 30 days.        │
│                                          │
│  ┌──────────────────────────────┐ ┌────┐ │
│  │ https://ipis.app/shared/... │ │Copy│ │  ← Input.Search pattern
│  └──────────────────────────────┘ └────┘ │    enterButton="Copy"
│                                          │
│  [after copy:]                           │
│  ┌──────────────────────────────┐ ┌────┐ │
│  │ https://ipis.app/shared/... │ │ ✓  │ │  ← button turns green
│  └──────────────────────────────┘ └────┘ │    icon: CheckOutlined
│  Link copied to clipboard ✓             │  ← green text, 12px
│                                          │
└──────────────────────────────────────────┘
```

**Interaction details:**
- Modal width: 480px
- On open: link text is auto-selected (so Cmd+C works immediately even without clicking Copy)
- Copy button: uses `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')`
- After copy: button icon changes to checkmark for 2 seconds, then reverts
- Text below confirms: "Link copied to clipboard ✓" (green, fades after 3s)
- Modal stays open — user closes manually with X or clicks outside
- No footer buttons (the Copy button is the primary action)
- Use Ant Design `<Input addonAfter={<Button>Copy</Button>}>` pattern — cleaner than `Input.Group`

---

### 2.2 Story 13.8: Add Team Member Modal

**Recommendation: Vertical form layout with currency-prefixed input.**

```
┌──────────────────────────────────────────┐
│  Add Team Member                     ✕   │
│                                          │
│  Employee                                │
│  ┌──────────────────────────────────┐    │  ← Select with search
│  │ Search employees...           ▾  │    │     showSearch, full width
│  └──────────────────────────────────┘    │
│                                          │
│  Designation                             │
│  ┌──────────────────────────────────┐    │  ← Select, full width
│  │ Select designation            ▾  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─────────────────┐ ┌────────────────┐  │  ← Row with gutter: 16
│  │ Selling Rate     │ │ Allocation %   │  │
│  │ ┌─────────────┐ │ │ ┌────────────┐ │  │
│  │ │ ₹ │ 8,000   │ │ │ │ 100      % │ │  │  ← InputNumber with
│  │ └─────────────┘ │ │ └────────────┘ │  │     addonBefore/After
│  └─────────────────┘ └────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │         Add Team Member          │    │  ← primary, block
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Key layout decisions:**
- **Vertical form layout** (not horizontal) — prevents the shrinking-input bug entirely. Each field gets full width on its own row.
- **Employee and Designation: full width, stacked** — these use Select with search which can have long option text. Full width prevents truncation.
- **Selling Rate and Allocation %: side by side** — these are short numeric inputs. Side by side saves vertical space and groups the "how much" fields together.
- `InputNumber` with `addonBefore="₹"` for selling rate and `addonAfter="%"` for allocation — clear units.
- Modal width: 480px (not default 520 — 4 fields don't need extra width).
- `destroyOnHidden` to reset form state.

**Over-allocation warning:**
If the selected employee's total allocation across all projects would exceed 100%:
```
┌──────────────────────────────────────────┐
│  ⚠ Amit Verma is currently at 80%       │  ← Alert type="warning"
│  allocation. Adding 30% would bring      │     shown below Allocation %
│  total to 110%.                          │     field
└──────────────────────────────────────────┘
```
Warning only — not blocking. DMs know their team.

---

### 2.3 Story 13.9: Pending Approvals — Expandable Row

**Recommendation: Expandable table row (not drawer).** The admin's mental model is a list to process. Drawers break the list scanning flow. Expandable rows keep everything inline.

```
┌──────────────────────────────────────────────────────────────────┐
│ ▶ Alpha Platform Migration  │ Vikram Mehta │ T&M  │ — │ Mar 10 │
├──────────────────────────────────────────────────────────────────┤
│ ▼ Beta Analytics Dashboard  │ Vikram Mehta │ FC   │ ₹45L│ Mar 12│
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Client: FinServe Ltd          Vertical: FinTech          │  │
│  │  Model: Fixed Cost             Value: ₹45,00,000         │  │
│  │  Timeline: Nov 2025 → Jun 2026 (8 months)                │  │
│  │  Completion: 65%                                          │  │
│  │  Delivery Manager: Vikram Mehta                           │  │
│  │                                                           │  │
│  │  Team (if assigned):                                      │  │
│  │  • Neha Gupta — Sr Developer (₹7,500/hr)                 │  │
│  │  • Ravi Teja — Tech Lead (₹9,000/hr)                     │  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────────────────────────────┐       │  │
│  │  │ Approve  │  │ Reject (requires comment)     │       │  │
│  │  └──────────┘  └──────────────────────────────────┘       │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ ▶ Zeta Mobile App           │ Vikram Mehta │ FC   │ ₹25L│ Mar 14│
└──────────────────────────────────────────────────────────────────┘
```

**Interaction details:**
- Click anywhere on the row OR click the expand icon (▶/▼) to toggle
- Expanded section has a light background (`#FAFAFA`) to visually separate it from the table
- Details displayed in a 2-column description list (Ant Design `<Descriptions>` component)
- Approve button: `type="primary"` (solid navy)
- Reject button: `type="default"` — clicking opens a modal with a required comment textarea
- If project was previously rejected and resubmitted: show a yellow `<Alert>` at the top of the expanded section with the previous rejection comment
- Only one row expandable at a time (accordion behavior) — prevents information overload

---

### 2.4 Story 13.10: Projects → Project Dashboard Consolidation

**Navigation impact assessment:**

**Current state (confusing):**
```
Sidebar:
├─ Projects          → /projects (flat table)
├─ Project Dashboard → /dashboards/projects (cards + KPIs)
```
Users see two items that seem similar. "Which one do I click?"

**Proposed state (clear):**
```
Sidebar:
├─ Projects → /dashboards/projects (unified view)
```

**Mental model:** "Projects" = the single place for all project information. Period.

**Implementation notes:**
- Redirect `/projects` → `/dashboards/projects` (keep old URL working for bookmarks)
- Navigation config: single entry `{ key: 'projects', label: 'Projects', path: '/dashboards/projects', icon: ProjectOutlined }`
- The dashboard already has KPI tiles + project cards. If any features from the flat table are missing (e.g., sortable columns, compact view), consider adding a list/card toggle:

```
┌──────────────────────────────────────────────────┐
│  Projects                              [≡] [⊞]  │  ← toggle: list / cards
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ All │ │Active│ │Pend.│ │Done │               │  ← status tabs
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                  │
│  ... project cards or table rows ...             │
└──────────────────────────────────────────────────┘
```

---

### 2.5 Story 13.11: Upload Centre Row Click Affordance

**Recommendation: Explicit "View" action + hover affordance (both).**

**Why both?** Some users discover by hovering (power users), others need explicit visual cues (everyone else). Provide both:

```
Upload History
┌────────────────────────────────────────────────────────────────┐
│ Type       │ Period   │ Status  │ Rows │ Uploaded     │       │
├────────────────────────────────────────────────────────────────┤
│ Timesheet  │ Jan 2026 │ ✓ Done  │ 45   │ Jan 15, 2026 │ View │  ← text link
│ Billing    │ Jan 2026 │ ✓ Done  │ 5    │ Jan 15, 2026 │ View │     #1B2A4A
│ Salary     │ Jan 2026 │ ⚠ Partial│ 20  │ Jan 16, 2026 │ View │     underline
├────────────────────────────────────────────────────────────────┤
│ [hover state: entire row background #FAFAFA, cursor: pointer] │
└────────────────────────────────────────────────────────────────┘
```

**Interaction details:**
- Add a "View" column on the right (last column) — `<Button type="link">View</Button>`
- Entire row is clickable (`onRow` prop with `onClick` + `cursor: pointer`)
- Row hover: `backgroundColor: #FAFAFA` (subtle highlight)
- Clicking row OR clicking "View" both open the `UploadDetailDrawer`
- For rows with `status: PARTIAL` or `status: ERROR`, the "View" link could say "View errors" in orange to draw attention

---

## Part 3: Implementation Guidance

### Shared Layout Component for Auth Screens

Login, OTP verification, and profile setup share the same visual shell. Create a single `AuthLayout` component:

```tsx
// components/AuthLayout.tsx
const AuthLayout: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 400,
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#F5F5F5',
  }}>
    <div style={{
      width,
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #E8E8E8',
      padding: '40px 32px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1B2A4A',
          letterSpacing: 4,
        }}>
          IPIS
        </div>
        <div style={{ fontSize: 13, color: '#999' }}>
          Internal Profitability Intelligence System
        </div>
      </div>
      {children}
    </div>
  </div>
);
```

### Screen Transition

Login → OTP should feel like a single flow, not two separate pages. Options:
1. **Shared layout container** (recommended): both screens use `AuthLayout`. The card content swaps. The header ("IPIS") stays static. No full-page flash.
2. **Slide animation**: new content slides in from the right. Feels polished but adds complexity.

Recommend option 1 for simplicity — option 2 can be added later as polish.

### Component Checklist for Implementation

| Component | Story | Ant Design Base | Custom |
|-----------|-------|-----------------|--------|
| `AuthLayout` | 14.5, 14.7 | — | Yes — shared shell |
| `OtpInput` | 14.5 | — | Yes — 6 digit inputs |
| `CountdownTimer` | 14.5 | — | Yes — state machine |
| `ShareLinkModal` | 13.6 | Modal, Input | Minimal custom |
| `AddTeamMemberModal` | 13.8 | Modal, Form, Select, InputNumber | Layout fix only |
| `PendingApprovalExpand` | 13.9 | Table expandable, Descriptions | Expand renderer |
| `UploadHistoryTable` | 13.11 | Table onRow | CSS + column |

---

*End of UX Design Specification — Epic 13 & 14*

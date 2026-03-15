# Story 14.5: OTP Login UX — Email Screen, Digit Input, Countdown, Resend, Error States

Status: review

## Dev Agent Record

### Implementation Plan
- Created `OtpInput` component: 6 individual digit inputs with auto-advance, paste support, backspace navigation, shake animation on error
- Rewrote `Login.tsx` as two-screen flow: email entry → OTP verification
- Added `requestOtp()` and `verifyOtp()` API functions to `auth.api.ts`
- Screen 1: IPIS branding, email input, "Send OTP" button (disabled until valid email)
- Screen 2: 6 digit inputs, countdown timer (60s), resend button, "Use a different email" link
- Success: checkmark animation → redirect to role landing page
- Errors: rate limit, expired, exhausted, incorrect with attempts remaining

### Completion Notes
- AC1-4: Email screen with branding, validation, loading state, rate limit error
- AC5: OTP screen with digit boxes, countdown, resend, back link
- AC6: Auto-advance on digit entry, auto-submit on 6th digit
- AC7: Paste support — fills all 6 boxes from pasted text
- AC8: Backspace moves to previous box
- AC9: Success state with checkmark, redirect after 500ms
- AC10: Incorrect OTP — shake animation, clear boxes, show attempts remaining
- AC11: Expired OTP — message + resend enabled immediately
- AC12: Resend resets countdown, clears inputs
- AC13: Back link preserves email
- AC14: No separate /verify-otp route — single Login page with screen state
- 6 frontend tests, all 349 pass, typecheck clean

## File List

### New Files
- packages/frontend/src/components/OtpInput.tsx

### Modified Files
- packages/frontend/src/pages/auth/Login.tsx (complete rewrite — OTP two-screen flow)
- packages/frontend/src/pages/auth/Login.test.tsx (OTP flow tests)
- packages/frontend/src/services/auth.api.ts (added requestOtp, verifyOtp)

## Change Log
- 2026-03-15: Implemented OTP login UX — email entry → digit input with countdown, resend, error states

## Story

As a user logging into IPIS,
I need a polished OTP login experience with individual digit inputs, a visible countdown timer, resend capability, and clear error messaging,
so that the login flow feels professional and trustworthy — like a real production application.

## Dependencies

- 14.4 (OTP request + verify API)

## Persona Co-Authorship

### Rajesh (Admin)
> "I log in maybe once a day. I need it to be fast — enter email, get code, type it in, done. If the code doesn't arrive, I need a resend button that actually tells me when I can press it."

### Priya (Finance)
> "I work in monthly cycles. Sometimes I don't log in for days. The flow needs to be obvious — I shouldn't have to remember how to log in. Clear labels, clear steps."

### Vikram (DM)
> "I check the system between meetings. If the OTP takes too long or the input is fiddly, I'll skip it. The digit boxes should auto-advance when I type, and paste should work if I copy the code from my email."

## Acceptance Criteria

### Screen 1: Email Entry (`/login`)

1. **Given** the login page,
   **When** rendered,
   **Then** it shows:
   - IPIS branding/logo
   - "Sign in to IPIS" heading
   - Email input field with label "Work email"
   - "Send OTP" primary button (disabled until valid email entered)
   - Clean, centered layout — no clutter

2. **Given** the user enters a valid email and clicks "Send OTP",
   **When** the request is processing,
   **Then** the button shows a loading spinner and is disabled.

3. **Given** the OTP request succeeds,
   **When** the response is received,
   **Then** the user is transitioned to Screen 2 (OTP input).

4. **Given** the user is rate-limited (5 OTPs in 10 min),
   **When** the error response is received,
   **Then** a message appears: "Too many attempts. Please try again in X minutes."

### Screen 2: OTP Input (`/verify-otp`)

5. **Given** the OTP input screen,
   **When** rendered,
   **Then** it shows:
   - "Enter verification code" heading
   - "We sent a 6-digit code to user@email.com" subtitle (showing their email)
   - 6 individual digit input boxes in a row (auto-focused on first box)
   - Countdown timer: "Resend code in 0:59" (counting down from 60)
   - "Resend OTP" button (disabled during countdown, enabled after)
   - "Use a different email" link (goes back to Screen 1)
   - Attempts remaining indicator (shown after first wrong attempt)

6. **Given** the user types a digit,
   **When** the digit is entered,
   **Then** focus auto-advances to the next box. On the 6th digit, verification is triggered automatically (no submit button needed).

7. **Given** the user pastes a 6-digit code,
   **When** pasted into any of the digit boxes,
   **Then** all 6 boxes are populated and verification triggers automatically.

8. **Given** the user presses Backspace,
   **When** the current box is empty,
   **Then** focus moves to the previous box and clears it.

9. **Given** the OTP is correct,
   **When** verified,
   **Then**:
   - Brief success state (checkmark animation or green border, ~500ms)
   - Redirect to role-appropriate landing page

10. **Given** the OTP is incorrect,
    **When** the error response is received,
    **Then**:
    - All 6 boxes shake briefly (CSS animation) and clear
    - Error message: "Incorrect code. X attempts remaining."
    - Focus returns to first box
    - If 0 attempts remaining: "Code expired. Please request a new one." + auto-enable resend button

11. **Given** the OTP is expired,
    **When** the error response is received,
    **Then**: "Code expired. Please request a new one." + resend button enabled immediately (no countdown).

12. **Given** the countdown reaches 0,
    **When** "Resend OTP" is clicked,
    **Then**:
    - New OTP is requested
    - Countdown resets to 60 seconds
    - Success toast: "New code sent to your email"
    - Previous digit inputs cleared

13. **Given** the user clicks "Use a different email",
    **When** navigated back,
    **Then** the email field is pre-populated with their previous email (editable).

### Screen States

14. **Given** the user navigates directly to `/verify-otp` without requesting an OTP,
    **When** the page loads,
    **Then** redirect to `/login` (no email in state = invalid entry point).

## Technical Notes

### Digit Input Component
Build a reusable `OtpInput` component:
```tsx
<OtpInput
  length={6}
  onComplete={(otp: string) => verifyOtp(otp)}
  error={errorMessage}
  disabled={isVerifying}
/>
```

Each input: `type="text"`, `inputMode="numeric"`, `pattern="[0-9]"`, `maxLength={1}`, `autoComplete="one-time-code"`.

The `autoComplete="one-time-code"` attribute enables browser auto-fill from SMS/email on mobile devices.

### Countdown Timer
```tsx
const [secondsLeft, setSecondsLeft] = useState(60);
useEffect(() => {
  if (secondsLeft <= 0) return;
  const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
  return () => clearTimeout(timer);
}, [secondsLeft]);
```

### State Management
Pass email between screens via React Router state (not URL params — don't expose email in URL):
```tsx
navigate('/verify-otp', { state: { email } });
```

### Testing Requirements

**Frontend Tests (component-level):**
- OtpInput: renders 6 boxes, auto-advances, handles paste, handles backspace
- Countdown: starts at 60, decrements, enables resend at 0
- Error state: boxes shake, clear, show message
- Success state: redirect after brief animation

**E2E Tests (with MASTER_OTP):**
- Full flow: enter email → send OTP → enter MASTER_OTP → verify redirect to landing page
- Wrong OTP: enter wrong code → verify error message + attempts remaining
- Resend: wait for countdown → resend → verify countdown resets
- Different email: click back → verify email pre-populated
- Direct navigation to /verify-otp → verify redirect to /login

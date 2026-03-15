# Story 14.7: User Onboarding UX — Welcome Page, Profile Setup Form

Status: review

## Dev Agent Record

### Implementation Plan
- Created `AcceptInvitation.tsx` page with token validation → profile form → auto-login flow
- Updated `validateInvitation` backend to include departments in response (Option A)
- Added frontend API functions: `validateInvitation()`, `completeProfile()`
- Added public route `/accept-invitation/:token` (no auth required)

### Completion Notes
- AC1: Valid link shows IPIS branding, role name, email (read-only)
- AC2: Form has Full Name (required), Department dropdown (optional from API)
- AC3: Success animation → auto-redirect to landing page (JWT cookie set)
- AC4: Inline error with retry
- AC5-7: Expired/used/invalid states with appropriate messages and actions
- AC8: Loading spinner during validation
- AC9: Departments from API, alphabetical, active only
- AC10: Centered card layout, responsive
- All 590 backend tests pass, 349 frontend tests pass, typecheck clean

## File List

### New Files
- packages/frontend/src/pages/auth/AcceptInvitation.tsx

### Modified Files
- packages/frontend/src/services/auth.api.ts (validateInvitation, completeProfile)
- packages/frontend/src/router/index.tsx (accept-invitation route)
- packages/backend/src/services/invitation.service.ts (include departments in validateInvitation)
- packages/backend/src/services/invitation.service.test.ts (updated assertion)

## Change Log
- 2026-03-15: Implemented user onboarding UX — invitation acceptance with profile setup form

## Story

As a newly invited user clicking the welcome link in my email,
I need a clean, guided profile setup experience,
so that I can complete my account quickly and start using IPIS.

## Dependencies

- 14.6 (Invitation link API)

## Persona Co-Authorship

### New User (first-time experience)
> "I just got an email saying I've been invited to IPIS. I click the link. I should immediately understand what this is, what I need to do, and how long it'll take. Don't make me think."

## Acceptance Criteria

### Screen: Accept Invitation (`/accept-invitation/:token`)

1. **Given** a valid invitation link,
   **When** the page loads,
   **Then** it shows:
   - IPIS branding
   - "Welcome to IPIS" heading
   - "You've been invited as a **[Role Name]**" subtitle (e.g., "Finance Manager")
   - Profile setup form (see below)
   - The user's email shown as read-only text (not editable — it's their identity)

2. **Given** the profile setup form,
   **When** rendered,
   **Then** it has:
   - "Full Name" input (required, min 2 chars, auto-focused)
   - "Department" dropdown (optional — populated from `GET /api/v1/departments`)
   - "Complete Setup" primary button

3. **Given** the user fills in their name and clicks "Complete Setup",
   **When** the profile is saved successfully,
   **Then**:
   - Brief success animation: "You're all set!"
   - Auto-redirect to role-appropriate landing page (user is now logged in via JWT cookie set by the API)
   - No separate login step needed — completing profile = first login

4. **Given** the form submission fails (network error, server error),
   **When** the error is caught,
   **Then** an inline error message appears (not a toast that disappears) with retry option.

### Error States

5. **Given** an expired invitation link,
   **When** the page loads (validate-invitation returns expired),
   **Then** it shows:
   - "This invitation has expired"
   - "Please ask your administrator to resend the invitation."
   - No form is shown — just the message

6. **Given** an already-used invitation link,
   **When** the page loads,
   **Then** it shows:
   - "This invitation has already been used"
   - "You can log in with your email." + link to `/login`

7. **Given** an invalid/malformed token in the URL,
   **When** the page loads,
   **Then** it shows:
   - "Invalid invitation link"
   - "Please check the link in your email or contact your administrator."

### UX Details

8. **Given** the page is loading (validating token),
   **When** the API call is in flight,
   **Then** a skeleton/loading state is shown (not a blank page).

9. **Given** the department dropdown,
   **When** rendered,
   **Then** it shows active departments only, sorted alphabetically, with a "— Select department (optional) —" placeholder.

10. **Given** a mobile viewport (< 768px),
    **When** the page is rendered,
    **Then** the layout is fully responsive — centered card, stacked form fields.

## Technical Notes

### Router
```tsx
// New public route (no AuthGuard)
<Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
```

### Department Fetch
The departments endpoint (`GET /api/v1/departments`) is currently behind auth middleware. For the invitation flow, either:
- Option A: Make the complete-profile API return available departments in its response
- Option B: Add a public `/api/v1/public/departments` endpoint (simpler)
- Option C: Fetch departments after token validation using a temporary session

Recommend Option A — the validate-invitation response can include `{ valid: true, data: { email, role, departments: [...] } }`.

### Testing Requirements

**E2E Tests (with MASTER_OTP):**
- Click valid invitation link → verify form shows with email and role
- Fill in name → submit → verify redirect to landing page
- Verify user is logged in (can access authenticated pages)
- Click expired link → verify error message shown
- Click used link → verify "already used" message with login link

**Frontend Tests:**
- Form renders with email read-only
- Name validation: empty → error, 1 char → error, 2+ chars → valid
- Department dropdown loads and shows alphabetical list
- Submit button disabled while processing
- Error states render correct messages per error type
- Loading skeleton shown during token validation

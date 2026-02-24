# Defensive AC Checklist

**Purpose:** Story authors must address each category below when writing Acceptance Criteria. This prevents the AC quality gaps that caused ~50% of code review findings in Epics 1 and 2.

**When to use:** Fill out this checklist for every new story during the `create-story` workflow. Each category should either have explicit ACs or a documented "N/A" with reasoning.

---

## 1. Negative / Error Paths

> What happens when things go wrong?

- [ ] Invalid input values are rejected with clear error messages
- [ ] Non-existent resources return appropriate 404 responses
- [ ] Unauthorized access attempts are handled (401/403)
- [ ] Duplicate/conflicting operations are handled (e.g., creating an already-existing resource)
- [ ] Network/service failures show user-friendly error states

**Epic 2 examples:**
- Story 2.3 M1: No error handling requirement for resign action → missing `onError` handler
- Story 2.2 M5/M6: Missing resign edge-case tests (nonexistent employee, already-resigned)

---

## 2. Concurrency Behavior

> What happens when multiple operations overlap?

- [ ] Concurrent duplicate submissions are handled (idempotency or dedup)
- [ ] Race conditions in read-then-write sequences are addressed
- [ ] Bulk operations define behavior for partial failures (atomic vs. non-atomic)
- [ ] Optimistic locking or conflict detection where needed

**Epic 2 examples:**
- Story 2.1 H1: No concurrent upload behavior defined → `skipDuplicates` missing from bulk upload

---

## 3. Input Validation Boundaries

> What are the exact constraints on every input?

- [ ] Required vs. optional fields are explicitly stated
- [ ] Data types and formats are specified (date formats, string lengths, numeric ranges)
- [ ] Boundary values are defined (min/max, empty strings, zero values)
- [ ] File upload constraints specified (size limits, allowed MIME types, naming)
- [ ] Foreign key / reference integrity requirements stated

**Epic 2 examples:**
- Story 2.1 M1: `joining_date` validation not specified → accepted any string
- Story 2.4 H1: antd `UploadFile` vs `File` type mismatch in `beforeUpload`

---

## 4. Error UX & Messaging

> How does the user experience errors?

- [ ] Error messages are user-friendly (not raw server errors)
- [ ] Loading states are defined for async operations
- [ ] Success confirmations are specified (toast, redirect, inline message)
- [ ] Form validation feedback is defined (inline, on-submit, or both)
- [ ] Empty states are designed (no data, no results, first-time use)

**Epic 2 examples:**
- Story 2.3 M1: Missing `onError` handler on resign mutation — no user feedback on failure
- Story 1.5: Missing `message.success` toast after user creation

---

## 5. Security Implications

> What security concerns apply to this feature?

- [ ] Authentication requirements stated (which endpoints need auth)
- [ ] Authorization / RBAC rules defined (who can do what)
- [ ] Sensitive data handling specified (what gets logged, what gets masked)
- [ ] File upload security defined (validation beyond MIME type if needed)
- [ ] Rate limiting / abuse prevention considered

**Epic 2 examples:**
- Story 2.1 M4: File upload security not specified → MIME-only check
- Story 2.3 M3: Departments RBAC not scoped for HR/Finance → AC only said "Department Select"

---

## How to Use

When writing a story's Acceptance Criteria:

1. Review each category above
2. For each applicable category, write explicit ACs that address the relevant items
3. For non-applicable categories, add a brief note: *"N/A — no file uploads in this story"*
4. Reference this checklist in the story's Dev Notes section

**Goal:** Zero code review findings that could have been prevented by better ACs.

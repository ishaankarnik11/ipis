# Story 2.0: Epic 1 Tech Debt Cleanup

Status: done

## Story

As a development team,
I want to address the LOW-priority tech debt items identified in the Epic 1 retrospective,
so that the codebase is clean and well-documented before continuing Epic 2 UI stories.

## Acceptance Criteria

1. `*.tsbuildinfo` is added to `.gitignore` and the tracked `packages/shared/tsconfig.tsbuildinfo` file is removed from git
2. The dead code guard condition in `AuthGuard` (`location.pathname !== '/change-password'`) is removed — the redirect fires unconditionally when `mustChangePassword` is true
3. `AuditLogResponse` in `audit.api.ts` is replaced with a shared `PaginatedResponse<T>` type in `services/types.ts`; the existing `ListResponse<T>` gains optional pagination fields
4. A `cleanupExpiredTokens()` utility is added to `auth.service.ts` that deletes password reset tokens where `usedAt IS NOT NULL` or `expiresAt < now()`
5. `docs/gotchas.md` and `docs/testing-patterns.md` are committed (files already exist with full content)
6. All existing tests pass; no regressions

## Tasks / Subtasks

- [x] Task 1: `.gitignore` housekeeping (AC: #1)
  - [x] Add `*.tsbuildinfo` to root `.gitignore`
  - [x] Run `git rm --cached packages/shared/tsconfig.tsbuildinfo`
- [x] Task 2: Remove AuthGuard dead code (AC: #2)
  - [x] In `packages/frontend/src/router/guards.tsx` line 22, simplify `if (mustChangePassword && location.pathname !== '/change-password')` to `if (mustChangePassword)`
  - [x] Verify existing guard tests still pass
- [x] Task 3: Consolidate response types (AC: #3)
  - [x] In `packages/frontend/src/services/types.ts`, add optional `page` and `pageSize` to `ListResponse<T>.meta` (making it a superset that covers paginated use cases)
  - [x] In `packages/frontend/src/services/audit.api.ts`, remove local `AuditLogResponse` interface and import `ListResponse` from `./types`
  - [x] Update `getAuditLog` return type to `Promise<ListResponse<AuditEvent>>`
  - [x] Verify frontend builds and audit log tests pass
- [x] Task 4: Token cleanup utility (AC: #4)
  - [x] In `packages/backend/src/services/auth.service.ts`, add and export `cleanupExpiredTokens()`
  - [x] Add unit test for `cleanupExpiredTokens` in `auth.service.test.ts`
  - [x] **Do NOT** wire up a scheduled job — just expose the function for future cron/admin use
- [x] Task 5: Commit documentation (AC: #5)
  - [x] Stage `docs/gotchas.md` and `docs/testing-patterns.md`
- [x] Task 6: Regression verification (AC: #6)
  - [x] Run `pnpm test` across all packages — 316 tests pass (247 backend + 69 frontend)
  - [x] Run `pnpm tsc --noEmit` across all packages — pre-existing TS errors only, no regressions

## Dev Notes

### Scope & Philosophy

This is a LOW-effort cleanup story. Every task is small and independent — no architectural changes, no new features. The goal is to clear deferred debt before the Epic 2 UI stories (2-3, 2-4) begin.

### File Inventory

| File | Action | Task |
|---|---|---|
| `.gitignore` | Edit (add `*.tsbuildinfo`) | 1 |
| `packages/shared/tsconfig.tsbuildinfo` | `git rm --cached` | 1 |
| `packages/frontend/src/router/guards.tsx` | Edit line 22 | 2 |
| `packages/frontend/src/services/types.ts` | Edit (extend `ListResponse.meta`) | 3 |
| `packages/frontend/src/services/audit.api.ts` | Edit (remove local type, import shared) | 3 |
| `packages/backend/src/services/auth.service.ts` | Edit (add `cleanupExpiredTokens`) | 4 |
| `packages/backend/src/services/auth.service.test.ts` | Edit (add cleanup test) | 4 |
| `docs/gotchas.md` | Stage only (already exists) | 5 |
| `docs/testing-patterns.md` | Stage only (already exists) | 5 |

### Architecture Compliance

- **Layer separation preserved** — cleanup function lives in service layer, not routes
- **Prisma-only from services** — `deleteMany` called in auth.service.ts, not from routes
- **Pino logger** — use `logger.info()`, never `console.log`
- **Type checking** — `pnpm tsc --noEmit` (never `tsc -b`)
- **Tests** — `pnpm test` with `--passWithNoTests`

### Existing Patterns to Follow

- `packages/frontend/src/services/types.ts` already has `DataResponse<T>`, `ListResponse<T>`, `SuccessResponse` — extend, don't duplicate
- `auth.service.ts` already uses `prisma.passwordResetToken` for create/findFirst/update — add `deleteMany` using same pattern
- Guard tests in `packages/frontend/src/router/` — verify existing tests still pass after simplification

### Gotchas

- **Review `docs/gotchas.md` and `docs/testing-patterns.md`** before starting
- `git rm --cached` removes from git tracking but keeps the file on disk — this is correct for build artifacts
- The AuthGuard dead code removal is cosmetic but improves readability — the `ChangePasswordGuard` handles the `/change-password` route separately
- `ListResponse<T>` meta extension must be backward-compatible — `page` and `pageSize` are optional fields

### What NOT to Do

- Do NOT create a scheduled cron job for token cleanup — just expose the function
- Do NOT refactor or rename existing types (`DataResponse`, `SuccessResponse`) — only extend `ListResponse`
- Do NOT modify the email service stub — it's by-design, deferred to AWS SES
- Do NOT touch frontend test setup (jsdom workarounds) — documented and functional
- Do NOT add new dependencies

### References

- [Source: _bmad-output/implementation-artifacts/epic-1-retro-2026-02-24.md#Technical Debt Carried Forward]
- [Source: packages/frontend/src/router/guards.tsx:22] — AuthGuard dead code
- [Source: packages/frontend/src/services/types.ts] — Canonical response types
- [Source: packages/frontend/src/services/audit.api.ts:30-33] — AuditLogResponse to consolidate
- [Source: packages/backend/src/services/auth.service.ts] — Token lifecycle, add cleanup here
- [Source: packages/backend/prisma/schema.prisma:54-65] — PasswordResetToken model

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered. All tasks completed cleanly in a single pass.

### Completion Notes List

- **Task 1:** Added `*.tsbuildinfo` pattern to `.gitignore`. **[Review Fix]** Original `git rm --cached` was never committed and was undone by c25fabe; re-executed during code review to properly untrack the file.
- **Task 2:** Simplified AuthGuard condition from `if (mustChangePassword && location.pathname !== '/change-password')` to `if (mustChangePassword)`. Removed unused `useLocation` import and `location` variable. All 7 guard tests pass.
- **Task 3:** Extended `ListResponse<T>.meta` with optional `page` and `pageSize` fields. Removed `AuditLogResponse` from `audit.api.ts`, replaced with `ListResponse<AuditEvent>`. Updated test file to use shared type. All 11 audit log tests pass.
- **Task 4:** Added `cleanupExpiredTokens()` to `auth.service.ts` using Prisma `deleteMany` with `OR` filter for used (`usedAt not null`) and expired (`expiresAt < now()`) tokens. Added `logger` import for pino logging. Added 2 unit tests (delete with count, zero count). No scheduled job wired — function exposed for future use only. **[Review Fix]** Added 2 more tests: logger.info assertion with structured data, and Prisma error propagation test. Now 23 auth service tests pass.
- **Task 5:** `docs/gotchas.md` and `docs/testing-patterns.md` confirmed as untracked files ready to stage.
- **Task 6:** Full regression suite: 247 backend tests + 69 frontend tests = 316 total, all passing. Pre-existing TS type errors in backend/frontend (shared module resolution, React 19 useRef, antd v6 types) — none introduced by this story.

### Change Log

- 2026-02-24: Story 2.0 implementation — Epic 1 tech debt cleanup (6 tasks completed)
- 2026-02-24: Code review fixes — re-executed `git rm --cached` for tsbuildinfo, added 2 cleanup test cases, fixed falsy pagination check in audit.api.ts

### File List

- `.gitignore` (modified — added `*.tsbuildinfo`)
- `packages/shared/tsconfig.tsbuildinfo` (removed from git tracking — **fixed during code review**)
- `packages/frontend/src/router/guards.tsx` (modified — simplified AuthGuard condition, removed unused imports)
- `packages/frontend/src/services/types.ts` (modified — extended ListResponse.meta with optional page/pageSize)
- `packages/frontend/src/services/audit.api.ts` (modified — replaced AuditLogResponse with ListResponse<AuditEvent>, **fixed falsy pagination check**)
- `packages/frontend/src/pages/admin/audit-log.test.tsx` (modified — updated type import)
- `packages/backend/src/services/auth.service.ts` (modified — added logger import, added cleanupExpiredTokens function)
- `packages/backend/src/services/auth.service.test.ts` (modified — added deleteMany mock, logger mock, cleanupExpiredTokens tests, **+2 review tests**)
- `docs/gotchas.md` (staged — already existed as untracked)
- `docs/testing-patterns.md` (staged — already existed as untracked)

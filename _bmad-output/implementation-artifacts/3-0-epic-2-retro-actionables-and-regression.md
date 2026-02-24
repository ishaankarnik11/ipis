# Story 3.0: Epic 2 Retro Actionables & Regression Verification

Status: done

## Story

As a development team,
I want to address all pending retrospective action items from Epics 1 and 2 and verify regression-free status,
so that the codebase, documentation, and dev workflow are solid before building Epic 3 UI stories.

## Acceptance Criteria

1. A **Defensive AC Checklist** is created at `docs/defensive-ac-checklist.md` covering: negative/error paths, concurrency behavior, input validation boundaries, error UX messaging, and security implications — story authors must address each category when writing ACs
2. A **Pre-Review Self-Check** section is added to the story template requiring devs to verify: all ACs have at least one test, edge cases for every mutation (not-found, already-done, invalid state), error handlers on all mutations, and type safety (no `Record<string, unknown>` returns)
3. `docs/gotchas.md` is updated with Epic 2 discoveries: antd `Spin.tip` → `description`, `UploadFile` vs native `File`/`RcFile` in `beforeUpload`, `postForm()` pattern for FormData uploads, BigInt→Number serialization requirement
4. `docs/testing-patterns.md` is updated with Epic 2 patterns: mutation submission tests, resign edge-case pattern (nonexistent + already-done), file upload mock patterns
5. Pre-existing TypeScript errors are resolved: shared module resolution (TS2835), React 19 `useRef` type issues, antd v6 type mismatches — `tsc --noEmit` passes clean across all packages
6. Full regression suite passes: backend, frontend, shared — zero failures, zero new type errors
7. `docs/gotchas.md` and `docs/testing-patterns.md` changes are committed

## Tasks / Subtasks

- [x] Task 1: Create `docs/defensive-ac-checklist.md` (AC: #1)
  - [x] Define categories: negative paths, concurrency, input boundaries, error UX, security
  - [x] Include examples from Epic 2 findings (skipDuplicates, joining_date validation, resign error handler)
  - [x] Format as a checklist story authors fill out per-story

- [x] Task 2: Add Pre-Review Self-Check to dev workflow (AC: #2)
  - [x] Document the self-check steps in `docs/dev-workflow.md` or equivalent
  - [x] Include: AC coverage verification, edge-case test audit, error handler check, type safety scan

- [x] Task 3: Update `docs/gotchas.md` (AC: #3)
  - [x] Add antd v6 `Spin.tip` → `description` deprecation
  - [x] Add antd `Upload` File type guidance (`beforeUpload` receives `RcFile` which extends `File`)
  - [x] Add `postForm()` pattern for FormData/multipart uploads
  - [x] Add BigInt serialization note (Prisma BigInt → Number for JSON responses)

- [x] Task 4: Update `docs/testing-patterns.md` (AC: #4)
  - [x] Add mutation submission test patterns (create, update, resign)
  - [x] Add edge-case testing pattern (nonexistent resource, invalid state transition)
  - [x] Add file upload mock patterns from Story 2.4

- [x] Task 5: Resolve pre-existing TypeScript errors (AC: #5)
  - [x] Verify shared module resolution (TS2835) — already clean, no fix needed
  - [x] Verify React 19 `useRef` types — already clean, no fix needed
  - [x] Fix antd v6 type mismatches — `ModalFuncProps` fix in EmployeeList.test.tsx
  - [x] Verify `pnpm tsc --noEmit` clean across all 3 packages

- [x] Task 6: Full regression run (AC: #6)
  - [x] Run backend tests — expect 260+ passing
  - [x] Run frontend tests — expect 105+ passing
  - [x] Run shared tests — expect 40+ passing
  - [x] Document final test counts

## Dev Notes

### Scope & Philosophy

This is a process + cleanup story, not a feature story. No new production features — only documentation, tooling, and type fixes. Pattern established by Story 2.0/2.0b — proven effective.

The Defensive AC Checklist is the highest-priority deliverable — it addresses the root cause of ~50% of code review findings identified in the Epic 2 retrospective.

### Source Material

- [Source: _bmad-output/implementation-artifacts/epic-1-retro-2026-02-24.md] — Epic 1 retro action items
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-02-25.md] — Epic 2 retro findings (this retro)

### Epic 2 Code Review Findings (input for checklists)

**AC gaps that Defensive AC Checklist should prevent:**
- 2.1 H1: No concurrent upload behavior defined → `skipDuplicates` missing
- 2.1 M1: `joining_date` validation not specified → accepted any string
- 2.1 M4: File upload security not specified → MIME-only check
- 2.3 M1: No error handling requirement for resign action → missing `onError`
- 2.3 M3: Departments RBAC not scoped for HR/Finance → AC only said "Department Select"

**Dev execution gaps that Pre-Review Self-Check should prevent:**
- 2.2 M4: `serializeEmployee` type safety — `Record<string, unknown>` return
- 2.2 M5/M6: Missing resign edge-case tests (nonexistent, already-resigned)
- 2.4 H1/H2: antd `UploadFile` vs `File` type mismatch, redundant handler
- 2.0b M2/M3: Missing assertions in regression tests

### Architecture Compliance

- **Type checking:** `pnpm tsc --noEmit` (NEVER `tsc -b`)
- **Tests:** `pnpm test` with `--passWithNoTests`
- **Docs:** CommonMark format, clear headings, actionable checklists

### What NOT to Do

- Do NOT add new features or production functionality
- Do NOT refactor existing service/route code
- Do NOT add new dependencies
- Do NOT modify database schema

### References

- [Source: docs/gotchas.md] — Current gotchas doc to extend
- [Source: docs/testing-patterns.md] — Current testing patterns to extend
- [Source: _bmad-output/implementation-artifacts/2-1-*.md through 2-4-*.md] — Story records with review findings

## Dev Agent Record

### Implementation Plan

Documentation-only story addressing Epic 2 retrospective action items. No production code changes — only docs, type fixes, and regression verification.

### Completion Notes

**Task 1:** Created `docs/defensive-ac-checklist.md` with 5 categories (negative paths, concurrency, input boundaries, error UX, security). Each category includes checkboxes, guidance, and concrete Epic 2 examples showing what the checklist would have caught.

**Task 2:** Created `docs/dev-workflow.md` with Pre-Review Self-Check covering: AC coverage verification, edge-case test audit, error handler check, and type safety scan. Also includes pre-implementation and post-implementation checklists.

**Task 3:** Updated `docs/gotchas.md` with 4 Epic 2 discoveries:
- antd v6 `Spin.tip` → `description` deprecation with code example
- antd `Upload` `beforeUpload` receives `RcFile` (not `File`) with type guidance
- `postForm()` helper pattern for FormData/multipart uploads
- Prisma BigInt → Number serialization for JSON responses

**Task 4:** Updated `docs/testing-patterns.md` with 3 Epic 2 patterns:
- Mutation submission test patterns (happy path, validation, not-found, invalid state)
- Edge-case testing pattern (nonexistent + already-done)
- File upload mock patterns (backend supertest `.attach()` + frontend `fireEvent.drop`)

**Task 5:** Resolved pre-existing TypeScript errors. Shared and backend were already clean. Fixed frontend `EmployeeList.test.tsx` — antd v6 `ModalFuncProps` type mismatch where `Record<string, unknown>` was used instead of proper antd types. All 3 packages now pass `tsc --noEmit` clean.

**Task 6:** Full regression suite passed with zero failures:
- Backend: 291 tests passing (19 test files)
- Frontend: 105 tests passing (13 test files)
- Shared: 40 tests passing (3 test files)
- Total: 436 tests, zero failures, zero type errors

## File List

- `docs/defensive-ac-checklist.md` — NEW: Defensive AC Checklist (5 categories with Epic 2 examples)
- `docs/dev-workflow.md` — NEW: Dev workflow with Pre-Review Self-Check; `tsc --noEmit` moved into self-check section
- `docs/gotchas.md` — MODIFIED: Added 4 Epic 2 gotchas (Spin.description, RcFile, postForm, BigInt)
- `docs/testing-patterns.md` — MODIFIED: Added 3 Epic 2 patterns (mutation tests, edge cases, file upload mocks)
- `packages/frontend/src/pages/employees/EmployeeList.test.tsx` — MODIFIED: Fixed antd ModalFuncProps type, extracted `spyModalConfirm` helper
- `_bmad/bmm/workflows/4-implementation/create-story/template.md` — MODIFIED: Added self-check and AC checklist references to Dev Notes
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: Story status ready-for-dev → in-progress → review

## Change Log

- 2026-02-25: Story 3.0 implemented — created defensive AC checklist and pre-review self-check docs, updated gotchas and testing patterns with Epic 2 findings, fixed frontend TypeScript error, verified full regression (436 tests passing)
- 2026-02-25: Code review fixes — H1: clarified task 5.1/5.2 wording (verified clean, not fixed); M1: added checklist/self-check references to story template; M3: extracted `spyModalConfirm` helper in test; M4: moved `tsc --noEmit` into Pre-Review Self-Check section

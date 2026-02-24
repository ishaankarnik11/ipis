# Dev Workflow

Pre-implementation and pre-review checklists to catch common issues before they reach code review.

---

## Pre-Review Self-Check

**When to use:** Complete this checklist BEFORE submitting any story for code review. This addresses the dev execution gaps that caused ~50% of code review findings in Epics 1 and 2.

### AC Coverage Verification

- [ ] Every Acceptance Criterion has at least one test that exercises it
- [ ] ACs with numeric thresholds have tests that verify the exact boundary
- [ ] ACs requiring UI feedback (toasts, modals, error messages) have component tests

### Edge-Case Test Audit

- [ ] Every mutation (create/update/delete) has tests for:
  - [ ] Non-existent resource (404 path)
  - [ ] Already-done / invalid state transition (e.g., resign an already-resigned employee)
  - [ ] Invalid input (missing required fields, wrong types)
- [ ] Every query has tests for:
  - [ ] Empty results
  - [ ] Pagination boundaries (if applicable)

### Error Handler Check

- [ ] Every mutation hook/call has an `onError` handler (backend: catch block, frontend: onError callback)
- [ ] Error handlers provide user-facing feedback (not silent failures)
- [ ] Async fire-and-forget calls have `.catch()` handlers

### Type Safety Scan

- [ ] Run `pnpm tsc --noEmit` across all packages — must pass clean (never use `tsc -b`)
- [ ] No `Record<string, unknown>` returns from service functions — use explicit types
- [ ] No `any` types introduced (search for `: any` in changed files)
- [ ] Serialization functions return typed objects, not generic records
- [ ] Component props use proper antd types (e.g., `UploadFile` vs native `File`)

---

## Pre-Implementation Checklist

Before starting any story:

- [ ] Read `docs/gotchas.md` for framework-specific traps
- [ ] Read `docs/testing-patterns.md` for test infrastructure patterns
- [ ] Read `docs/defensive-ac-checklist.md` to verify story ACs are complete
- [ ] Check the story's Dev Notes for architecture requirements and previous learnings

---

## Post-Implementation Reminders

- [ ] Run `pnpm test` with `--passWithNoTests` in all packages
- [ ] Update `docs/gotchas.md` if any new framework traps were discovered
- [ ] Update `docs/testing-patterns.md` if any new test workarounds were needed

# Story 3.6: E2E Regression Fixes — project-list-detail & system-config

Status: ready-for-dev

## Story

As the Development team,
We need to fix the 2 pre-existing E2E test failures carried forward from Stories 3.3/3.4,
so that the full E2E regression suite runs 100% green before Epic 3 closes.

## Background

These failures were identified during Story 3.5 (admin approval UI). They originate from Story 3.4 (project-list-detail) and Story 1.5 (system-config). Both failures are reproducible and isolated — they do not affect other tests.

### Failure 1: project-list-detail.spec.ts — "Senior Developer" not visible (line 65)

**Test:** `E2E-P3: DM clicks project row and sees detail with breadcrumb`
**Assertion:** `await expect(page.getByText('Senior Developer')).toBeVisible();`
**Expected:** Team roster table shows the designation "Senior Developer" for EMP001.
**Observed:** The text "Senior Developer" is not visible on the page despite the employee being assigned.

**Root cause investigation notes:**
- Seed data (`seed.ts`) creates EMP001 with `designation: 'Senior Developer'` (line 112) and assigns them to the active TM project (lines 250–260).
- Backend `getTeamMembers` (project.service.ts:388–409) includes `employee: { select: { name: true, designation: true } }` and maps `designation: m.employee.designation` — this looks correct.
- Frontend `ProjectDetail.tsx` defines team columns with `{ title: 'Designation', dataIndex: 'designation' }` (line 17).
- The `TeamMember` interface in `projects.api.ts` has `designation: string`.
- Possible causes: (a) timing issue — table renders before team members API resolves; (b) the `getTeamMembers` endpoint returns empty or the designation field is null; (c) the column renders but the row is off-screen. The dev agent should add explicit `waitFor` and debug logging if needed.

### Failure 2: system-config.spec.ts — ArrowDown persistence (line 32)

**Test:** `modifies and saves configuration`
**Assertion:** After `ArrowDown` (176 → 175), Save, Reload → `toHaveValue('175')` fails (still shows '176').
**Expected:** After pressing ArrowDown and saving, the value persists as 175 on reload.
**Observed:** After reload, the value is still 176.

**Root cause investigation notes:**
- The ArrowDown key on antd `InputNumber` should decrement from 176 to 175 and fire `onChange`.
- The test verifies `toHaveValue('175')` immediately after ArrowDown (line 25), so the key event fires correctly in the browser.
- After Save + reload, the value reverts to 176, suggesting either: (a) the form state isn't updated by ArrowDown's synthetic event — the parent component's state/form value doesn't update; (b) the Save API call is made but with the stale form value (176); (c) the antd InputNumber `onChange` fires too late and the form captures the old value.
- The SystemConfig component should be inspected to understand how form state tracks InputNumber changes. If using antd `Form`, the ArrowDown event may not trigger form field update reliably.

## Acceptance Criteria (AC)

1. **Given** the E2E test `project-list-detail.spec.ts` test "E2E-P3",
   **When** the DM navigates to the project detail page for 'Seeded Active TM Project',
   **Then** the team roster table shows "Senior Developer" as the designation for the assigned employee — test passes.

2. **Given** the E2E test `system-config.spec.ts` test "modifies and saves configuration",
   **When** Admin presses ArrowDown on Standard Monthly Hours, clicks Save, and reloads,
   **Then** the value shows 175 (decremented) after reload — test passes.

3. **Given** the full E2E regression suite,
   **When** all tests are run,
   **Then** 47/47 tests pass (zero red).

## E2E Test Scenarios

No new E2E tests needed — this story fixes existing failing tests.

## Tasks / Subtasks

- [ ] Task 1: Fix "Senior Developer" designation not visible in project detail (AC: 1)
  - [ ] 1.1 Run failing test in isolation to confirm and capture debug output
  - [ ] 1.2 Investigate root cause (API response, component rendering, timing)
  - [ ] 1.3 Implement fix (component, API, or test-level as appropriate)
  - [ ] 1.4 Verify `project-list-detail.spec.ts` E2E-P3 passes

- [ ] Task 2: Fix ArrowDown persistence in system config (AC: 2)
  - [ ] 2.1 Run failing test in isolation to confirm and capture debug output
  - [ ] 2.2 Investigate root cause (form state, InputNumber onChange, save payload)
  - [ ] 2.3 Implement fix (component, test interaction, or both as appropriate)
  - [ ] 2.4 Verify `system-config.spec.ts` "modifies and saves" passes

- [ ] Task 3: Full regression verification (AC: 3)
  - [ ] 3.1 Run complete E2E suite — all 47 tests must pass
  - [ ] 3.2 Run frontend unit tests — no regressions
  - [ ] 3.3 Run backend unit tests — no regressions

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Fix at the right level**: Prefer fixing the application code (component/API) if the bug is real. Only fix the test if the test interaction is genuinely wrong.
2. **No test deletions**: All existing tests must continue to pass — do not remove or weaken assertions.
3. **Minimal changes**: This is a bug-fix story. No refactoring, no new features.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| ProjectDetail.tsx | `pages/projects/ProjectDetail.tsx` | Team roster table with designation column |
| project.service.ts | `backend/src/services/project.service.ts` | `getTeamMembers` with designation include |
| SystemConfig.tsx | `pages/admin/SystemConfig.tsx` | antd Form + InputNumber for monthly hours |
| seed.ts | `packages/e2e/seed.ts` | EMP001 with 'Senior Developer' designation |

### New Dependencies Required

None.

### References

- [Source: Party Mode discussion — 2026-02-25]
- [Source: Story 3.5 completion notes — 2 pre-existing failures]

### Previous Story Intelligence

- **From 3.4:** ProjectDetail team roster created, seed data established. Test was written but never passed in CI.
- **From 1.5:** SystemConfig page created with antd Form and InputNumber. ArrowDown interaction test may have a form-state timing issue.

## Dev Agent Record

### Agent Model Used
(to be filled)

### Debug Log References
(to be filled)

### Completion Notes List
(to be filled)

### Change Log
(to be filled)

### File List
(to be filled)

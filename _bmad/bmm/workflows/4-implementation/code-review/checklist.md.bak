# Senior Developer Review - Validation Checklist

- [ ] Story file loaded from `{{story_path}}`
- [ ] Story Status verified as reviewable (review)
- [ ] **Sprint Status Gate:** Verified that `_bmad-output/implementation-artifacts/sprint-status.yaml` shows this story as `review`. If sprint-status still shows `ready-for-dev` or `in-progress`, the review CANNOT proceed — update sprint-status first. This catches implementations done outside the dev-story workflow.
- [ ] Epic and Story IDs resolved ({{epic_num}}.{{story_num}})
- [ ] Story Context located or warning recorded
- [ ] Epic Tech Spec located or warning recorded
- [ ] Architecture/standards docs loaded (as available)
- [ ] Tech stack detected and documented
- [ ] MCP doc search performed (or web fallback) and references captured
- [ ] Acceptance Criteria cross-checked against implementation
- [ ] **Data Contract Audit:** Every field in the Data Contract table verified end-to-end (UI → Zod → Prisma → E2E DB assertion). Any field collected but not persisted = HIGH finding.
- [ ] File List reviewed and validated for completeness
- [ ] Tests identified and mapped to ACs; gaps noted
- [ ] **Persist-and-Verify:** Every E2E test that submits data includes a DB query asserting persistence
- [ ] **E2E Quality Gate (ABSOLUTE):** Full E2E suite (`pnpm test:e2e`) executed with ALL tests passing. Any failing E2E test = automatic HIGH finding. Story CANNOT be marked done with any E2E failure. No exceptions.
- [ ] Code quality review performed on changed files
- [ ] Security review performed on changed files and dependencies
- [ ] **HIGH Findings Gate:** All HIGH findings are FIXED (not "Noted"). No unresolved HIGHs permitted.
- [ ] **Master Test Plan Audit:** All FRs touched by this story have corresponding rows in `docs/master-test-plan.md` with status PASS or TEST_WRITTEN. No DEVELOPED_UNTESTED gaps introduced. New scenarios added if gaps discovered during review.
- [ ] Outcome decided (Approve/Changes Requested/Blocked)
- [ ] Review notes appended under "Senior Developer Review (AI)"
- [ ] Change Log updated with review entry
- [ ] Status updated according to settings (if enabled)
- [ ] Sprint status synced (if sprint tracking enabled)
- [ ] Story saved successfully

_Reviewer: {{user_name}} on {{date}}_

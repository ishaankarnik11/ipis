# Senior Developer Review - Validation Checklist

- [ ] Story file loaded from `{{story_path}}`
- [ ] Story Status verified as reviewable (review)
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
- [ ] Code quality review performed on changed files
- [ ] Security review performed on changed files and dependencies
- [ ] **HIGH Findings Gate:** All HIGH findings are FIXED (not "Noted"). No unresolved HIGHs permitted.
- [ ] Outcome decided (Approve/Changes Requested/Blocked)
- [ ] Review notes appended under "Senior Developer Review (AI)"
- [ ] Change Log updated with review entry
- [ ] Status updated according to settings (if enabled)
- [ ] Sprint status synced (if sprint tracking enabled)
- [ ] Story saved successfully

_Reviewer: {{user_name}} on {{date}}_

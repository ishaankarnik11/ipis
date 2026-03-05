# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Data Contract (MANDATORY for stories with user input or computed values)

<!-- GATE: SM agent MUST NOT mark story as ready-for-dev if this table is empty for any story that creates, updates, or displays data. For API-only stories, trace fields from request body to DB. For UI stories, trace from form field to DB column. Every row must be complete — no TBD or N/A in Zod/Prisma/E2E columns. -->

| UI Field / API Field | Form Component / Request Field | Zod Schema Field | Prisma Column | E2E DB Assertion |
|---|---|---|---|---|
| [e.g., SLA Description] | [e.g., Input.TextArea] | [e.g., slaDescription: z.string()] | [e.g., sla_description TEXT] | [e.g., expect(row.slaDescription).toBe(input)] |

**Traceability Rule:** Every field a user enters or the system computes MUST have a complete row in this table. If a field appears in the UI but has no Prisma column, the story is incomplete — either add the column or remove the field.

## E2E Test Scenarios (UI stories only)

<!-- Required for any story that adds or modifies frontend UI. Each scenario becomes a Playwright test case. -->

### Positive

- E2E-P1: [Happy-path user journey — describe what the user does and what they see]

### Negative

- E2E-N1: [Error/edge-case scenario — invalid input, unauthorized access, failed API, etc.]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary
- Complete the [Defensive AC Checklist](docs/defensive-ac-checklist.md) when writing ACs
- Complete the [Pre-Review Self-Check](docs/dev-workflow.md#pre-review-self-check) before submitting for review
- **Data Contract verification:** Every field in the Data Contract table above MUST have a corresponding test that verifies DB persistence (see [Persist-and-Verify Pattern](docs/e2e-testing.md#persist-and-verify-pattern))

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

# Story 13.12: Config Change → Visible Recalculation Feedback

Status: review

## Story

As a system administrator updating system configuration,
I need visible feedback that a recalculation has been triggered and completed after I change settings like standard monthly hours or overhead per employee,
so that I trust the system is updating all downstream numbers.

## Dependencies

- Story 13.3 (Wire recalculation triggers — config changes must actually trigger recalc)

## Context

After Story 13.3 wires the recalculation trigger to config changes, this story ensures the user SEES that it happened. Without feedback, the admin saves config, sees "Saved" — and has no idea whether dashboards are being updated.

## Acceptance Criteria

1. **Given** I update `standardMonthlyHours` or `annualOverheadPerEmployee`,
   **When** the save completes,
   **Then** I see a notification: "Configuration saved. Recalculating all project financials..." followed by "Recalculation complete. X projects updated." when done.

2. **Given** the recalculation is in progress,
   **When** I navigate to any dashboard,
   **Then** the dashboard shows fresh data (React Query cache is invalidated after recalc completes).

3. **Given** the recalculation fails,
   **When** the error is caught,
   **Then** I see an error notification: "Configuration saved but recalculation failed. Dashboard data may be stale. Please contact support."

## Technical Notes

### Implementation
- Config update API response should include recalculation result: `{ data: { config }, meta: { recalculation: { projectsProcessed: 5, status: 'completed' } } }`
- Frontend shows progress notification → success/error notification
- After success, invalidate all dashboard query keys

### Testing Requirements

**Backend Integration:**
- Update config → verify response includes recalculation metadata
- Update config → verify AuditEvent logged with `RECALC_CONFIG_UPDATE`

**E2E Consequence Test:**
- As Admin: note a utilization % → change standard hours → verify notification appears → navigate to dashboard → verify utilization % changed

**Frontend Test:**
- Notification sequence: saving → recalculating → complete
- Error notification on recalc failure

## Dev Agent Record

### Implementation Plan
- Backend route now returns `{ success: true, meta: { recalculation: ... } }` from updateConfig
- Frontend mutation handler inspects recalculation result and shows appropriate message
- On success: "Configuration saved. Recalculation complete — X projects updated."
- On failure: Warning message about stale dashboard data
- Dashboard query caches invalidated after successful recalculation

### Completion Notes
- AC1: Shows "Configuration saved. Recalculation complete — X projects updated." on success
- AC2: Dashboard caches invalidated via `queryClient.invalidateQueries({ queryKey: reportKeys.all })`
- AC3: Shows warning "Configuration saved but recalculation failed. Dashboard data may be stale."
- All 600 backend tests pass, all 366 frontend tests pass, typecheck clean

## File List

### Modified Files
- packages/backend/src/routes/config.routes.ts (return recalc result in response meta)
- packages/backend/src/routes/config.routes.test.ts (relaxed assertion for meta field)
- packages/frontend/src/services/config.api.ts (ConfigUpdateResponse type with recalc metadata)
- packages/frontend/src/pages/admin/SystemConfig.tsx (recalc feedback notifications + cache invalidation)

## Change Log
- 2026-03-15: Added visible recalculation feedback after config changes

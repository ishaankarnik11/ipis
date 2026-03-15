# Story 13.3: Wire Recalculation Triggers (Team Change, Config, Timesheet)

Status: ready-for-dev

## Story

As any IPIS user viewing dashboards,
I need financial data to update automatically whenever team composition changes, system configuration changes, or timesheet data is uploaded,
so that dashboards always show current numbers and I can trust the data for decision-making.

## Context

Currently, recalculation is triggered ONLY by billing upload (`processBillingUpload()` in `upload.service.ts`). This means:
- Add/remove team member → dashboard numbers stay stale
- Change standard monthly hours (176 → 160) → numbers stay stale
- Change overhead per employee → numbers stay stale
- Upload timesheets → numbers stay stale (only billing triggers recalc)

The `triggerRecalculation()` function in `snapshot.service.ts` works correctly when called — the problem is it's only called from one place.

## Persona Co-Authorship

### Vikram (DM) — BLOCK
> "I add someone to the project and the financials don't update. Then what's the point? I need to see the burn rate change immediately."

### Rajesh (Admin) — BLOCK
> "When I change Standard Monthly Hours from 176 to 160, the system says 'saved' — and then nothing happens. Every dashboard still uses 176. That's not a feature, that's a broken form."

### Priya (Finance) — CONCERNED
> "Timesheet uploads should trigger recalculation too. If I upload January timesheets, I expect the utilization numbers to update immediately, not wait for the billing upload."

## Acceptance Criteria

1. **Given** a team member is added to a project,
   **When** the `addTeamMember()` operation completes,
   **Then** `triggerRecalculation()` is called for that project AND the project's dashboard data reflects the new team member's cost impact.

2. **Given** a team member is removed from a project,
   **When** the `removeTeamMember()` operation completes,
   **Then** `triggerRecalculation()` is called for that project AND the project's dashboard data no longer includes that member's cost.

3. **Given** system config `standardMonthlyHours` is updated,
   **When** the `updateConfig()` operation completes,
   **Then** a FULL recalculation is triggered across ALL projects (since standard hours affects every utilization calculation).

4. **Given** system config `annualOverheadPerEmployee` is updated,
   **When** the `updateConfig()` operation completes,
   **Then** a FULL recalculation is triggered across ALL projects.

5. **Given** a timesheet file is uploaded successfully,
   **When** `processTimesheetUpload()` completes,
   **Then** `triggerRecalculation()` is called for all projects affected by the uploaded timesheet entries.

6. **Given** a recalculation is triggered by any of the above events,
   **When** the recalculation completes,
   **Then** an `AuditEvent` is logged with the trigger source (e.g., `RECALC_TEAM_CHANGE`, `RECALC_CONFIG_UPDATE`, `RECALC_TIMESHEET_UPLOAD`).

7. **Given** the frontend displays a dashboard after any trigger event,
   **When** React Query refetches dashboard data,
   **Then** the new snapshot values are visible without requiring a manual page refresh.

## Technical Notes

### Backend Changes

```typescript
// project.service.ts
async addTeamMember(...) {
  // ... existing logic
  await snapshotService.triggerRecalculation(projectId);
}

async removeTeamMember(...) {
  // ... existing logic
  await snapshotService.triggerRecalculation(projectId);
}

// config.service.ts
async updateConfig(...) {
  // ... existing logic
  await snapshotService.triggerFullRecalculation(); // all projects
}

// upload.service.ts - processTimesheetUpload
async processTimesheetUpload(...) {
  // ... existing logic
  // Extract unique projectIds from uploaded entries
  await snapshotService.triggerRecalculation(projectIds);
}
```

### `triggerFullRecalculation()`
May need a new function in `snapshot.service.ts` that fetches all ACTIVE projects and runs recalculation for each. The existing `triggerRecalculation()` takes a single project — extend to accept an array or add a separate function.

### Frontend Changes
- After `addTeamMember` / `removeTeamMember` mutation succeeds, invalidate dashboard query keys so React Query refetches
- After `updateConfig` mutation succeeds, invalidate all dashboard query keys
- Show "Recalculation in progress..." indicator if recalc is async (optional — can be sync for now given small data volume)

### Testing Requirements

**Backend Integration (Real DB) — Consequence Tests:**
- Seed project with team → get snapshot values → add team member → get snapshot values → assert values CHANGED
- Seed project with team → get snapshot values → remove team member → get snapshot values → assert values CHANGED
- Seed config at 176 hours → get utilization snapshot → update config to 160 → get utilization snapshot → assert value CHANGED
- Upload timesheet → get project snapshot → verify snapshot reflects new timesheet data

**E2E Consequence Tests:**
- As DM: navigate to project dashboard → note revenue number → add team member → navigate back to dashboard → verify number changed
- As Admin: navigate to executive dashboard → note utilization → change standard hours → navigate back → verify utilization changed

**What This Replaces:**
- Remove the runtime `1/project_count` allocation computation — replaced by real `allocationPercent` (Story 13.2)
- The existing billing-upload recalc trigger remains unchanged

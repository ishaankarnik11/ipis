# Story 5.3: Upload Center UI & Progress Feedback

Status: ready-for-dev

## Story

As a Finance or HR user,
I want to see a dedicated Upload Center with real-time progress feedback during uploads and a history of all past uploads,
so that I can track upload status, download error reports for failed rows, and know exactly which data period the dashboard is reflecting.

## Acceptance Criteria (AC)

1. **Given** the Upload Center page (`/uploads`),
   **When** it loads,
   **Then** it shows three upload zones (Timesheets, Billing/Revenue, Salary) with antd v6 `Upload` (Dragger variant), each labeled with the expected file format and a "Download Template" link.

2. **Given** a Finance user viewing the Upload Center,
   **When** they see the salary upload zone,
   **Then** it is hidden (RBAC — salary uploads are HR-only); similarly HR users do not see timesheet/billing zones.

3. **Given** a user selects a file for upload,
   **When** the file already has existing data for the selected period,
   **Then** an `UploadConfirmationCard` modal appears explaining "This will replace [N] existing rows for [Month Year]. Are you sure?" before the upload proceeds.

4. **Given** a file upload is in progress,
   **When** the `EventSource` connection is active via the `useUploadProgress` hook,
   **Then** an antd `Progress` bar updates in real-time as SSE events arrive; the user can see percentage completion and current stage label (e.g., "Validating rows…", "Writing records…", "Running recalculation…").

5. **Given** an upload completes successfully,
   **When** the SSE `'complete'` event arrives,
   **Then** the `useUploadProgress` hook triggers TanStack Query cache invalidation for all dashboard and project queries; the progress bar reaches 100% with a success state.

6. **Given** a timesheet upload that fails validation (HTTP 422),
   **When** the error response arrives,
   **Then** a structured error panel lists every mismatched employee ID and project name; no download option (full rejection, nothing to report on).

7. **Given** a salary upload that completes with partial errors,
   **When** the SSE `'complete'` event arrives with `failedRows > 0`,
   **Then** a "Download Error Report" button appears; clicking it calls `GET /api/v1/uploads/:uploadEventId/error-report` and triggers XLSX download via the browser.

8. **Given** the `UploadHistoryLog` table below the upload zones,
   **When** the page loads,
   **Then** it shows the last 20 `upload_events` rows with columns: Type, Period, Rows Imported, Status (antd Tag: green SUCCESS / orange PARTIAL / red FAILED), Uploaded By, Uploaded At — paginated via antd `Table`.

9. **Given** the `DataPeriodIndicator` component,
   **When** it is rendered in the Upload Center and on all dashboard pages,
   **Then** it displays "Data as of: [Month Year] · Updated [relative time]" sourced from the latest SUCCESS `upload_events` row for each type.

10. **Given** tablet viewports (768–1023px),
    **When** the Upload Center renders,
    **Then** all three upload zones display a "Upload not available on tablet — please use a desktop browser" message consistent with the UX responsive spec; the `UploadHistoryLog` table remains visible and scrolls horizontally.

11. **Given** the `useUploadProgress` hook,
    **When** the SSE connection drops unexpectedly,
    **Then** the hook attempts one reconnect after 3 seconds; if it fails again it shows an inline "Connection lost — refresh to check status" warning without crashing the page.

12. **Given** `upload-center.test.tsx`,
    **When** `pnpm test` runs,
    **Then** tests cover: zone visibility by role, UploadConfirmationCard display on replacement, progress bar updates from mocked SSE events, error panel on 422, error report download trigger, DataPeriodIndicator rendering with correct period text.

## Tasks / Subtasks

- [ ] Task 1: Upload Center page layout (AC: 1, 2, 10)
  - [ ] 1.1 Create `pages/upload/UploadCenter.tsx`
  - [ ] 1.2 Three upload zones with antd `Upload.Dragger` — Timesheets, Billing, Salary
  - [ ] 1.3 Role-based zone visibility via `useAuth` hook — Finance sees timesheet+billing, HR sees salary, Admin sees all
  - [ ] 1.4 Tablet viewport message: "Upload not available on tablet"
  - [ ] 1.5 "Download Template" links per zone

- [ ] Task 2: UploadConfirmationCard (AC: 3)
  - [ ] 2.1 Create `components/UploadConfirmationCard.tsx` (or reuse if already exists from Story 2.4)
  - [ ] 2.2 Modal with period + row count warning before replacement upload

- [ ] Task 3: useUploadProgress hook (AC: 4, 5, 11)
  - [ ] 3.1 Create `hooks/useUploadProgress.ts`
  - [ ] 3.2 Browser-native `EventSource` connection to `GET /api/v1/uploads/progress/:uploadEventId`
  - [ ] 3.3 Parse SSE events → return `{ stage, percent, isComplete, error }`
  - [ ] 3.4 On `complete` event, call `queryClient.invalidateQueries()` for dashboard/project keys
  - [ ] 3.5 Reconnect logic: one retry after 3s, then show warning

- [ ] Task 4: Progress bar + error panels (AC: 4, 6, 7)
  - [ ] 4.1 antd `Progress` bar driven by `useUploadProgress` state
  - [ ] 4.2 Validation error panel for 422 rejections (list mismatched IDs/names)
  - [ ] 4.3 "Download Error Report" button for partial salary imports

- [ ] Task 5: UploadHistoryLog (AC: 8)
  - [ ] 5.1 Create `components/UploadHistoryLog.tsx`
  - [ ] 5.2 antd `Table` — Type, Period, Rows Imported, Status (Tag), Uploaded By, Uploaded At
  - [ ] 5.3 Query `GET /api/v1/uploads/history` with TanStack Query
  - [ ] 5.4 Pagination — 20 per page

- [ ] Task 6: DataPeriodIndicator (AC: 9)
  - [ ] 6.1 Create `components/DataPeriodIndicator.tsx`
  - [ ] 6.2 "Data as of: [Month Year] · Updated [relative time]"
  - [ ] 6.3 Sourced from latest SUCCESS upload_events per type

- [ ] Task 7: API service layer (AC: 1-9)
  - [ ] 7.1 Create `services/uploads.api.ts` — upload functions, history query, error report download
  - [ ] 7.2 TanStack Query keys as constants: `uploadKeys.history`, `uploadKeys.progress(id)`

- [ ] Task 8: Router integration (AC: 1)
  - [ ] 8.1 Add `/uploads` route in router — guarded for Finance, HR, Admin

- [ ] Task 9: Tests (AC: 12)
  - [ ] 9.1 Create `pages/upload/upload-center.test.tsx`
  - [ ] 9.2 Test: Zone visibility by role (Finance sees timesheet+billing, HR sees salary)
  - [ ] 9.3 Test: UploadConfirmationCard shown on period with existing data
  - [ ] 9.4 Test: Progress bar updates from mocked SSE events
  - [ ] 9.5 Test: Error panel on 422 validation rejection
  - [ ] 9.6 Test: Error report download trigger on partial salary upload
  - [ ] 9.7 Test: DataPeriodIndicator renders correct period text

## Dev Notes

### Architecture Constraints (MUST follow)

1. **useUploadProgress uses EventSource**: Browser-native SSE — NOT TanStack Query for progress. TanStack Query is for history/static data only.
2. **Role-based zone visibility**: Check `useAuth().user.role` — do not expose zones for upload types the user cannot access.
3. **Cache invalidation on complete**: When SSE `complete` event fires, invalidate `['reports']`, `['projects']`, `['dashboards']` query keys.
4. **No chart library**: Use antd `Progress` bars. No recharts/chart.js.
5. **Download via blob**: Error report download uses `fetch` → `blob()` → `URL.createObjectURL()` → `<a>` click.
6. **Tablet restriction**: Upload zones disabled on tablet (768-1023px) per UX spec. History table still visible.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 — role + auth state |
| UploadConfirmationCard | `components/UploadConfirmationCard.tsx` | Story 2.4 — may already exist |
| api.ts fetch wrapper | `services/api.ts` | Story 1.3 |
| Router guards | `router/guards.tsx` | Story 1.3 — RoleGuard |
| antd ConfigProvider | `theme/index.ts` | Story 1.3 |

### SSE Hook Pattern

```typescript
// hooks/useUploadProgress.ts
export function useUploadProgress(uploadEventId: string | null) {
  const [state, setState] = useState({ stage: '', percent: 0, isComplete: false, error: null });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uploadEventId) return;
    const es = new EventSource(`/api/v1/uploads/progress/${uploadEventId}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'RECALC_COMPLETE') {
        setState({ stage: 'Complete', percent: 100, isComplete: true, error: null });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        es.close();
      }
      // ... handle other event types
    };
    es.onerror = () => { /* reconnect once after 3s */ };
    return () => es.close();
  }, [uploadEventId]);

  return state;
}
```

### New Dependencies Required

None — antd, EventSource (browser native), TanStack Query already available.

### Project Structure Notes

New files:
```
packages/frontend/src/
├── pages/upload/
│   ├── UploadCenter.tsx
│   └── upload-center.test.tsx
├── hooks/
│   └── useUploadProgress.ts
├── components/
│   ├── UploadHistoryLog.tsx
│   └── DataPeriodIndicator.tsx
├── services/
│   └── uploads.api.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — SSE Pattern, Frontend Loading State Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR17, FR20, FR21]

### Previous Story Intelligence

- **From 5.1:** Backend timesheet upload endpoint exists. Frontend needs to call it.
- **From 5.2:** Billing + salary endpoints + SSE event emitter exist. `useUploadProgress` consumes SSE.
- **From 2.4:** `UploadConfirmationCard` component may already exist — reuse if so.
- **From 1.3:** `useAuth` hook and router guards established. Use for role checks.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

# Story 2.4: Bulk Upload UI & Failed Rows Download

Status: ready-for-dev

## Story

As an HR user,
I want to upload the salary master Excel file through the application and download a report of failed rows for correction,
so that I can efficiently import all employees and quickly identify and fix any data quality issues.

## Acceptance Criteria (AC)

1. **Given** an authenticated HR user navigates to the Upload Center,
   **When** the salary upload section renders,
   **Then** an antd `Upload.Dragger` component is displayed labelled "Upload Employee Salary Master (.xlsx)" with a "Download Sample Template" link below it.

2. **Given** HR clicks "Download Sample Template",
   **When** `GET /api/v1/employees/sample-template` is called,
   **Then** an `.xlsx` file downloads immediately with correct column headers matching the required import format.

3. **Given** HR drops or selects a valid `.xlsx` file,
   **When** the file is uploaded via `POST /api/v1/employees/bulk-upload`,
   **Then** the `UploadConfirmationCard` renders showing: filename, total rows detected, rows successfully imported (N), rows failed (M) with a summary of error types.

4. **Given** some rows failed validation,
   **When** the `UploadConfirmationCard` renders,
   **Then** a "Download Failed Rows" button is visible; clicking it triggers download of an `.xlsx` file containing only the failed rows with an added `error` column describing each specific failure.

5. **Given** HR corrects the failed rows file and re-uploads,
   **When** `POST /api/v1/employees/bulk-upload` is called with the corrected file,
   **Then** the system imports the corrected rows and the `UploadConfirmationCard` updates showing the new import count with zero failures.

6. **Given** a file upload is in progress,
   **When** multer processes the file server-side,
   **Then** the upload button is disabled and an antd `Spin` loading indicator is displayed — no double-upload possible.

7. **Given** an invalid file type (non-`.xlsx`),
   **When** HR attempts to upload it,
   **Then** antd `Upload`'s `beforeUpload` hook rejects the file immediately with message: "Please upload an .xlsx file only" — no API call is made.

8. **Given** the Upload Center renders for HR,
   **When** previous salary uploads exist,
   **Then** an `UploadHistoryLog` table below the upload zone shows: File Type, Upload Date, Uploaded By, Records Imported — ordered newest first.

9. **Given** all rows were successfully imported,
   **When** the `UploadConfirmationCard` renders,
   **Then** the "Download Failed Rows" button is absent — no empty file download offered.

## Tasks / Subtasks

- [ ] Task 1: Upload Center page skeleton (AC: 1)
  - [ ] 1.1 Create `pages/upload/UploadCenter.tsx` — page shell with section for salary uploads
  - [ ] 1.2 antd `Upload.Dragger` with label "Upload Employee Salary Master (.xlsx)"
  - [ ] 1.3 "Download Sample Template" link below the dragger
  - [ ] 1.4 Add `/uploads` route in `router/index.tsx`
  - [ ] 1.5 Add "Upload Center" to sidebar for HR role

- [ ] Task 2: Upload API functions (AC: 2, 3)
  - [ ] 2.1 Create `services/uploads.api.ts` — `uploadSalaryFile(file)`, `downloadTemplate()`
  - [ ] 2.2 Define query keys: `uploadKeys = { history: ['uploads', 'history'] as const }`
  - [ ] 2.3 `downloadTemplate()` triggers browser download of template xlsx

- [ ] Task 3: File upload interaction (AC: 3, 6, 7)
  - [ ] 3.1 `beforeUpload` hook: reject non-xlsx with message
  - [ ] 3.2 On valid file: disable upload button, show `Spin` indicator
  - [ ] 3.3 Call `POST /api/v1/employees/bulk-upload` via `useMutation`
  - [ ] 3.4 On success: render `UploadConfirmationCard` with results

- [ ] Task 4: UploadConfirmationCard component (AC: 3, 4, 5, 9)
  - [ ] 4.1 Create `components/UploadConfirmationCard.tsx`
  - [ ] 4.2 Show: filename, total rows, imported count, failed count, error type summary
  - [ ] 4.3 "Download Failed Rows" button — visible only when `failed > 0`
  - [ ] 4.4 Download generates `.xlsx` with failed rows + error column (client-side generation from API response data using `xlsx` package)
  - [ ] 4.5 Re-upload button to try corrected file

- [ ] Task 5: UploadHistoryLog component (AC: 8)
  - [ ] 5.1 Create `components/UploadHistoryLog.tsx`
  - [ ] 5.2 antd `Table` showing recent salary uploads: File Type, Upload Date, Uploaded By, Records Imported
  - [ ] 5.3 Ordered newest first
  - [ ] 5.4 Data source: `GET /api/v1/uploads/history?type=SALARY` (to be built in Epic 5, for now use mock or the bulk upload response)

- [ ] Task 6: Tests (AC: 1-9)
  - [ ] 6.1 Create `pages/upload/UploadCenter.test.tsx`
  - [ ] 6.2 Test: Upload.Dragger renders with correct label
  - [ ] 6.3 Test: Non-xlsx file rejected before upload
  - [ ] 6.4 Test: Loading state during upload
  - [ ] 6.5 Test: UploadConfirmationCard shows correct counts
  - [ ] 6.6 Test: Download Failed Rows button visible when failures exist
  - [ ] 6.7 Test: Download Failed Rows button absent when all succeed
  - [ ] 6.8 Test: Template download link present

## Dev Notes

### Architecture Constraints (MUST follow)

1. **TanStack Query**: `useMutation` for file uploads. Invalidate `['employees']` and `['uploads', 'history']` on success.
2. **Client-side file validation only**: `beforeUpload` checks extension. All data validation happens server-side.
3. **antd v6 Upload.Dragger**: Use antd's built-in drag-and-drop upload component.
4. **No client-side Excel parsing**: Server parses the file. Client only generates the failed-rows download file.
5. **UploadConfirmationCard**: Reusable component — will be used again for timesheet/billing uploads in Epic 5.
6. **UploadHistoryLog**: Reusable component — shows upload history, will be extended in Epic 5.
7. **Frontend guards are UX only**: API RBAC is the security layer.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| useAuth hook | `hooks/useAuth.ts` | Story 1.3 |
| api.ts | `services/api.ts` | Story 1.3 — fetch wrapper |
| RoleGuard | `router/guards.tsx` | Story 1.3 |
| Router | `router/index.tsx` | Story 1.3 |
| formatCurrency | `shared/utils/currency.ts` | Story 1.1 |
| Theme config | `theme/index.ts` | Story 1.1 |
| QueryClient | `main.tsx` | Story 1.3 |
| Bulk upload API | `POST /api/v1/employees/bulk-upload` | Story 2.1 |
| Sample template API | `GET /api/v1/employees/sample-template` | Story 2.1 |

### API Endpoints Used

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/v1/employees/bulk-upload` | Story 2.1 — multipart file upload |
| GET | `/api/v1/employees/sample-template` | Story 2.1 — download template |

### Failed Rows Download Pattern

```typescript
// Client-side xlsx generation for failed rows download
import * as XLSX from 'xlsx';

function downloadFailedRows(failedRows: { row: number; employeeCode: string; error: string }[]) {
  const ws = XLSX.utils.json_to_sheet(failedRows.map(r => ({
    row_number: r.row,
    employee_code: r.employeeCode,
    error: r.error,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
  XLSX.writeFile(wb, 'failed-rows-report.xlsx');
}
```

### New Dependencies Required

- `xlsx` (SheetJS) in frontend — for client-side failed rows download generation. Install: `pnpm --filter frontend add xlsx`

### Project Structure Notes

New files to create:
```
packages/frontend/src/
├── pages/
│   └── upload/
│       ├── UploadCenter.tsx             # Main upload center page
│       └── UploadCenter.test.tsx        # Component tests
├── components/
│   ├── UploadConfirmationCard.tsx       # Reusable upload result display
│   ├── UploadConfirmationCard.test.tsx  # Tests
│   ├── UploadHistoryLog.tsx            # Reusable upload history table
│   └── UploadHistoryLog.test.tsx       # Tests
├── services/
│   └── uploads.api.ts                  # Upload API functions + query keys
```

Existing files to modify:
```
packages/frontend/src/router/index.tsx   # Add /uploads route
packages/frontend/src/layouts/           # Add Upload Center nav item for HR
```

### Testing Strategy

- **Component tests** (Vitest + React Testing Library): Upload interaction, confirmation card, history table
- **File validation tests**: Non-xlsx rejection, loading state
- **Mocked API**: Mock POST /bulk-upload responses for success, partial failure, full success
- **Co-located test files**: `*.test.tsx` next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, Upload Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Upload UI, UploadConfirmationCard]
- [Source: _bmad-output/planning-artifacts/prd.md — FR11, FR12, FR13]

### Previous Story Intelligence (from Stories 2.1, 2.2, 2.3)

- **From 2.1:** Bulk upload API complete. Response shape: `{ data: { imported, failed, failedRows } }`. Sample template endpoint works.
- **From 2.2:** Individual CRUD API complete. Employee list page structure established.
- **From 2.3:** Employee list page, employees.api.ts, router/navigation patterns established.
- **From 1.5:** CRUD UI pattern: antd Table + Modal + Form. Follow for consistency.
- **Note:** UploadCenter page created here will be EXTENDED in Epic 5 to add timesheet/billing upload zones. Design it to be additive.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

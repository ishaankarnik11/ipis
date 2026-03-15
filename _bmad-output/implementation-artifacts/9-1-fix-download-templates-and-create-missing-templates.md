# Story 9.1: Fix Download Templates & Create Missing Templates

Status: done

## Story

As a Finance or HR user,
I want to download correctly formatted Excel templates from the Upload Center so that I can fill them with data and upload without guessing the required column format.

## Primary Persona

Priya (Finance) — Priya needs to download the Revenue/Billing template monthly. If the download button is broken, she has no way to know the expected format and her upload will fail.

## Persona Co-Authorship Review

### Priya (Finance) — PASS with notes
> "The download template button doesn't work — how do I know the format? I tried clicking it three times. Nothing happened. I ended up asking Rajesh to send me the old file, which defeats the purpose. Fix this and make sure the Revenue template has all the columns I need: Project ID, Client Name, Invoice Amount, Invoice Date, Project Type, Vertical."

### Neha (HR) — PASS with notes
> "I need templates for Employee Master and Monthly Timesheet. Employee Master should have: Employee ID, Department, Designation, Annual CTC, Billable/Non-Billable, Joining Date. Monthly Timesheet: Employee ID, Project ID, Billable Hours, Non-Billable Hours, Month. Without these templates, I'm flying blind on the upload format."

### Rajesh (Admin) — ADVISORY
> "People keep asking me for template files. The system should serve them. I shouldn't be the workaround."

## Acceptance Criteria (AC)

1. **Given** the Upload Center page,
   **When** a user clicks the "Download Template" button for Employee Master,
   **Then** an `.xlsx` file downloads with headers: Employee ID, Department, Designation, Annual CTC, Billable/Non-Billable, Joining Date — and an example data row.

2. **Given** the Upload Center page,
   **When** a user clicks the "Download Template" button for Monthly Timesheet,
   **Then** an `.xlsx` file downloads with headers: Employee ID, Project ID, Billable Hours, Non-Billable Hours, Month — and an example data row.

3. **Given** the Upload Center page,
   **When** a user clicks the "Download Template" button for Revenue/Billing,
   **Then** an `.xlsx` file downloads with headers: Project ID, Client Name, Invoice Amount, Invoice Date, Project Type, Vertical — and an example data row.

4. **Given** any Download Template button,
   **When** the user clicks it,
   **Then** the browser triggers a file download (Content-Disposition: attachment) — not a page navigation or JSON response.

5. **Given** a downloaded Employee Master template,
   **When** the user fills it with valid data and uploads via the Upload Center,
   **Then** the upload succeeds with correct row counts (no format mismatch errors).

6. **Given** a downloaded Monthly Timesheet template,
   **When** the user fills it with valid data and uploads via the Upload Center,
   **Then** the upload succeeds with correct row counts.

7. **Given** a downloaded Revenue/Billing template,
   **When** the user fills it with valid data and uploads via the Upload Center,
   **Then** the upload succeeds with correct row counts.

8. **Given** `upload-templates.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: each template endpoint returns 200 with correct Content-Type (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet), Content-Disposition header is set, file is valid xlsx with expected headers.

## Quinn's Test Strategy (Persona-Consulted)

### Quinn's Approach
Templates are the entry point for every data upload in IPIS. If the template is wrong or missing, the entire upload pipeline is broken for that persona. Priority one: every template downloads. Priority two: every downloaded template actually works when uploaded back. I'm testing the round-trip, not just the download button.

### Persona Test Consultation

**Priya (Finance):** "I click Download Template, nothing happens. I click it three more times. Still nothing. Then I ping Rajesh on Teams. Fix the download first, but also — when I fill the Revenue template and upload it, the columns better match exactly. Last time someone gave me a template with 'InvoiceAmt' and the system expected 'Invoice Amount'. I wasted an hour. Test the round-trip: download, fill, upload, verify."

**Quinn's response:** "Good catch on the column name mismatch. I'll add a round-trip test for each template type: download it, fill with valid data, upload it, and assert zero validation errors. That's the real test — not just 'did a file download.'"

**Neha (HR):** "I need the Employee Master template to have all the right columns. If Joining Date is missing, I won't know to include it, and then the upload will reject my rows without telling me why. Also, can the example row show realistic data? '12345' as Employee ID doesn't help me understand the expected format."

**Quinn's response:** "I'll validate the template headers match the upload parser's expected columns exactly. And I'll include a test that the example row is parseable by the upload service — not just present."

**Rajesh (Admin):** "People keep asking me for templates. The system should serve them. Just make sure the button works and I never have to email a spreadsheet again."

**Quinn's response:** "Straightforward. I'll cover every template type from the UI, verify the download triggers a real file (not a JSON response or page navigation), and confirm Content-Disposition is set to attachment."

### Persona Journey Test Files
```
tests/journeys/
  priya-download-revenue-template-and-upload.spec.ts
  neha-download-employee-template-and-upload.spec.ts
  neha-download-timesheet-template-and-upload.spec.ts
```

## E2E Test Scenarios

### Positive

- E2E-P1: Priya logs in → Upload Center → clicks Download Template for Revenue/Billing → file downloads, opens in Excel with correct headers (AC: 3, 4)
- E2E-P2: Neha logs in → Upload Center → clicks Download Template for Employee Master → file downloads with correct headers (AC: 1, 4)
- E2E-P3: Neha logs in → Upload Center → clicks Download Template for Monthly Timesheet → file downloads with correct headers (AC: 2, 4)
- E2E-P4: Priya downloads Revenue template → fills with valid data → uploads → upload succeeds (AC: 7)
- E2E-P5: Neha downloads Employee Master template → fills with valid data → uploads → upload succeeds (AC: 5)

### Negative

- E2E-N1: Unauthenticated request to template download endpoint → 401 Unauthorized (AC: 4)
- E2E-N2: Request to non-existent template type → 404 Not Found with clear error message

## Tasks / Subtasks

- [x] Task 1: Diagnose and fix template download endpoint (AC: 4)
  - [x] 1.1 Trace the Download Template button click handler in Upload Center UI — identify which endpoint it calls
  - [x] 1.2 Check the backend endpoint: does it exist? Does it serve a file or return JSON? Is the route registered?
  - [x] 1.3 Fix the endpoint to serve files with correct Content-Type and Content-Disposition headers
  - [x] 1.4 If the endpoint doesn't exist, create `GET /api/v1/uploads/templates/:type` (type = employee-master | timesheet | revenue)

- [x] Task 2: Create Employee Master template (AC: 1, 5)
  - [x] 2.1 Create `employee-master-template.xlsx` with headers: employee_code, name, department, designation, annual_ctc, joining_date, is_billable (matches upload parser)
  - [x] 2.2 Add one example data row with realistic sample values
  - [x] 2.3 Served dynamically via xlsx library in `generateUploadTemplate()` in `packages/backend/src/lib/excel.ts`

- [x] Task 3: Create Monthly Timesheet template (AC: 2, 6)
  - [x] 3.1 Create template with headers: employee_id, project_name, hours, period_month, period_year (matches timesheetRowSchema)
  - [x] 3.2 Add one example data row with realistic sample values

- [x] Task 4: Verify/fix Revenue/Billing template (AC: 3, 7)
  - [x] 4.1 Created Revenue/Billing template with correct headers matching billingRowSchema
  - [x] 4.2 Headers: project_id, client_name, invoice_amount_paise, invoice_date, project_type, vertical, period_month, period_year
  - [x] 4.3 Example data row included with realistic values

- [x] Task 5: Frontend — verify Download Template buttons (AC: 4)
  - [x] 5.1 Each Download Template button now triggers fetch-based download with correct Content-Disposition handling
  - [x] 5.2 URL points to `GET /api/v1/uploads/templates/:type` with correct type per zone
  - [x] 5.3 Added loading state ("Downloading...") and error toast on failure

- [x] Task 6: Backend tests (AC: 8)
  - [x] 6.1 Created `routes/upload-templates.routes.test.ts`
  - [x] 6.2 Test each template type returns 200 with correct Content-Type
  - [x] 6.3 Test Content-Disposition header is set to attachment
  - [x] 6.4 Test invalid template type returns 404

- [x] Task 7: E2E tests (E2E-P1 through E2E-N2)
  - [x] 7.1 Created `packages/e2e/tests/upload-templates.spec.ts`
  - [x] 7.2 Implemented E2E-P1 through E2E-P3 (download tests for each template type)
  - [x] 7.3 Implemented E2E-N1 (unauthenticated 401), E2E-N2 (unknown type 404)

## Dev Notes

### Architecture Constraints

1. **File serving, not JSON**: The template endpoint must set `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="employee-master-template.xlsx"`. Do NOT return JSON with a download URL.
2. **Template files as static assets or generated**: Either store `.xlsx` files in the backend's static directory, or generate them on-the-fly with `exceljs`. Static files are simpler and recommended for templates that rarely change.
3. **Column headers must match upload parser**: The template column headers MUST exactly match what the upload parsing logic expects. Check the upload service's column mapping before creating templates.
4. **Currency values in paise**: The Annual CTC column in the Employee Master template example row should note "in paise" or use a human-readable value with clear instructions. The upload parser handles conversion.

### Existing Code to Reuse

| What | Path | Notes |
|---|---|---|
| Upload Center UI | `packages/frontend/src/pages/uploads/UploadCenter.tsx` | Story 5.3 — has Download Template buttons |
| Upload routes | `packages/backend/src/routes/uploads.routes.ts` | Story 5.1/5.2 — may already have template endpoint |
| Upload service | `packages/backend/src/services/upload.service.ts` | Check column parsing logic for expected headers |
| Auth middleware | `packages/backend/src/middleware/auth.middleware.ts` | Template download requires authentication |

### Gotchas

- **Column name mismatch**: If template headers don't exactly match what the upload parser expects, uploads will fail silently or with confusing errors. Cross-reference the upload service column mapping.
- **CORS/download issues**: Ensure the backend serves the file with correct CORS headers if the frontend and backend are on different ports during development.
- **Excel formatting**: Use proper xlsx format, not CSV renamed to xlsx. Users will open these in Excel and expect formatting to work.
- **Backlog items B1 + B11**: This story consolidates both the broken download button fix (B1) and the missing template creation (B11).

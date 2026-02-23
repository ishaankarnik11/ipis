# Story 7.1: PDF Export

Status: ready-for-dev

## Story

As a Finance, Delivery Manager, or Admin user,
I want to export any profitability report or project detail view as a PDF,
so that I can share polished reports with clients or leadership without granting them system access.

## Acceptance Criteria (AC)

1. **Given** `POST /api/v1/reports/export/pdf` is called with `{ reportType, entityId, period }`,
   **When** the request is received,
   **Then** a Puppeteer instance launches, navigates to the internal report URL for that entity/period (with a service-level auth token, not user session), and renders it to PDF (FR41).

2. **Given** the Puppeteer render,
   **When** it completes,
   **Then** the response returns the PDF binary with headers `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=IPIS-[reportType]-[entityId]-[period].pdf`.

3. **Given** the PDF generation time,
   **When** measured under load,
   **Then** the endpoint responds within 10 seconds for any report type (NFR3).

4. **Given** Puppeteer's Chromium dependency,
   **When** the Docker image is built,
   **Then** it uses a non-alpine Node base image (e.g., `node:22-slim` or `node:22`) — alpine lacks the shared libraries Puppeteer requires.

5. **Given** a Finance or Delivery Manager user requesting export,
   **When** `rbacMiddleware` checks,
   **Then** Finance and Admin can export any report; Delivery Manager can only export their own projects' reports; HR cannot access export endpoints (HTTP 403).

6. **Given** the frontend "Export PDF" button,
   **When** it appears on any dashboard or project detail page,
   **Then** clicking it posts to the export endpoint, shows an antd `message.loading('Generating PDF…')` notification, and triggers the file download on response — the button is disabled during the request to prevent double-submission.

7. **Given** Puppeteer throws an error (e.g., timeout, render failure),
   **When** the exception is caught in the route handler via `asyncHandler`,
   **Then** HTTP 500 is returned with error code `PDF_GENERATION_FAILED`; the error is logged via pino with `{ reportType, entityId, period }`.

8. **Given** `pdf.service.test.ts`,
   **When** `pnpm test` runs,
   **Then** tests cover: correct Content-Disposition header, RBAC 403 for HR, DM scope enforcement, 500 on Puppeteer failure (mocked); Puppeteer itself is mocked — no real browser in unit tests.

## Tasks / Subtasks

- [ ] Task 1: PDF generation library (AC: 1, 3, 4)
  - [ ] 1.1 Create `lib/pdf.ts` — Puppeteer wrapper
  - [ ] 1.2 `generatePdf(url, authToken)` — launch browser, navigate with service token, render to PDF buffer
  - [ ] 1.3 Timeout: 10s max per render
  - [ ] 1.4 Update Dockerfile to use `node:22-slim` base (not alpine)

- [ ] Task 2: Internal service auth token (AC: 1)
  - [ ] 2.1 Short-lived JWT signed with `INTERNAL_SERVICE_SECRET` env var
  - [ ] 2.2 Used only for Puppeteer internal navigation — not tied to user sessions
  - [ ] 2.3 Add `INTERNAL_SERVICE_SECRET` to `.env.example`

- [ ] Task 3: Report service — PDF export (AC: 1, 2, 5, 7)
  - [ ] 3.1 Create `services/report.service.ts`
  - [ ] 3.2 `exportPdf(reportType, entityId, period, user)` — RBAC check + call `lib/pdf.ts`
  - [ ] 3.3 DM scope enforcement: verify project ownership for DM role
  - [ ] 3.4 Return PDF buffer with filename

- [ ] Task 4: Report routes (AC: 1, 5)
  - [ ] 4.1 Create `routes/reports.routes.ts` — mount at `/api/v1/reports`
  - [ ] 4.2 `POST /export/pdf` — `rbacMiddleware(['finance', 'admin', 'delivery_manager'])`, `asyncHandler`
  - [ ] 4.3 Response headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=IPIS-[type]-[id]-[period].pdf`
  - [ ] 4.4 Register in `routes/index.ts`

- [ ] Task 5: Frontend export button (AC: 6)
  - [ ] 5.1 "Export PDF" button on ProjectDashboard, ExecutiveDashboard, project detail pages
  - [ ] 5.2 `antd message.loading('Generating PDF…')` during request
  - [ ] 5.3 Download via `fetch` → `blob()` → `URL.createObjectURL()` → `<a>` click
  - [ ] 5.4 Button disabled during request (prevent double-submit)

- [ ] Task 6: Zod schema (AC: 1)
  - [ ] 6.1 Add `pdfExportRequestSchema` to `shared/schemas/dashboard.schema.ts`
  - [ ] 6.2 Validate: `reportType` enum, `entityId` UUID, `period` YYYY-MM format

- [ ] Task 7: Tests (AC: 8)
  - [ ] 7.1 Create `services/report.service.test.ts`
  - [ ] 7.2 Test: Correct Content-Disposition header with filename
  - [ ] 7.3 Test: HR 403 — cannot export
  - [ ] 7.4 Test: DM can only export own projects
  - [ ] 7.5 Test: 500 PDF_GENERATION_FAILED on Puppeteer error (mocked)
  - [ ] 7.6 Puppeteer mocked in all tests — no real browser

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Puppeteer per-request**: Create browser instance per request, not pooled — sufficient for internal low-volume use.
2. **Service-level auth token**: Short-lived JWT for internal navigation. `INTERNAL_SERVICE_SECRET` env var. Not tied to user sessions.
3. **RBAC in service layer**: DM ownership check in `report.service.ts`, not route handler.
4. **asyncHandler**: Wrap route handler.
5. **Non-alpine Docker**: `node:22-slim` base for Puppeteer Chromium compatibility.
6. **Mock Puppeteer in tests**: No real browser — mock `puppeteer.launch()`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| JWT library | `lib/jwt.ts` | Story 1.2 — extend for internal service tokens |
| Error classes | `lib/errors.ts` | ForbiddenError, add PdfGenerationError |
| Auth/RBAC middleware | `middleware/` | Story 1.2 |
| asyncHandler | `middleware/async-handler.ts` | Story 1.1 |
| pino logger | Backend logger setup | Story 1.1 |
| Dashboard pages | `pages/dashboards/` | Stories 6.1-6.5 — add export button |

### New Dependencies Required

| Package | Version | Purpose |
|---|---|---|
| puppeteer | ^24 | PDF rendering via headless Chromium |

### Project Structure Notes

New files:
```
packages/backend/src/
├── lib/
│   └── pdf.ts
├── routes/
│   └── reports.routes.ts
├── services/
│   ├── report.service.ts
│   └── report.service.test.ts
```

Existing files to modify:
```
packages/backend/Dockerfile                  # Change to node:22-slim base
packages/backend/.env.example                # Add INTERNAL_SERVICE_SECRET
packages/frontend/src/pages/dashboards/*.tsx  # Add "Export PDF" buttons
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7, Story 7.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Puppeteer PDF, Docker Config]
- [Source: _bmad-output/planning-artifacts/prd.md — FR41]

### Previous Story Intelligence

- **From 6.1-6.5:** All dashboard pages exist. Add "Export PDF" button to each.
- **From 1.2:** JWT utilities in `lib/jwt.ts` — extend with `signInternalToken()` function using `INTERNAL_SERVICE_SECRET`.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List

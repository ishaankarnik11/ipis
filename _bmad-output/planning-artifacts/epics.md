---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# BMAD_101 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for BMAD_101 (IPIS — Internal Profitability Intelligence System), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can log in with email and password
FR2: The system automatically logs out users after 2 hours of inactivity
FR3: Users can manually log out at any time
FR4: The system maintains session state across page navigation during an active session
FR5: Admin can create new user accounts with name, email, and assigned role
FR6: Admin can assign one of five roles to a user: Admin, Finance, HR, Delivery Manager, Department Head
FR7: Admin can edit existing user account details and role assignments
FR8: Admin can deactivate user accounts
FR9: Admin can configure system-wide settings (standard monthly working hours)
FR10: The system restricts access to features and data based on the authenticated user's assigned role, enforced at the data access layer
FR11: HR can bulk upload an employee salary master via Excel using a provided sample template
FR12: The system imports valid employee records immediately from a bulk upload and makes failed rows available as a downloadable report
FR13: HR can re-upload a corrected set of failed rows independently of a prior bulk upload
FR14: HR can add individual employees via a form (employee ID, name, designation, department, annual CTC, joining date)
FR15: HR can edit existing employee details (designation, department, annual CTC)
FR16: HR can mark an employee as resigned
FR17: Finance can upload a timesheet file in the defined Excel format
FR18: The system validates timesheet uploads by checking all employee IDs against the employee master and all project names against approved active projects
FR19: The system rejects a timesheet upload in full if any row fails validation, returning an error message identifying the exact mismatch
FR20: Finance can upload revenue and billing records via Excel (project ID, client name, invoice amount, invoice date, project type, vertical)
FR21: The system triggers a full profitability recalculation across all active projects upon successful completion of any data upload
FR22: Delivery Manager can create a new project with all required fields: name, client, vertical, engagement model (T&M / Fixed Cost / AMC / Infrastructure), contract value, billing rates, team composition, start and end dates
FR23: Newly created projects enter a pending approval state and are excluded from all profitability reports until approved
FR24: Admin can review pending projects and approve or reject them with a written comment
FR25: Delivery Manager can view the rejection reason for their pending project and resubmit with corrections
FR26: Finance can enter and update % completion estimates for active Fixed Cost projects
FR27: Delivery Manager can enter and update % completion estimates for their own active Fixed Cost projects
FR28: The system tracks formal team member assignments per project; timesheet entries for non-assigned employees are rejected during upload validation
FR29: The system calculates employee cost per hour as: (Annual CTC + ₹1,80,000 overhead) ÷ 12 ÷ configured standard monthly working hours
FR30: The system calculates T&M project profitability as: Revenue = Billed hours × billing rate; Cost = Employee cost × project hours; Profit = Revenue − Cost
FR31: The system calculates Fixed Cost project profitability as: Revenue = Fixed contract value; Cost = Σ (employee cost × total hours); Profit = Revenue − Actual Cost, informed by current % completion
FR32: The system calculates AMC project profitability as: Revenue = AMC contract value; Cost = Support hours × cost per hour; Profit = Revenue − Cost
FR33: The system calculates Infrastructure project profitability as: Revenue = Infra invoice; Cost = Infra vendor cost + manpower allocation; Profit = Revenue − Cost
FR34: The system surfaces profitability at four levels: project, practice/discipline, department, and company-wide
FR35: Users can view the calculation breakdown for any profitability figure to understand how it was derived (Ledger Drawer)
FR36: Admin and Finance can view the Executive Dashboard (total revenue monthly/YTD, total cost, gross margin %, utilisation %, top 5 and bottom 5 projects by profitability)
FR37: Admin, Finance, Delivery Manager (own projects), and Department Head (department projects) can view the Project Dashboard (revenue vs. cost, margin %, budget vs. actual for Fixed Cost, burn rate, practice-level cost breakdown)
FR38: Admin, Finance, and Department Head (own resources) can view the Employee Dashboard (billable %, revenue contribution, cost, profit, profitability rank)
FR39: Admin, Finance, Delivery Manager (own department), and Department Head (own department) can view the Department Dashboard (revenue, cost, utilisation %, profit %, month-on-month comparison)
FR40: Admin can view a pending project approvals panel surfaced on their dashboard
FR41: Finance and Admin can export any dashboard report as a PDF
FR42: Finance and Admin can generate a shareable read-only link to a specific report that does not require authentication to access
FR43: The system records an audit log entry for: data uploads (timesheet, billing, employee master), project creation, project approval/rejection, and % completion edits
FR44: Admin can view the audit log
FR45: Delivery Manager can view and update the team member roster for their own projects after project approval
FR46: Admin receives an email notification when a Delivery Manager submits a new project for approval
FR47: Delivery Manager receives an email notification when their project submission is approved or rejected
FR49: Users can request a password reset via email
FR50: Admin-created users receive a temporary password and are prompted to set a new password on first login

### NonFunctional Requirements

NFR1: All dashboard pages render within 1 second for a user with a stable internet connection
NFR2: Profitability recalculation completes and dashboards reflect updated data within 30 seconds of a successful upload
NFR3: PDF export generation completes within 10 seconds
NFR4: File upload validation and processing (for typical file sizes up to 5,000 rows) completes within 60 seconds
NFR5: All client-server communication is encrypted via HTTPS
NFR6: Passwords are stored using a bcrypt hash; plaintext passwords are never stored or logged
NFR7: JWT access tokens expire after 2 hours of inactivity; active sessions are refreshed automatically
NFR8: All API endpoints validate the authenticated user's role before returning data; role scoping is enforced server-side on every request
NFR9: Sensitive fields (individual employee CTC, contract values, billing rates) are not written to application logs
NFR10: CORS policy restricts API access to the application's own domain
NFR11: The system targets 99.5% monthly uptime during business hours (Monday–Saturday, 8am–8pm IST)
NFR12: PostgreSQL database is backed up daily on AWS with a minimum 30-day retention period
NFR13: Audit log entries are immutable — no modification or deletion of audit records is permitted by any user role
NFR14: A failed profitability recalculation does not corrupt previously stored profitability data; the system retains the last successful calculation state
NFR15: The system is designed for an initial user base of up to 50 concurrent users and up to 500 active projects without architectural changes
NFR16: Database schema and query design accommodate upload history growth without requiring structural changes for at least 3 years

### Additional Requirements

**From Architecture:**

- **Starter Template (Epic 1, Story 1):** Manual pnpm monorepo scaffold — `packages/frontend` (Vite 7 + React 19 + TypeScript + antd v6.3.0), `packages/backend` (Express 5 + TypeScript + Prisma), `packages/shared` (Zod v3 schemas + types + utils), `packages/e2e` (Playwright). PostgreSQL on localhost:5432 (native install or Docker Compose).
- TypeScript strict mode across both frontend and backend; Node.js 20+ LTS runtime
- Prisma ORM (latest): schema-first migrations committed to source control; run automatically in CI/CD on deploy
- JWT stored in httpOnly cookies with `sameSite: 'strict'` using `jose` v5 library; no JavaScript access to JWT
- All currency values stored as integer paise in DB and API; formatted to ₹ only in frontend using shared `formatCurrency()` utility
- All percentage values stored as decimals (0–1) in DB and API; formatted as % only in frontend using shared `formatPercent()` utility
- Calculation engine: pure function module (no DB or HTTP calls), independently testable via TDD, all 4 models in `services/calculation-engine/`
- Upload pipeline: two distinct code paths — atomic (timesheet/revenue, `prisma.$transaction`) and row-level (salary, `createMany`). Never conflated.
- Ledger Drawer data strategy: persist calculation intermediates to `calculation_snapshots` table at recalculation time; includes `engine_version`, `calculated_at`, `recalculation_run_id`
- SSE (Server-Sent Events) for upload progress via `GET /api/v1/uploads/:uploadId/progress` using browser `EventSource` (not TanStack Query)
- PDF export via Puppeteer (requires non-alpine Node base image; Docker image ~300-400MB)
- AWS SES for transactional email (FR46/FR47)
- Shareable links: UUID tokens stored in DB with `report_snapshot_json`, `expires_at` (30 days), `is_revoked`; public endpoint returns snapshot data (not live)
- GitHub Actions CI/CD: lint → typecheck → Vitest → build Docker → deploy to App Runner (staging); manual approval gate for production
- AWS App Runner for hosting; AWS RDS PostgreSQL for database (automated daily backups, 30-day retention)
- Prisma schema: 14 tables including `departments` (gap fix), `password_reset_tokens` (gap fix), `employee_projects.billing_rate_paise` (gap fix), `employees.is_billable` (gap fix)
- RBAC data scoping applied in service layer (not route handler); every service function accepts `req.user` and filters queries accordingly
- Batch lookup strategy for upload cross-reference validation (not row-by-row DB queries — must meet NFR4 ≤60s for 5,000 rows)
- All async route handlers use `asyncHandler` wrapper; global error middleware formats all errors to standard shape
- TanStack Query v5 for all server state; React Router v7 for routing with role-scoped guards (UX only)
- antd `Form` for standard forms; React Hook Form for project creation with adaptive engagement model fields
- `pino` logger with `redact` option — strips CTC, contract values, billing rates from all log output
- Audit log table: append-only — no UPDATE or DELETE operations on `audit_logs` by any code path
- TanStack Query keys defined as constants in `*.api.ts` files — never inline in components
- URL structure: `/api/v1/...` — versioned from day one
- Standard error response: `{ "error": { "code": "...", "message": "...", "details": [...] } }`

**From UX Design:**

- Desktop-first responsive: ≥1440px full experience (220px sider), 1024–1439px (64px icon sider), 768–1023px tablet read-only (upload disabled), <768px out of scope for MVP
- WCAG 2.1 Level AA accessibility compliance on all screens
- Full keyboard navigation: tab/enter/arrow key support, Esc closes drawers/modals, focus trapped inside overlays, focus returns to trigger on close
- Color-blind accessibility: margin health states always paired with text label + icon — never color alone
- Screen reader support: aria-labels on KPI statistics, MarginHealthBadge, LedgerDrawer (`role="dialog"`), navigation (`aria-label="Main navigation"`), upload drag zone
- Inter font with `font-variant-numeric: tabular-nums` on all financial figures for decimal alignment
- antd v6.3.0 (not v5) — use v6 ConfigProvider token system for brand customization
- LedgerDrawer must open within 1.5 seconds (reads from pre-computed `calculation_snapshots`)
- Upload flow: antd `Steps` component (Upload → Validate → Confirm) with `UploadConfirmationCard` showing parse preview before committing
- Date range filter presets (universal): This Month / Last Month / This Quarter / Last Quarter / YTD / Custom — selection persisted per-user per-module in localStorage
- All data tables: antd `Table` `size="small"` (38px rows), right-aligned numeric columns, `tabular-nums`, summary rows via `Table.Summary`
- All error messages specific and actionable — include: specific value that failed + row count + resolution path + downloadable error report
- Data provenance labels on every dashboard surface: "Revenue data: Uploaded by [user] on [date]"
- Dotted underline visual convention for all derived figures that open the Ledger Drawer
- Loss-row background highlight (`#FFF2F0`) on all project/employee/department tables
- `MarginHealthBadge`: Admin-configurable thresholds (default: ≥20% healthy green, 5–19% at-risk amber, <5% loss red) — always includes text label + icon
- `AtRiskKPITile` in Executive Dashboard KPI strip: clickable, navigates to Project Dashboard filtered to at-risk/loss
- Sider collapse preference persists in localStorage
- Upload error report: downloadable Excel of failed rows with specific error per row
- Browser support: Chrome, Edge, Firefox (latest 2 versions each), Safari 16+; no IE11
- Skip navigation link for keyboard users
- `aria-live="polite"` region for dynamic content updates (upload progress, dashboard refresh)

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Email/password login |
| FR2 | Epic 1 | Auto-logout after 2 hours inactivity |
| FR3 | Epic 1 | Manual logout |
| FR4 | Epic 1 | Session state during navigation |
| FR5 | Epic 1 | Admin creates user accounts |
| FR6 | Epic 1 | Admin assigns 5 roles |
| FR7 | Epic 1 | Admin edits user accounts/roles |
| FR8 | Epic 1 | Admin deactivates accounts |
| FR9 | Epic 1 | Admin configures system settings |
| FR10 | Epic 1 | RBAC enforced at data access layer |
| FR49 | Epic 1 | Password reset via email |
| FR50 | Epic 1 | First-login forced password change |
| FR11 | Epic 2 | HR bulk uploads salary master |
| FR12 | Epic 2 | Partial import + failed rows downloadable |
| FR13 | Epic 2 | HR re-uploads corrected failed rows |
| FR14 | Epic 2 | HR adds individual employees via form |
| FR15 | Epic 2 | HR edits employee details |
| FR16 | Epic 2 | HR marks employees as resigned |
| FR22 | Epic 3 | Delivery Manager creates project (4 models) |
| FR23 | Epic 3 | Projects enter pending approval state |
| FR24 | Epic 3 | Admin approves/rejects with comment |
| FR25 | Epic 3 | Delivery Manager views rejection + resubmits |
| FR28 | Epic 3 | Team member assignments tracked |
| FR45 | Epic 3 | Delivery Manager manages team roster post-approval |
| FR46 | Epic 3 | Admin email notification on new submission |
| FR47 | Epic 3 | Delivery Manager email on decision |
| FR26 | Epic 4 | Finance enters/updates % completion (Fixed Cost) |
| FR27 | Epic 4 | Delivery Manager enters/updates % completion |
| FR29 | Epic 4 | Employee cost per hour formula |
| FR30 | Epic 4 | T&M profitability calculation |
| FR31 | Epic 4 | Fixed Cost profitability calculation |
| FR32 | Epic 4 | AMC profitability calculation |
| FR33 | Epic 4 | Infrastructure profitability calculation |
| FR34 | Epic 4 | 4-level profitability surfacing |
| FR17 | Epic 5 | Finance uploads timesheet Excel |
| FR18 | Epic 5 | Timesheet upload validation |
| FR19 | Epic 5 | Atomic rejection with specific error message |
| FR20 | Epic 5 | Finance uploads billing/revenue Excel |
| FR21 | Epic 5 | Recalculation triggered on successful upload |
| FR35 | Epic 6 | Calculation breakdown / Ledger Drawer |
| FR36 | Epic 6 | Executive Dashboard |
| FR37 | Epic 6 | Project Dashboard |
| FR38 | Epic 6 | Employee Dashboard |
| FR39 | Epic 6 | Department Dashboard |
| FR40 | Epic 6 | Admin pending approvals panel |
| FR41 | Epic 7 | PDF export |
| FR42 | Epic 7 | Shareable read-only report links |
| FR43 | Epic 7 | Audit log recording |
| FR44 | Epic 7 | Admin views audit log |

_Coverage: 49/49 FRs mapped. FR48 absent from PRD — confirmed intentional._

## Epic List

### Epic 1: Foundation, Authentication & User Management
All 5 roles can log in securely, access role-appropriate navigation, manage their accounts, and Admin can configure the system and manage users — the complete access control layer is operational.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR49, FR50
**Pre-notes:** Includes monorepo scaffold (Story 1.1) with pnpm workspace, all 14 Prisma schema tables, shared package structure (currency/percent formatters, Zod schema scaffold). JWT (jose v5, httpOnly cookie), RBAC middleware, user management UI, system config, password reset, first-login flow.

### Epic 2: Employee & Salary Data Management
HR can maintain the complete employee salary master — bulk upload with partial import support, individual add/edit/resign — providing the cost-rate foundation that all profitability calculations depend on.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16
**Pre-notes:** Row-level validation model (partial import allowed). Failed rows downloadable. `shared/schemas/employee.schema.ts` added in this epic.

### Epic 3: Project Lifecycle & Team Management
Delivery Managers can create projects across all 4 engagement models, submit for approval, respond to rejections, and manage team rosters — so every project is formally established before anyone logs time against it.
**FRs covered:** FR22, FR23, FR24, FR25, FR28, FR45, FR46, FR47
**Pre-notes:** Backend API and frontend adaptive form are separate stories. Conditional fields animate in/out on engagement model change (no page reload). AWS SES for email notifications. `shared/schemas/project.schema.ts` added in this epic.

### Epic 4: Profitability Calculation Engine
The system accurately calculates profitability for all 4 engagement models with full traceability, including % completion tracking for Fixed Cost projects — TDD-validated against manual Excel reference fixtures before any live data runs through it.
**FRs covered:** FR26, FR27, FR29, FR30, FR31, FR32, FR33, FR34
**Pre-notes:** Pure function module — no DB or HTTP calls. All values in integer paise. Calculation snapshot persistence to `calculation_snapshots` table. **Pre-requisite:** Dell provides reference Excel fixtures for all 4 models before Epic 4 begins. Co-located test files required for each calculator.

### Epic 5: Data Upload & Recalculation Pipeline
Finance can upload timesheets and billing records; the system validates data atomically, recalculates profitability for all active projects with real-time SSE progress feedback — completing the core monthly data cycle from upload to dashboard refresh in under 90 seconds.
**FRs covered:** FR17, FR18, FR19, FR20, FR21
**Pre-notes:** Atomic (all-or-nothing) validation model. Batch lookup for cross-reference validation (NFR4). SSE progress via EventSource. Upload ceremony (UploadConfirmationCard with parse preview, cross-reference warnings, replacement notice) is first-class scope — not API-only. `shared/schemas/upload.schema.ts` added in this epic.

### Epic 6: Dashboards, Reporting & Calculation Traceability
All roles can view profitability intelligence across all dimensions — Executive, Project, Employee, and Department dashboards with role-scoped data — and drill into any derived figure via the Ledger Drawer to understand exactly how it was calculated. Admin pending-approval panel and % completion inputs are delivered in Epic 3 Story 3.4.
**FRs covered:** FR35, FR36, FR37, FR38, FR39
**Pre-notes:** Reads from `calculation_snapshots` (pre-computed at upload time). Ledger Drawer ≤1.5s. Data provenance labels on all dashboards. Dashboard load <1s (NFR1). AtRiskKPITile, MarginHealthBadge, loss-row highlights, dotted-underline convention all first-class story scope. Employee Dashboard (FR38) reads `entity_type = 'EMPLOYEE'` snapshots persisted in Epic 4 Story 4.5. `shared/schemas/dashboard.schema.ts` added in this epic.

### Epic 7: Export, Sharing & Audit
Finance and Admin can export any dashboard report as PDF, generate shareable read-only links for leadership, and Admin can view the complete immutable audit trail — enabling leadership reporting, compliance, and accountability.
**FRs covered:** FR41, FR42, FR43, FR44
**Pre-notes:** PDF via Puppeteer (≤10s, NFR3). Shareable links: UUID tokens, snapshot data, 30-day expiry, revocable. Audit log append-only — audit entries written across all epics, viewed here. `shared/schemas/report.schema.ts` added in this epic.

---

## Epic 1: Foundation, Authentication & User Management

All 5 roles can log in securely, access role-appropriate navigation, manage accounts, and Admin can configure the system and manage users — the complete access control layer is operational.

### Story 1.1: Monorepo Scaffold & Project Infrastructure

As a developer,
I want a fully initialized pnpm monorepo with all package configurations, shared utilities, and local development tooling,
So that the entire team can immediately begin building features on a consistent, reproducible foundation.

**Acceptance Criteria:**

**Given** the project repository is initialized,
**When** a developer runs `pnpm install` from the root,
**Then** all workspace dependencies install successfully with no errors across all four packages (`frontend`, `backend`, `shared`, `e2e`)

**Given** the monorepo is set up,
**When** a developer has PostgreSQL running locally (via native install or `docker-compose up -d`),
**Then** a PostgreSQL instance is accessible on port 5432 with database `ipis_dev`

**Given** the database is running,
**When** a developer runs `pnpm --filter backend migrate`,
**Then** Prisma runs `prisma migrate dev` successfully, creating the initial migration with the `users`, `departments`, and `system_config` tables

**Given** both services are configured,
**When** a developer runs the backend (`pnpm --filter backend dev`) and frontend (`pnpm --filter frontend dev`) simultaneously,
**Then** the backend starts on port 3000 and the frontend starts on port 5173 with no errors, and the frontend proxies `/api` requests to port 3000

**Given** the shared package exists,
**When** any backend or frontend module imports from `packages/shared`,
**Then** `formatCurrency(paise: number): string` returns correctly formatted Indian rupee strings (e.g., `8400000` → `"₹84,000"`) and `formatPercent(decimal: number): string` returns percentage strings (e.g., `0.871` → `"87.1%"`)

**Given** the frontend is initialized,
**When** a developer views the app at `localhost:5173`,
**Then** the antd v6 `ConfigProvider` is active with `colorPrimary: #1B2A4A`, `colorError: #E05A4B`, `colorSuccess: #389E0D`, `colorWarning: #D48806`, `fontFamily: Inter` tokens applied globally

**Given** the monorepo structure,
**When** examining the directory tree,
**Then** all architecture-specified directories exist: `packages/backend/src/{routes,middleware,services,lib}`, `packages/frontend/src/{components,pages,hooks,services,router,theme}`, `packages/shared/src/{schemas,types,utils}`, `packages/e2e/tests`

**Given** ESLint and Prettier are configured,
**When** a developer runs `pnpm lint` from root,
**Then** all packages pass linting with zero errors

**Given** TypeScript is configured,
**When** a developer runs `pnpm typecheck` from root,
**Then** all packages compile with zero TypeScript errors in strict mode

---

### Story 1.2: Authentication API — Login, Session & Logout

As a user of any role,
I want to authenticate securely with my email and password and maintain a protected session,
So that only authorised users can access the application and sessions expire automatically after inactivity.

**Acceptance Criteria:**

**Given** a valid active user exists in the database,
**When** `POST /api/v1/auth/login` is called with correct email and password,
**Then** a JWT is issued using `jose` v5, set as an `httpOnly`, `sameSite: 'strict'` cookie, and the response returns `{ data: { id, name, role, email } }` — the JWT is never returned in the response body

**Given** an incorrect email or password,
**When** `POST /api/v1/auth/login` is called,
**Then** the response is `401 UNAUTHORIZED` with `{ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }` — no distinction between wrong email and wrong password (prevents user enumeration)

**Given** an authenticated user,
**When** `GET /api/v1/auth/me` is called with a valid session cookie,
**Then** the response returns `{ data: { id, name, role, email, departmentId } }` — this endpoint is the frontend's sole source of auth state

**Given** an authenticated user,
**When** `POST /api/v1/auth/logout` is called,
**Then** the JWT cookie is cleared (`maxAge: 0`) and the response returns `{ success: true }`

**Given** a request to any protected endpoint without a valid JWT cookie,
**When** `authMiddleware` processes the request,
**Then** the response is `401 UNAUTHORIZED` before any business logic or database query executes

**Given** a JWT that has exceeded 2 hours of inactivity,
**When** any authenticated endpoint is called,
**Then** the response is `401 UNAUTHORIZED` with `{ error: { code: "UNAUTHORIZED", message: "Session expired" } }`

**Given** an active session within the 2-hour window,
**When** the user makes any authenticated API call,
**Then** the JWT expiry is refreshed automatically (sliding expiry) so active users are never unexpectedly logged out

**Given** a user with `is_active: false`,
**When** `POST /api/v1/auth/login` is called with their credentials,
**Then** the response is `401 UNAUTHORIZED` — deactivated accounts cannot log in

**Given** the login endpoint,
**When** `express-rate-limit` middleware is applied,
**Then** the login endpoint returns `429 TOO MANY REQUESTS` after 10 failed attempts per IP in 15 minutes

**Given** user password storage,
**When** any user is created or their password updated,
**Then** the password is stored as a bcrypt hash — plaintext is never stored, logged, or returned in any response

**Given** the `shared/schemas/auth.schema.ts` Zod schema,
**When** `POST /api/v1/auth/login` receives a request body,
**Then** the body is validated against `loginSchema` (email format, non-empty password) before any database query; invalid bodies return `400 VALIDATION_ERROR`

**Given** the `pino` logger is configured,
**When** any auth-related log entry is written,
**Then** the `redact` option strips password fields from all log output — plaintext or hashed passwords never appear in logs

---

### Story 1.3: Login & Session UI

As a user of any role,
I want a login page and persistent session across page navigation,
So that I can access the application and work uninterrupted without being unexpectedly redirected.

**Acceptance Criteria:**

**Given** an unauthenticated user navigates to any protected route,
**When** the `AuthGuard` React Router guard evaluates,
**Then** the user is redirected to `/login` — no flash of protected content

**Given** the login page at `/login`,
**When** a user enters valid credentials and submits,
**Then** `POST /api/v1/auth/login` is called; on success the user is redirected to their role-appropriate landing page (Admin → `/admin`, Finance → `/dashboards/executive`, HR → `/employees`, Delivery Manager → `/projects`, Dept Head → `/dashboards/department`)

**Given** invalid credentials are submitted,
**When** the API returns `401`,
**Then** an inline antd `Alert` (type="error") displays "Invalid email or password" — no page reload

**Given** the login form is submitting,
**When** the API call is in-flight,
**Then** the Submit button shows a loading spinner and is disabled to prevent double-submission

**Given** an authenticated user navigates between pages,
**When** `useAuth` queries `GET /api/v1/auth/me` via TanStack Query on app load,
**Then** the user's role and identity are available application-wide without re-fetching on each navigation; the query key is `['auth', 'me']`

**Given** a user's session expires mid-use,
**When** the next API call returns `401`,
**Then** the user is redirected to `/login` with message: "Your session has expired. Please log in again."

**Given** an authenticated user clicks "Log Out" in the top navigation bar,
**When** `POST /api/v1/auth/logout` succeeds,
**Then** `queryClient.clear()` is called, the JWT cookie is cleared, and the user is redirected to `/login`

**Given** the left sidebar `Menu` component,
**When** rendered for any authenticated user,
**Then** only navigation items appropriate for their role are rendered — unauthorized items are absent entirely (not hidden, not greyed out)

**Given** the login page renders,
**When** a keyboard user tabs through the form,
**Then** focus order is: Email input → Password input → Submit button, with visible antd focus rings on each element

**Given** the CORS policy is configured on the Express app,
**When** API requests originate from the frontend origin,
**Then** CORS allows the request; requests from any other origin are rejected (NFR10)

---

### Story 1.4: User & Role Management API

As an Admin,
I want API endpoints to create, edit, and deactivate users, assign roles, and configure system settings,
So that access control and operational parameters are managed programmatically and securely.

**Acceptance Criteria:**

**Given** an authenticated Admin,
**When** `POST /api/v1/users` is called with `{ name, email, role, departmentId? }`,
**Then** a new user is created with a bcrypt-hashed temporary password, `is_active: true`, `must_change_password: true`, and returns `{ data: { id, name, email, role, isActive } }`

**Given** an authenticated Admin,
**When** `GET /api/v1/users` is called,
**Then** all users are returned in `{ data: [...], meta: { total } }` format with fields: `id, name, email, role, departmentId, isActive`

**Given** an authenticated Admin,
**When** `PATCH /api/v1/users/:id` is called with `{ name?, role?, departmentId? }`,
**Then** only the provided fields are updated and the updated user is returned

**Given** an authenticated Admin,
**When** `PATCH /api/v1/users/:id` is called with `{ isActive: false }`,
**Then** `users.is_active` is set to `false`; subsequent login attempts for that user return `401`

**Given** an authenticated Admin,
**When** `GET /api/v1/config` is called,
**Then** the response returns `{ data: { standardMonthlyHours, healthyMarginThreshold, atRiskMarginThreshold } }`

**Given** an authenticated Admin,
**When** `PUT /api/v1/config` is called with `{ standardMonthlyHours: 176 }`,
**Then** the `system_config` record is updated and confirmed with `{ success: true }` — validated via Zod, integer only

**Given** any non-Admin role (finance, hr, delivery_manager, dept_head),
**When** any user management or config endpoint is called,
**Then** `rbacMiddleware(['admin'])` returns `403 FORBIDDEN` — verified by RBAC unit tests for all four non-admin roles

**Given** every protected route,
**When** the middleware chain is applied,
**Then** the order is always: `authMiddleware` → `rbacMiddleware([...roles])` → `asyncHandler(routeHandler)` — no exceptions

**Given** all user management service functions,
**When** they execute,
**Then** they call Prisma only from within `user.service.ts` — route handlers in `users.routes.ts` never import Prisma directly

**Audit Note:** `logAuditEvent` calls for `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, and `SETTINGS_UPDATED` actions originating from this story's service functions will be added during Epic 7 Story 7.4. Service functions in `user.service.ts` must be structured so audit hooks can be appended without requiring refactoring of the primary operation logic.

---

### Story 1.5: User Management & System Config UI

As an Admin,
I want to create, edit, and deactivate user accounts and configure system settings through the application,
So that I can manage the team's access and operational parameters without requiring database access.

**Acceptance Criteria:**

**Given** an authenticated Admin navigates to `/admin/users`,
**When** the User Management page renders,
**Then** all users are displayed in an antd `Table` with columns: Name, Email, Role, Department, Status (Active/Inactive), and Actions (Edit, Deactivate) — action buttons visible on row hover only

**Given** the User Management page,
**When** Admin clicks "Add User",
**Then** an antd `Modal` opens with an antd `Form` containing: Name (required), Email (required, email format validated on blur), Role `Select` (5 options), Department `Select` (optional)

**Given** the Add User form is submitted with valid data,
**When** `POST /api/v1/users` succeeds,
**Then** the Modal closes, TanStack Query invalidates `['users']`, the table refreshes, and an antd `Notification` confirms: "User [name] created successfully"

**Given** a user row,
**When** Admin clicks "Edit",
**Then** the same Modal opens pre-populated with the user's current name, role, and department; on save, `PATCH /api/v1/users/:id` is called and the table refreshes

**Given** an active user row,
**When** Admin clicks "Deactivate" and confirms the confirmation Modal,
**Then** `PATCH /api/v1/users/:id` with `{ isActive: false }` is called, the table refreshes, and the row shows "Inactive" status badge

**Given** an authenticated Admin navigates to `/admin/config`,
**When** the System Config page renders,
**Then** the current `standardMonthlyHours` is displayed in an `InputNumber` field pre-populated with the current value (default: 160)

**Given** the System Config form,
**When** Admin updates `standardMonthlyHours` and clicks "Save",
**Then** `PUT /api/v1/config` is called; on success an antd `Notification` confirms "System configuration updated"

**Given** a non-Admin authenticated user,
**When** they attempt to navigate to `/admin/users` or `/admin/config`,
**Then** the `RoleGuard` redirects them to their role-appropriate landing page — the guard is UX only; API RBAC is the security enforcement

**Given** the Admin left sidebar,
**When** rendered for an Admin user,
**Then** "User Management" and "System Configuration" navigation items are visible and link to the correct routes

---

### Story 1.6: Password Management — Reset & First-Login Flow

As a user of any role,
I want to reset my forgotten password via email and set a personal password on first login,
So that I can always access my account and my credentials are set by me, not an Admin.

**Acceptance Criteria:**

**Given** an unauthenticated user at `/forgot-password`,
**When** they enter an email and submit,
**Then** `POST /api/v1/auth/forgot-password` is called; if the email matches an active user, a reset email is sent via AWS SES containing a secure 1-hour reset link; the UI always shows: "If that email is registered, a reset link has been sent" — regardless of whether the email exists (prevents user enumeration)

**Given** a valid reset link at `/reset-password?token=...`,
**When** the page loads,
**Then** `GET /api/v1/auth/validate-reset-token?token=...` is called; if valid (not expired, not used), the reset form renders; if invalid/expired/used, the page shows: "This reset link has expired or already been used. Request a new one."

**Given** the reset password form,
**When** a user enters a new password (minimum 8 characters) and submits,
**Then** `POST /api/v1/auth/reset-password` is called with the token and new password; on success: token `used_at` is set, password hash is updated, and the user is redirected to `/login` with: "Password updated. Please log in."

**Given** the `password_reset_tokens` table,
**When** a reset token is generated,
**Then** only the bcrypt hash of the token is stored in `token_hash` — the plaintext token is sent in the email link only, never stored; this migration creates the `password_reset_tokens` table

**Given** a user created by Admin with `must_change_password: true`,
**When** they successfully log in with the temporary password,
**Then** they are immediately redirected to `/change-password` — all other routes are blocked by the `AuthGuard` until this step is complete

**Given** the forced `/change-password` screen,
**When** the user submits a new password (minimum 8 characters),
**Then** `POST /api/v1/auth/change-password` updates the password hash, sets `must_change_password: false`, and redirects to the role-appropriate landing page

**Given** the forgot-password endpoint,
**When** `express-rate-limit` is applied,
**Then** `POST /api/v1/auth/forgot-password` allows maximum 5 requests per hour per IP; excess requests receive `429 TOO MANY REQUESTS`

---

## Epic 2: Employee & Salary Data Management

HR can maintain the complete employee salary master — bulk upload with partial import support, individual add/edit/resign — providing the cost-rate foundation that all profitability calculations depend on.

### Story 2.1: Employee Salary Master — Bulk Upload API

As an HR user,
I want to upload an Excel file containing all employee salary data and have valid records imported automatically while failed rows are returned for correction,
So that the complete salary master is available for profitability calculations without requiring manual entry of every record.

**Acceptance Criteria:**

**Given** an authenticated HR user,
**When** `POST /api/v1/employees/bulk-upload` is called with a multipart Excel file,
**Then** the file is parsed server-side using `xlsx` (SheetJS) and each row is validated independently using the row-level model — the upload is never fully rejected; valid rows proceed regardless of invalid rows

**Given** a bulk upload containing valid rows,
**When** valid rows are processed,
**Then** they are inserted via `prisma.employee.createMany({ data: validRows })` and the response returns `{ data: { imported: N, failed: M, failedRows: [{ row, employeeCode, error }] } }`

**Given** a bulk upload with some invalid rows (missing required field, invalid department code, duplicate `employee_code`),
**When** processing occurs,
**Then** valid rows are imported immediately and invalid rows are returned with their row number and a specific error message — never a generic "row failed"

**Given** an HR user correcting failed rows,
**When** `POST /api/v1/employees/bulk-upload` is called with only the corrected rows,
**Then** corrected rows are validated and imported; existing employee records are not affected; duplicate `employee_code` rows return `409 CONFLICT` in the `failedRows` array

**Given** a request to `GET /api/v1/employees/sample-template`,
**When** called by any authenticated HR user,
**Then** a pre-formatted `.xlsx` file is returned as a download with correct column headers: `employee_code`, `name`, `department`, `designation`, `annual_ctc`, `joining_date`, `is_billable`

**Given** the `employees` table migration,
**When** this story's Prisma migration runs,
**Then** the `employees` table is created with columns: `id` (UUID PK), `employee_code` (VARCHAR UNIQUE), `name`, `department_id` (FK → departments), `designation`, `annual_ctc_paise` (BIGINT), `overhead_paise` (BIGINT DEFAULT 18000000), `joining_date`, `is_billable` (BOOLEAN DEFAULT true), `is_resigned` (BOOLEAN DEFAULT false), `created_at`, `updated_at`

**Given** the `shared/schemas/employee.schema.ts` Zod schema,
**When** the upload endpoint validates a parsed row,
**Then** `employeeRowSchema` enforces: `employee_code` (non-empty string), `name` (non-empty), `department` (must match existing department name), `designation` (non-empty), `annual_ctc` (positive number); `joining_date` and `is_billable` are optional

**Given** any non-HR user (admin, finance, delivery_manager, dept_head),
**When** `POST /api/v1/employees/bulk-upload` is called,
**Then** `rbacMiddleware(['hr'])` returns `403 FORBIDDEN` — verified by RBAC unit tests for all four non-HR roles

**Given** the employee upload service,
**When** it executes,
**Then** Prisma is called only from `employee.service.ts` — `employees.routes.ts` never imports Prisma directly

**Given** the `pino` logger is active,
**When** any employee-related log entry is written,
**Then** `annual_ctc_paise` is redacted from all log output (NFR9)

---

### Story 2.2: Individual Employee Management API

As an HR user,
I want to add individual employees, update their details, and mark them as resigned via API,
So that new joiners and salary revisions are reflected in cost calculations immediately without a full bulk re-upload.

**Acceptance Criteria:**

**Given** an authenticated HR user,
**When** `POST /api/v1/employees` is called with `{ employeeCode, name, departmentId, designation, annualCtcPaise, joiningDate, isBillable? }`,
**Then** a new employee is created and the response returns `{ data: { id, employeeCode, name, designation, annualCtcPaise, isBillable, isResigned: false } }`

**Given** an authenticated HR user,
**When** `PATCH /api/v1/employees/:id` is called with `{ designation?, annualCtcPaise?, departmentId?, isBillable? }`,
**Then** only the provided fields are updated; `annualCtcPaise` must be a positive integer (Zod validation)

**Given** an authenticated HR user,
**When** `PATCH /api/v1/employees/:id/resign` is called,
**Then** `is_resigned` is set to `true` and the employee is excluded from future cost calculations for new uploads

**Given** an authenticated Admin or Finance user,
**When** `GET /api/v1/employees` is called,
**Then** all employees (active and resigned) are returned including `annualCtcPaise` — Finance has full salary data access per RBAC matrix; pino redacts CTC from logs

**Given** an authenticated HR user,
**When** `GET /api/v1/employees` is called,
**Then** employees are returned without `annualCtcPaise` — HR manages records but does not view financial data per RBAC matrix

**Given** `POST /api/v1/employees` is called with a duplicate `employee_code`,
**When** the database constraint fires,
**Then** the response is `409 CONFLICT` with `{ error: { code: "CONFLICT", message: "Employee code [code] already exists" } }`

**Given** a resigned employee,
**When** `PATCH /api/v1/employees/:id` is called,
**Then** the service rejects the update with `400 VALIDATION_ERROR`: `"Cannot edit a resigned employee"` — resigned status is terminal

**Given** any non-HR user attempting `POST /api/v1/employees` or `PATCH /api/v1/employees/:id`,
**When** the request is received,
**Then** `rbacMiddleware(['hr'])` returns `403 FORBIDDEN` — RBAC test confirms all non-HR roles receive `403`

**Given** `GET /api/v1/employees/:id` is called,
**When** the employee does not exist,
**Then** the response is `404 NOT_FOUND` with `{ error: { code: "NOT_FOUND", message: "Employee not found" } }`

---

### Story 2.3: Employee Management UI — List, Add, Edit & Resign

As an HR user,
I want to view the employee list, add individual employees, edit their details, and mark them as resigned through the application,
So that I can maintain accurate employee records without requiring database access.

**Acceptance Criteria:**

**Given** an authenticated HR user navigates to `/employees`,
**When** the Employee List page renders,
**Then** all employees are displayed in an antd `Table` (`size="small"`) with columns: Employee Code, Name, Designation, Department, Billable (Yes/No), Status (`Active` / `Resigned` badge) — `annualCtcPaise` is not shown to HR in the table

**Given** an authenticated Finance or Admin user navigates to `/employees`,
**When** the Employee List page renders,
**Then** an Annual CTC column is additionally visible, values formatted via `formatCurrency()` (e.g., `"₹8,40,000"`), right-aligned with `tabular-nums`

**Given** the Employee List page,
**When** HR clicks "Add Employee",
**Then** an antd `Modal` opens with antd `Form` fields: Employee Code (required), Name (required), Department `Select` (required), Designation (required), Annual CTC `InputNumber` with `prefix="₹"` (required, positive integer only), Joining Date `DatePicker`, Billable checkbox (default checked)

**Given** the Add Employee form is submitted with valid data,
**When** `POST /api/v1/employees` succeeds,
**Then** the Modal closes, TanStack Query invalidates `['employees']`, the table refreshes, and a `Notification` confirms: "Employee [name] added successfully"

**Given** an active employee row,
**When** HR clicks "Edit",
**Then** the same Modal opens pre-populated with current data; on save, `PATCH /api/v1/employees/:id` is called; form validates Annual CTC as a positive number on blur

**Given** an active employee row,
**When** HR clicks "Mark as Resigned" and confirms the confirmation `Modal` ("Mark [name] as resigned? This cannot be undone."),
**Then** `PATCH /api/v1/employees/:id/resign` is called; the row's Status badge updates to "Resigned"; the Edit and Mark as Resigned actions disappear for that row

**Given** the employee list,
**When** HR types in the Search input above the table,
**Then** the table filters instantly (debounced 300ms) by Employee Code or Name — no search button required

**Given** form validation on any required field,
**When** the user blurs a required field left empty,
**Then** an inline error message appears below the field — validation fires on blur, not on keystroke

---

### Story 2.4: Bulk Upload UI & Failed Rows Download

As an HR user,
I want to upload the salary master Excel file through the application and download a report of failed rows for correction,
So that I can efficiently import all employees and quickly identify and fix any data quality issues.

**Acceptance Criteria:**

**Given** an authenticated HR user navigates to the Upload Center,
**When** the salary upload section renders,
**Then** an antd `Upload.Dragger` component is displayed labelled "Upload Employee Salary Master (.xlsx)" with a "Download Sample Template" link below it

**Given** HR clicks "Download Sample Template",
**When** `GET /api/v1/employees/sample-template` is called,
**Then** an `.xlsx` file downloads immediately with correct column headers matching the required import format

**Given** HR drops or selects a valid `.xlsx` file,
**When** the file is uploaded via `POST /api/v1/employees/bulk-upload`,
**Then** the `UploadConfirmationCard` renders showing: filename, total rows detected, rows successfully imported (N), rows failed (M) with a summary of error types

**Given** some rows failed validation,
**When** the `UploadConfirmationCard` renders,
**Then** a "Download Failed Rows" button is visible; clicking it triggers download of an `.xlsx` file containing only the failed rows with an added `error` column describing each specific failure

**Given** HR corrects the failed rows file and re-uploads,
**When** `POST /api/v1/employees/bulk-upload` is called with the corrected file,
**Then** the system imports the corrected rows and the `UploadConfirmationCard` updates showing the new import count with zero failures

**Given** a file upload is in progress,
**When** multer processes the file server-side,
**Then** the upload button is disabled and an antd `Spin` loading indicator is displayed — no double-upload possible

**Given** an invalid file type (non-`.xlsx`),
**When** HR attempts to upload it,
**Then** antd `Upload`'s `beforeUpload` hook rejects the file immediately with message: "Please upload an .xlsx file only" — no API call is made

**Given** the Upload Center renders for HR,
**When** previous salary uploads exist,
**Then** an `UploadHistoryLog` table below the upload zone shows: File Type, Upload Date, Uploaded By, Records Imported — ordered newest first

**Given** all rows were successfully imported,
**When** the `UploadConfirmationCard` renders,
**Then** the "Download Failed Rows" button is absent — no empty file download offered

---

## Epic 3: Project Lifecycle & Team Management

Delivery Managers can create projects across all 4 engagement models, submit for approval, respond to rejections, and manage team rosters — every project is formally established before anyone logs time against it.

### Story 3.1: Project Management API — Create, Approve & Reject

As a Delivery Manager and Admin,
I want to create projects, submit them for approval, and review and decide on pending submissions,
So that every project is formally established with the right commercial details before resources log time against it.

**Acceptance Criteria:**

**Given** an authenticated Delivery Manager,
**When** `POST /api/v1/projects` is called with `{ name, client, vertical, engagementModel, contractValuePaise, startDate, endDate }` plus model-specific fields,
**Then** a project is created with `status: 'PENDING_APPROVAL'`, `deliveryManagerId` set to `req.user.id`, and the response returns `{ data: { id, name, engagementModel, status: 'PENDING_APPROVAL' } }`

**Given** a new project is created,
**When** the service writes the record,
**Then** an email is dispatched via AWS SES to all Admin users with subject: "New project pending approval: [name]" — FR46; email dispatch is fire-and-forget and does not block the API response

**Given** a project with status `PENDING_APPROVAL`,
**When** any dashboard or reporting query runs,
**Then** the project is excluded from all profitability calculations and reporting — only `ACTIVE` projects appear in dashboards

**Given** an authenticated Admin,
**When** `POST /api/v1/projects/:id/approve` is called,
**Then** project `status` changes to `ACTIVE`, an SES email is sent to the Delivery Manager: "Your project [name] has been approved" — FR47, and the response returns `{ success: true }`

**Given** an authenticated Admin,
**When** `POST /api/v1/projects/:id/reject` is called with `{ rejectionComment }`,
**Then** project `status` changes to `REJECTED`, `rejection_comment` is stored, an SES email notifies the Delivery Manager with the comment — FR47, and the response returns `{ success: true }`; empty `rejectionComment` returns `400 VALIDATION_ERROR`

**Given** an authenticated Delivery Manager with a `REJECTED` project,
**When** `PATCH /api/v1/projects/:id` is called with corrections followed by `POST /api/v1/projects/:id/resubmit`,
**Then** project `status` returns to `PENDING_APPROVAL`, `rejection_comment` is cleared, and Admin is notified again via SES

**Given** an authenticated Delivery Manager,
**When** `GET /api/v1/projects` is called,
**Then** only projects where `delivery_manager_id = req.user.id` are returned — RBAC scoping applied in `project.service.getAll(req.user)`, never in the route handler

**Given** an authenticated Finance or Admin user,
**When** `GET /api/v1/projects` is called,
**Then** all projects regardless of `delivery_manager_id` are returned

**Given** the `projects` table migration,
**When** this story's Prisma migration runs,
**Then** the table is created with: `id` (UUID PK), `name`, `client`, `vertical`, `engagement_model` (enum: `TIME_AND_MATERIALS`, `FIXED_COST`, `AMC`, `INFRASTRUCTURE`), `status` (enum: `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, `ON_HOLD`, `COMPLETED`, `CANCELLED`), `contract_value_paise` (BIGINT), `delivery_manager_id` (FK → users), `rejection_comment` (TEXT nullable), `completion_percent` (DECIMAL nullable), `start_date`, `end_date`, `created_at`, `updated_at`

**Given** `shared/schemas/project.schema.ts`,
**When** `POST /api/v1/projects` validates the request body,
**Then** `createProjectSchema` uses a Zod discriminated union on `engagementModel` to enforce model-specific required fields (e.g., `billingRates` required for T&M, `contractValuePaise` required for Fixed/AMC/Infrastructure)

**Given** any non-Delivery Manager role attempting `POST /api/v1/projects`,
**When** the request is received,
**Then** `rbacMiddleware(['delivery_manager'])` returns `403 FORBIDDEN`

**Given** the `pino` logger,
**When** any project-related log entry is written,
**Then** `contract_value_paise` and `billing_rate_paise` are redacted (NFR9)

**Audit Note:** `logAuditEvent` calls for `PROJECT_CREATED`, `PROJECT_APPROVED`, `PROJECT_REJECTED`, and `PROJECT_RESUBMITTED` actions originating from this story's service functions will be added during Epic 7 Story 7.4. Service functions in `project.service.ts` must be structured so audit hooks can be appended after the primary `prisma.$transaction` commits.

---

### Story 3.2: Team Roster Management API

As a Delivery Manager,
I want to assign employees to my projects and manage the team roster after approval,
So that only formally assigned team members can log time against a project, preventing unauthorised cost attribution.

**Acceptance Criteria:**

**Given** an authenticated Delivery Manager for their own approved project,
**When** `POST /api/v1/projects/:id/team-members` is called with `{ employeeId, role, billingRatePaise? }`,
**Then** an `employee_projects` record is created and the response returns `{ data: { employeeId, role, billingRatePaise, assignedAt } }`

**Given** a `TIME_AND_MATERIALS` project,
**When** `POST /api/v1/projects/:id/team-members` is called without `billingRatePaise`,
**Then** the response is `400 VALIDATION_ERROR`: `"billingRatePaise is required for T&M projects"` — Zod validates this based on the parent project's `engagementModel`

**Given** an authenticated Delivery Manager,
**When** `GET /api/v1/projects/:id/team-members` is called for their own project,
**Then** the response returns all assigned employees: `{ data: [{ employeeId, name, designation, role, billingRatePaise, assignedAt }] }`

**Given** an authenticated Delivery Manager,
**When** `DELETE /api/v1/projects/:id/team-members/:employeeId` is called,
**Then** the `employee_projects` record is removed; that employee's timesheet entries against this project will be rejected in future uploads

**Given** the `employee_projects` table migration,
**When** this story's Prisma migration runs,
**Then** the table is created with: `project_id` (FK → projects), `employee_id` (FK → employees), `role` (VARCHAR), `billing_rate_paise` (BIGINT nullable), `assigned_at` (TIMESTAMP DEFAULT now()); composite PK: `(project_id, employee_id)`

**Given** a Delivery Manager attempting to manage team members for another DM's project,
**When** the service checks `project.deliveryManagerId !== req.user.id`,
**Then** the response is `403 FORBIDDEN` — service-level ownership check, not route-level

**Given** roles `[finance, hr, dept_head]`,
**When** `POST /api/v1/projects/:id/team-members` is called,
**Then** `rbacMiddleware(['delivery_manager', 'admin'])` returns `403 FORBIDDEN` for all three — RBAC unit test required

**Given** adding an employee who is already on the roster,
**When** `POST /api/v1/projects/:id/team-members` is called with a duplicate `employeeId`,
**Then** the response is `409 CONFLICT`: `"Employee is already assigned to this project"`

---

### Story 3.3: Project Creation & Status UI

As a Delivery Manager,
I want to create projects using an adaptive form that changes based on engagement model, and view the status of my submitted projects,
So that I can establish projects correctly the first time and respond quickly to rejections without re-entering all information.

**Acceptance Criteria:**

**Given** an authenticated Delivery Manager navigates to `/projects/new`,
**When** the project creation form renders,
**Then** it uses React Hook Form with an Engagement Model `Select` at the top; selecting a model immediately shows model-specific field groups without page reload — conditional rendering driven by `watch('engagementModel')`

**Given** the engagement model is set to **T&M**,
**When** the model-specific section renders,
**Then** a repeatable team member section appears with Role and Billing Rate (`InputNumber` with `₹` prefix) per member — no fixed contract value field

**Given** the engagement model is set to **Fixed Cost**,
**When** the model-specific section renders,
**Then** Contract Value (`InputNumber` with `₹`), End Date (`DatePicker`), and Budget fields appear

**Given** the engagement model is set to **AMC**,
**When** the model-specific section renders,
**Then** Contract Value and Support SLA description field appear

**Given** the engagement model is set to **Infrastructure**,
**When** the model-specific section renders,
**Then** Vendor Costs (`InputNumber` with `₹`) and Manpower Allocation description field appear

**Given** the form is submitted with valid data,
**When** `POST /api/v1/projects` succeeds,
**Then** the user is navigated to the project detail page showing a `ProjectStatusBadge` with "Pending Approval" (blue) status

**Given** the Submit button,
**When** the form is submitting,
**Then** the button is disabled with a loading spinner — no double-submission possible

**Given** a Delivery Manager views their project list and a project has `REJECTED` status,
**When** the `ProjectStatusBadge` displays "Rejected" (red),
**Then** a "View Rejection Reason" link is visible inline in that row

**Given** the Delivery Manager clicks "View Rejection Reason" and lands on the project detail page,
**When** the page renders for a `REJECTED` project,
**Then** an antd `Alert` (type="warning") displays the rejection comment, and an "Edit & Resubmit" button is visible below it

**Given** the Delivery Manager clicks "Edit & Resubmit",
**When** the form loads pre-populated with all existing project data,
**Then** on valid submission, `PATCH /api/v1/projects/:id` and `POST /api/v1/projects/:id/resubmit` are called sequentially; on success the project status badge updates to "Pending Approval"

**Given** all project status displays across the UI,
**When** the `ProjectStatusBadge` component renders,
**Then** it uses the correct antd `Tag` colour per status: Pending Approval → blue, Active → green, Rejected → red, Completed → navy — always includes text label, never colour alone

---

### Story 3.4: Project List & Detail UI

As all authorized roles,
I want to view the project list and drill into project detail pages including % completion entry for Fixed Cost projects,
So that project status and financial details are visible at a glance and Delivery Managers can keep completion data current.

**Acceptance Criteria:**

**Given** an authenticated Delivery Manager navigates to `/projects`,
**When** `ProjectList.tsx` renders,
**Then** their projects appear in an antd `Table` with columns: Name, Client, Engagement Model, Status (`ProjectStatusBadge`), Start Date, End Date — RBAC-scoped to own projects via API

**Given** an authenticated Finance or Admin user navigates to `/projects`,
**When** `ProjectList.tsx` renders,
**Then** all projects are shown with an additional Delivery Manager column; pending approval projects are included with their status badge

**Given** any authorized user clicks a project row,
**When** `ProjectDetail.tsx` renders,
**Then** it displays: Project Name, Client, Vertical, Engagement Model, Contract Value (formatted via `formatCurrency()`), Status badge, Start/End Dates, and Team Roster section listing assigned employees with roles

**Given** a Fixed Cost project detail page,
**When** Finance or Delivery Manager (own project) views it,
**Then** a `% Completion` `InputNumber` (0–100) is visible and editable; saving calls `PATCH /api/v1/projects/:id` with `{ completionPercent }` — FR26, FR27

**Given** breadcrumb navigation on `ProjectDetail.tsx`,
**When** the breadcrumb renders,
**Then** it shows "Projects / [Project Name]" with "Projects" as a clickable link back to `ProjectList.tsx`

---

### Story 3.5: Admin Approval/Rejection UI & Pending Approvals Panel

As an Admin,
I want to view all pending project submissions and approve or reject them with a written comment,
So that no project enters the reporting pipeline without formal review, and Delivery Managers receive clear feedback on any rejection.

**Acceptance Criteria:**

**Given** an authenticated Admin navigates to `/admin/pending-approvals`,
**When** `PendingApprovals.tsx` renders,
**Then** all `PENDING_APPROVAL` projects are listed in an antd `Table` with: Project Name, Delivery Manager, Engagement Model, Contract Value, Submission Date, and Approve / Reject action buttons — FR40

**Given** Admin clicks "Approve" on a pending project,
**When** `POST /api/v1/projects/:id/approve` succeeds,
**Then** the project row is removed from the pending list, TanStack Query invalidates `['projects']`, and a `Notification` confirms: "Project [name] approved"

**Given** Admin clicks "Reject",
**When** a `Modal` opens with a required Rejection Comment `Input.TextArea`,
**Then** on submit, `POST /api/v1/projects/:id/reject` is called with the comment; the row is removed from the list and a `Notification` confirms: "Project [name] rejected"

**Given** the Rejection Comment field,
**When** Admin clicks "Confirm Rejection" with an empty comment,
**Then** antd `Form` validation shows: "Rejection reason is required" — the API call does not fire

**Given** the Admin left sidebar,
**When** rendered for an Admin user,
**Then** "Pending Approvals" navigation item is visible and links to `/admin/pending-approvals`; the item shows a badge count of pending projects if count > 0

---

## Epic 4: Profitability Calculation Engine

The system accurately calculates profitability for all 4 engagement models with full traceability — TDD-validated against manual Excel reference fixtures before any live data runs through it.

**⚠️ Pre-requisite:** Before Epic 4 begins, Dell provides reference Excel calculation data for all 4 engagement models. These become the unit test fixtures — known inputs → known outputs to paise precision.

### Story 4.1: Employee Cost Rate Calculation

As a system,
I want to calculate the hourly cost rate for any employee from their salary and overhead data,
So that every profitability calculation uses a correct, consistent, and traceable cost basis.

**Acceptance Criteria:**

**Given** a pure function `calculateCostPerHour({ annualCtcPaise, overheadPaise, standardMonthlyHours })`,
**When** called with valid inputs,
**Then** it returns `costPerHourPaise = Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours)` — integer paise, rounded

**Given** reference fixture: `annualCtcPaise = 84000000` (₹8,40,000), `overheadPaise = 18000000` (₹1,80,000), `standardMonthlyHours = 160`,
**When** `calculateCostPerHour` is called,
**Then** the result matches the value validated against the provided manual Excel reference

**Given** `standardMonthlyHours = 0`,
**When** `calculateCostPerHour` is called,
**Then** it throws a `RangeError`: `"standardMonthlyHours must be greater than zero"`

**Given** the function,
**When** inspected,
**Then** it has no database calls, no HTTP calls, no side effects — inputs and outputs are plain TypeScript numbers

**Given** co-located test file `cost-rate.calculator.test.ts`,
**When** `pnpm test` runs,
**Then** all cases pass: standard case, 176-hour month variant, different overhead, rounding to nearest paise

**Given** `packages/backend/src/services/calculation-engine/index.ts`,
**When** examined,
**Then** `calculateCostPerHour` is exported as the canonical cost formula for use by all 4 model calculators

---

### Story 4.2: T&M Profitability Calculator

As a system,
I want to calculate profitability for Time & Materials projects using billed hours and per-role billing rates,
So that T&M revenue and margin are accurately derived from timesheet and roster data.

**Acceptance Criteria:**

**Given** a pure function `calculateTm({ billedHours, billingRatePaise, employeeCosts: [{ hours, costPerHourPaise }] })`,
**When** called,
**Then** it returns `{ revenuePaise, costPaise, profitPaise, marginPercent }` — all currency as integer paise, `marginPercent` as decimal (0–1 range)

**Given** reference fixture values validated against the provided manual Excel reference,
**When** `calculateTm` is called with those inputs,
**Then** the returned values match exactly

**Given** cost exceeds revenue,
**When** `calculateTm` is called,
**Then** `profitPaise` is a negative integer and `marginPercent` is negative — loss-making projects are valid outputs, not errors

**Given** `billedHours = 0` or `billingRatePaise = 0`,
**When** `calculateTm` is called,
**Then** `revenuePaise = 0` and the function returns without error — zero-revenue periods are valid

**Given** the function,
**When** inspected,
**Then** it has no database calls, no HTTP calls, no imports from Prisma — inputs are plain TypeScript objects

**Given** co-located test file `tm.calculator.test.ts`,
**When** `pnpm test` runs,
**Then** all cases pass: standard profitable case, loss-making case, zero hours, multiple employees with different rates

---

### Story 4.3: Fixed Cost Profitability Calculator

As a system,
I want to calculate profitability for Fixed Cost projects including burn rate and at-risk detection using % completion,
So that budget overruns are surfaced before they become unrecoverable.

**Acceptance Criteria:**

**Given** a pure function `calculateFixedCost({ contractValuePaise, employeeCosts: [{ hours, costPerHourPaise }], completionPercent })`,
**When** called,
**Then** it returns `{ revenuePaise: contractValuePaise, costPaise, profitPaise, marginPercent, burnPercent, isAtRisk }`

**Given** reference fixture values validated against the provided manual Excel reference,
**When** `calculateFixedCost` is called with those inputs,
**Then** the returned values match exactly

**Given** `burnPercent` calculation,
**When** the result is computed,
**Then** `burnPercent = costPaise / contractValuePaise`; when `burnPercent > completionPercent`, then `isAtRisk = true` — cost has consumed more budget than work delivered

**Given** `completionPercent` is `null` or `undefined`,
**When** `calculateFixedCost` is called,
**Then** it is treated as `0`; `isAtRisk` defaults to `false` when completion is unknown — no error thrown

**Given** % completion stored via `PATCH /api/v1/projects/:id` (FR26, FR27 — implemented in Epic 3),
**When** the next recalculation runs in Epic 5,
**Then** `calculateFixedCost` receives the updated `completionPercent` from the `projects` table

**Given** co-located test file `fixed-cost.calculator.test.ts`,
**When** `pnpm test` runs,
**Then** all cases pass: on-track project, at-risk project (`burnPercent > completionPercent`), completed project, null completion percent

---

### Story 4.4: AMC & Infrastructure Calculators

As a system,
I want to calculate profitability for AMC and Infrastructure projects using their distinct commercial models,
So that all 4 engagement types are accurately represented with their actual revenue-cost logic.

**Acceptance Criteria:**

**Given** a pure function `calculateAmc({ contractValuePaise, supportHours, costPerHourPaise })`,
**When** called,
**Then** it returns `{ revenuePaise: contractValuePaise, costPaise: supportHours × costPerHourPaise, profitPaise, marginPercent }`

**Given** reference fixture values validated against the provided manual Excel reference,
**When** `calculateAmc` is called with those inputs,
**Then** the returned values match exactly

**Given** a pure function `calculateInfrastructure({ infraInvoicePaise, vendorCostPaise, manpowerCostPaise })`,
**When** called,
**Then** it returns `{ revenuePaise: infraInvoicePaise, costPaise: vendorCostPaise + manpowerCostPaise, profitPaise, marginPercent }`

**Given** reference fixture values validated against the provided manual Excel reference,
**When** `calculateInfrastructure` is called with those inputs,
**Then** the returned values match exactly

**Given** both functions,
**When** inspected,
**Then** no database calls, no HTTP calls — inputs are plain TypeScript numbers; all values in integer paise

**Given** co-located test files `amc.calculator.test.ts` and `infrastructure.calculator.test.ts`,
**When** `pnpm test` runs,
**Then** all cases pass for both models including profitable and loss-making scenarios

**Given** `packages/backend/src/services/calculation-engine/index.ts`,
**When** examined after this story,
**Then** all five functions are exported: `calculateCostPerHour`, `calculateTm`, `calculateFixedCost`, `calculateAmc`, `calculateInfrastructure`

---

### Story 4.5: Snapshot Persistence & Multi-Level Profitability Surfacing

As a system,
I want to persist calculation results as snapshots after each recalculation and aggregate profitability at project, practice, department, and company level,
So that dashboard queries are fast reads against pre-computed data and the Ledger Drawer has a complete, structured breakdown source.

**Acceptance Criteria:**

**Given** `snapshot.service.ts` function `persistSnapshots({ recalculationRunId, projectResults })`,
**When** called after a successful recalculation,
**Then** it writes one `calculation_snapshots` row per entity/figure combination with: `entity_type`, `entity_id`, `figure_type` (one of: `MARGIN_PERCENT`, `EMPLOYEE_COST`, `UTILIZATION_PERCENT`, `BILLABLE_PERCENT`, `COST_PER_HOUR`, `REVENUE_CONTRIBUTION`), `value_paise`, `breakdown_json`, `engine_version`, `calculated_at`

**Given** the Prisma migration for this story,
**When** it runs,
**Then** two tables are created: `calculation_snapshots` (`id`, `recalculation_run_id`, `entity_type`, `entity_id`, `figure_type`, `period_month`, `period_year`, `value_paise` BIGINT, `breakdown_json` JSONB, `engine_version`, `calculated_at`) and `recalculation_runs` (`id`, `upload_event_id`, `projects_processed` INT, `completed_at`)

**Given** snapshots are written for `entity_type = 'PROJECT'`,
**When** the snapshot service runs,
**Then** one row is written per project per figure type per period

**Given** snapshots for `entity_type = 'PRACTICE'`,
**When** written,
**Then** employee costs are aggregated by `designation` across all projects — surfacing practice-level cost contribution (FR34)

**Given** snapshots for `entity_type = 'DEPARTMENT'` and `entity_type = 'COMPANY'`,
**When** written,
**Then** department rows aggregate all projects in that department; company row aggregates across all departments — all 4 levels of profitability surfaced (FR34)

**Given** snapshots for `entity_type = 'EMPLOYEE'`,
**When** written,
**Then** one row is written per active employee per figure type per period with: `totalHours`, `billableHours`, `billableUtilisationPercent` (billableHours ÷ standardMonthlyHours), `totalCostPaise`, `revenueContributionPaise`, and `profitContributionPaise` — this is mandatory in this story and is the data source for the Employee Dashboard (FR38); `snapshot.service.persistSnapshots()` must include employee-level rows in the same recalculation run as PROJECT, PRACTICE, DEPARTMENT, and COMPANY rows

**Given** `persistSnapshots` is called,
**When** its call site is inspected,
**Then** it is called only from `upload.service.ts` after a successful database commit — never from route handlers or other services

**Given** a recalculation that throws an exception,
**When** the error is caught in `upload.service.ts`,
**Then** no snapshot rows are written for that run, previous snapshots remain intact (NFR14), and the error is logged via pino

**Given** PostgreSQL indexes,
**When** the migration runs,
**Then** indexes are created on `calculation_snapshots`: `(entity_type, entity_id, period_month, period_year)` and `(recalculation_run_id)`

**Given** the `breakdown_json` field,
**When** a snapshot is written for any figure type,
**Then** the JSON contains the full decomposed input set — for MARGIN_PERCENT: `{ revenue, cost, profit, inputs: [{ employeeId, name, hours, costPerHour, contribution }] }` — this is the Ledger Drawer's data source

**Given** `snapshot.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests verify: correct row count per recalculation run, correct entity_type aggregation, snapshot isolation on failure (no partial writes)

---

## Epic 5: Data Upload & Recalculation Pipeline

**Goal:** Enable Finance and HR to upload data files (timesheets, revenue/billing, salary corrections) and automatically trigger the full recalculation pipeline — with atomic validation, real-time progress feedback, and provenance tracking so users always know which data period the dashboard reflects.

**FRs Covered:** FR11, FR12, FR13, FR17, FR18, FR19, FR20, FR21

---

### Story 5.1: Timesheet Upload & Atomic Validation API

**As a** Finance user,
**I want to** upload a timesheet Excel file that is validated against employee master and approved project roster before any data is committed,
**So that** the system either fully accepts the file or fully rejects it with a precise error report identifying every mismatch.

#### Acceptance Criteria

**Given** `POST /api/v1/uploads/timesheets` is called with a valid multipart Excel file,
**When** the file is parsed,
**Then** all employee IDs and project names are resolved in a single batch lookup against `employees` and `projects` tables — not row-by-row — before any insert

**Given** one or more rows reference an employee ID not present in the `employees` master,
**When** validation runs,
**Then** the upload is rejected in full with HTTP 422, error code `UPLOAD_REJECTED`, and the response body lists every mismatched employee ID and project name by name (FR18, FR19)

**Given** one or more rows reference a project name not in `approved` status,
**When** validation runs,
**Then** the upload is rejected in full with HTTP 422 and the response lists exact project name mismatches

**Given** validation passes all rows,
**When** the service commits,
**Then** all `timesheet_entries` rows and one `upload_events` row (type=`TIMESHEET`, status=`SUCCESS`, `uploaded_by`, `row_count`, `period_month`, `period_year`) are written inside a single `prisma.$transaction` — nothing is committed unless both succeed (FR17)

**Given** a `prisma.$transaction` failure,
**When** an exception is thrown mid-commit,
**Then** no `timesheet_entries` rows are persisted, no `upload_events` row is written, and the error propagates to the global error middleware

**Given** an existing `timesheet_entries` dataset for the same `period_month`/`period_year`,
**When** a new upload passes validation,
**Then** the old rows are deleted and replaced within the same transaction (atomic replacement) — the `upload_events` row notes `replaced_rows_count`

**Given** the timesheet upload endpoint,
**When** a non-Finance, non-Admin user calls it,
**Then** `rbacMiddleware` returns HTTP 403 before any file parsing occurs

**Given** the `upload_events` table,
**When** the migration runs,
**Then** it includes: `id`, `type` (enum: TIMESHEET, BILLING, SALARY), `status` (enum: SUCCESS, FAILED, PARTIAL), `uploaded_by` (FK→users), `period_month`, `period_year`, `row_count`, `replaced_rows_count`, `error_summary` (JSONB), `created_at`

**Given** `upload.service.test.ts` for timesheets,
**When** `pnpm test` runs,
**Then** tests cover: valid file full commit, employee ID mismatch rejection, project name mismatch rejection, atomic rollback on DB error, RBAC 403

**Architecture Notes:** File parsing via `xlsx` npm package. Validation queries use `WHERE id IN (...)` bulk lookups. Route handler is `async`, wrapped with `asyncHandler`. Zod schema validates parsed row shape before domain validation.

**Audit Note:** `logAuditEvent` calls for `UPLOAD_TIMESHEET_SUCCESS` and `UPLOAD_TIMESHEET_REJECTED` actions will be added during Epic 7 Story 7.4. The `upload.service.ts` function must call `logAuditEvent` after the `prisma.$transaction` resolves (success or rejection) — never inside the transaction.

---

### Story 5.2: Billing/Revenue Upload & Recalculation Trigger

**As a** Finance user,
**I want to** upload a billing/revenue Excel file and have the system automatically trigger a full profitability recalculation across all active projects,
**So that** all dashboards immediately reflect the latest financial data after each upload.

#### Acceptance Criteria

**Given** `POST /api/v1/uploads/billing` is called with a valid multipart Excel file,
**When** the file is parsed and validated,
**Then** rows are inserted into `billing_records` (columns: `project_id`, `client_name`, `invoice_amount_paise`, `invoice_date`, `project_type`, `vertical`, `period_month`, `period_year`, `upload_event_id`) and an `upload_events` row is written — all within one `prisma.$transaction` (FR20)

**Given** a successful billing upload commit,
**When** the transaction resolves,
**Then** `upload.service.ts` calls `triggerRecalculation(periodMonth, periodYear)` which calls the pure calculation engine, then calls `snapshot.service.persistSnapshots(runId, results)` — this sequence is the canonical recalculation chain (FR21)

**Given** `triggerRecalculation` runs,
**When** it completes successfully,
**Then** an SSE event `{ type: 'RECALC_COMPLETE', runId, projectsProcessed, snapshotsWritten }` is emitted via the in-process EventEmitter in `sse.ts`

**Given** `triggerRecalculation` throws an exception,
**When** the error is caught,
**Then** the previously committed `billing_records` and `upload_events` rows are NOT rolled back (the upload itself succeeded); the SSE event `{ type: 'RECALC_FAILED', error }` is emitted; the error is logged via pino with structured context (NFR14 — upload success isolated from recalc failure)

**Given** the HR salary upload path (`POST /api/v1/uploads/salary`),
**When** the file contains row-level errors,
**Then** valid rows are imported and failed rows are made available as a downloadable XLSX error report at `GET /api/v1/uploads/:uploadEventId/error-report` — this is row-level (partial) import, NOT atomic rejection (FR11, FR12, FR13)

**Given** a salary re-upload of only failed rows (`POST /api/v1/uploads/salary` with `mode=correction`),
**When** the file is processed,
**Then** only the rows in the file are upserted — existing employee records not in the file are unchanged (FR13)

**Given** a salary upload (full or correction) that completes,
**When** the upload event is written,
**Then** the `upload_events` row has `type=SALARY`, `status=PARTIAL` if some rows failed (with `error_summary` listing failed rows), `status=SUCCESS` if all rows imported

**Given** all upload endpoints,
**When** Finance/HR roles are checked via `rbacMiddleware`,
**Then** timesheet and billing endpoints require Finance or Admin; salary endpoints require HR or Admin

**Given** `upload.service.test.ts` for billing + salary,
**When** `pnpm test` runs,
**Then** tests cover: billing commit + recalc trigger, recalc failure isolation (upload rows persist), salary partial import, salary correction mode, RBAC enforcement

**Architecture Notes:** All invoice amounts stored as integer paise. `triggerRecalculation` is called after transaction resolves (not inside it) to avoid long-running transactions. `sse.ts` uses Node.js `EventEmitter` — no external broker.

**Audit Note:** `logAuditEvent` calls for `UPLOAD_BILLING_SUCCESS`, `UPLOAD_SALARY_SUCCESS`, `UPLOAD_SALARY_PARTIAL`, and `RECALCULATION_TRIGGERED` actions will be added during Epic 7 Story 7.4. These calls belong in `upload.service.ts` after the relevant transaction commits — never inside a transaction block.

---

### Story 5.3: Upload Center UI & Progress Feedback

**As a** Finance or HR user,
**I want to** see a dedicated Upload Center with real-time progress feedback during uploads and a history of all past uploads,
**So that** I can track upload status, download error reports for failed rows, and know exactly which data period the dashboard is reflecting.

#### Acceptance Criteria

**Given** the Upload Center page (`/uploads`),
**When** it loads,
**Then** it shows three upload zones (Timesheets, Billing/Revenue, Salary) with antd v6 `Upload` (Dragger variant), each labeled with the expected file format and a "Download Template" link

**Given** a Finance user viewing the Upload Center,
**When** they see the salary upload zone,
**Then** it is hidden (RBAC — salary uploads are HR-only); similarly HR users do not see timesheet/billing zones

**Given** a user selects a file for upload,
**When** the file already has existing data for the selected period,
**Then** an `UploadConfirmationCard` modal appears explaining "This will replace [N] existing rows for [Month Year]. Are you sure?" before the upload proceeds

**Given** a file upload is in progress,
**When** the `EventSource` connection is active via the `useUploadProgress` hook,
**Then** an antd `Progress` bar updates in real-time as SSE events arrive; the user can see percentage completion and current stage label (e.g., "Validating rows…", "Writing records…", "Running recalculation…")

**Given** an upload completes successfully,
**When** the SSE `'complete'` event arrives,
**Then** the `useUploadProgress` hook triggers TanStack Query cache invalidation for all dashboard and project queries; the progress bar reaches 100% with a success state

**Given** a timesheet upload that fails validation (HTTP 422),
**When** the error response arrives,
**Then** a structured error panel lists every mismatched employee ID and project name; no download option (full rejection, nothing to report on)

**Given** a salary upload that completes with partial errors,
**When** the SSE `'complete'` event arrives with `failedRows > 0`,
**Then** a "Download Error Report" button appears; clicking it calls `GET /api/v1/uploads/:uploadEventId/error-report` and triggers XLSX download via the browser

**Given** the `UploadHistoryLog` table below the upload zones,
**When** the page loads,
**Then** it shows the last 20 `upload_events` rows with columns: Type, Period, Rows Imported, Status (antd Tag: green SUCCESS / orange PARTIAL / red FAILED), Uploaded By, Uploaded At — paginated via antd `Table`

**Given** the `DataPeriodIndicator` component,
**When** it is rendered in the Upload Center and on all dashboard pages,
**Then** it displays "Data as of: [Month Year] · Updated [relative time]" sourced from the latest SUCCESS `upload_events` row for each type — giving users clear provenance of what period the numbers reflect

**Given** tablet viewports (768–1023px),
**When** the Upload Center renders,
**Then** all three upload zones display a "Upload not available on tablet — please use a desktop browser" message consistent with the UX responsive spec; the `UploadHistoryLog` table remains visible and scrolls horizontally

**Given** the `useUploadProgress` hook,
**When** the SSE connection drops unexpectedly,
**Then** the hook attempts one reconnect after 3 seconds; if it fails again it shows an inline "Connection lost — refresh to check status" warning without crashing the page

**Given** `upload-center.test.tsx`,
**When** `pnpm test` runs,
**Then** tests cover: zone visibility by role, UploadConfirmationCard display on replacement, progress bar updates from mocked SSE events, error panel on 422, error report download trigger, DataPeriodIndicator rendering with correct period text

**Architecture Notes:** `useUploadProgress` uses browser-native `EventSource` (not TanStack Query). SSE endpoint: `GET /api/v1/uploads/progress/:uploadEventId`. `DataPeriodIndicator` is a shared component in `packages/shared/src/components/`.

---

## Epic 6: Dashboards, Reporting & Calculation Traceability

**Goal:** Surface four-level profitability data (project, practice/discipline, department, company-wide, and employee-level) through role-filtered dashboards and the Ledger Drawer — giving every stakeholder the right view of profitability at the right level. Admin pending-approval functionality and % completion inputs are delivered in Epic 3 (Story 3.4); this epic adds only the reporting and traceability surfaces.

**FRs Covered:** FR35, FR36, FR37, FR38, FR39

---

### Story 6.1: Project Dashboard & KPI Tiles

**As a** Finance, Delivery Manager, or Department Head user,
**I want to** view a dashboard listing all projects I have access to with key profitability KPIs for the current data period,
**So that** I can immediately identify which projects are healthy, at risk, or in loss.

#### Acceptance Criteria

**Given** `GET /api/v1/reports/projects` is called,
**When** the query runs,
**Then** it reads from `calculation_snapshots` where `entity_type = 'PROJECT'` and `period_month`/`period_year` match the latest SUCCESS upload period — returning `project_id`, `project_name`, `engagement_model`, `department`, `vertical`, `revenue_paise`, `cost_paise`, `profit_paise`, `margin_percent` for each project (FR37)

**Given** a Delivery Manager calls the endpoint,
**When** results are returned,
**Then** only projects where `project_manager_id = req.user.id` are included; Finance and Admin receive all projects; Department Head receives projects in their department only (FR10, FR37)

**Given** the project list renders in the frontend,
**When** a project row is displayed,
**Then** a `MarginHealthBadge` component shows: green badge if `margin_percent ≥ 20%`, amber if `10–19%`, red if `< 10%`

**Given** any project with `profit_paise < 0` (loss project),
**When** the row renders,
**Then** the row background is `#FFF2F0` and an `AtRiskKPITile` indicator is displayed with the deficit amount formatted via `formatCurrency()`

**Given** the dashboard filter bar,
**When** a user selects filters (department, vertical, engagement model, status),
**Then** the project list re-queries with those filters as URL search params; filters persist on page refresh via URL state

**Given** the column headers (Revenue, Cost, Profit, Margin %),
**When** a user clicks a header,
**Then** the list sorts by that column ascending/descending; Margin % sorts descending by default on first load

**Given** all monetary figures in API responses (paise),
**When** they render in the dashboard,
**Then** they are formatted via `formatCurrency()` from `packages/shared` — never raw paise values in UI text

**Given** `project-dashboard.test.tsx`,
**When** `pnpm test` runs,
**Then** tests cover: Delivery Manager scope filtering, MarginHealthBadge threshold rendering, AtRiskKPITile on loss projects, filter param propagation, sort behavior

**Architecture Notes:** Snapshot reads go directly to `calculation_snapshots` table — no re-running the calculation engine at query time. Query keyed as `['reports', 'projects', filters]` in TanStack Query.

---

### Story 6.2: Executive, Practice, Department & Company-Wide Dashboards

**As a** Finance user, Admin, or Department Head,
**I want to** view profitability rollups at executive (company-wide KPIs + top/bottom projects), practice/discipline, department, and company-wide levels,
**So that** leadership can identify systemic cost patterns and make resource allocation decisions beyond individual projects.

#### Acceptance Criteria

**Given** `GET /api/v1/reports/executive`,
**When** called by Finance or Admin,
**Then** it returns: total revenue YTD (paise), total cost YTD (paise), gross margin % (decimal), billable utilisation % (total billable hours ÷ total available hours across all active employees), top 5 projects by margin %, bottom 5 projects by margin % — all sourced from `calculation_snapshots` for the current period (FR36)

**Given** the Executive Dashboard page,
**When** it renders,
**Then** the top-5/bottom-5 sections display project cards with `MarginHealthBadge` and an `AtRiskKPITile` for projects in loss; clicking any project card navigates to the Project Dashboard filtered to that project

**Given** `GET /api/v1/reports/practice`,
**When** called by Finance or Admin,
**Then** it returns aggregated data from `calculation_snapshots` where `entity_type = 'PRACTICE'` — one row per designation with total revenue, cost, profit, margin %, and employee count contributing to that practice (FR36)

**Given** `GET /api/v1/reports/department`,
**When** called by a Department Head,
**Then** only snapshots where `entity_id` matches their department are returned; Finance and Admin receive all departments (FR39, FR10)

**Given** `GET /api/v1/reports/company`,
**When** called,
**Then** it returns the single `entity_type = 'COMPANY'` snapshot row — company-wide revenue, cost, profit, margin % — plus a department breakdown array for drill-through (FR39)

**Given** the practice dashboard view,
**When** it renders,
**Then** it shows a "Top cost contributors by designation" section listing top 5 designations by total cost_paise with antd v6 `Progress` bar representations (no additional chart library)

**Given** the department rollup dashboard,
**When** it renders,
**Then** each department row shows total revenue, cost, profit, margin % with a `MarginHealthBadge`; clicking a department row navigates to the Project Dashboard filtered to that department

**Given** any dashboard page (executive, practice, department, company),
**When** it renders,
**Then** a `DataPeriodIndicator` in the page header shows "Data as of: [Month Year] · Updated [relative time]" based on the latest SUCCESS `upload_events` row

**Given** `reports.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests cover: executive endpoint returns correct top-5/bottom-5 ordering, utilisation % formula, practice aggregation correctness, department scope filtering (DH sees own only), company rollup, DataPeriodIndicator period resolution

---

### Story 6.3: Ledger Drawer — API & Data Contract

**As a** Finance, Delivery Manager, or Admin user,
**I want to** call a dedicated API endpoint that returns the full calculation breakdown for a specific project and period,
**So that** the Ledger Drawer UI can render the detailed input decomposition without triggering a live recalculation.

#### Acceptance Criteria

**Given** `GET /api/v1/reports/projects/:id/ledger?period=YYYY-MM`,
**When** called with a valid project ID and period,
**Then** the response returns the `breakdown_json` from the latest `calculation_snapshots` row matching `entity_type = 'PROJECT'`, `entity_id = :id`, and the specified period (FR35)

**Given** the response shape,
**When** a snapshot exists for that project/period,
**Then** the JSON conforms to: `{ revenue_paise, cost_paise, profit_paise, margin_percent, engagement_model, calculated_at, engine_version, recalculation_run_id, inputs: [{ employeeId, employeeName, designation, hours, cost_per_hour_paise, contribution_paise }] }`

**Given** no snapshot exists for the requested project/period,
**When** the endpoint is called,
**Then** HTTP 404 is returned with error code `SNAPSHOT_NOT_FOUND` and message "No calculation data available for this period"

**Given** the endpoint response time,
**When** measured under test conditions,
**Then** it responds within 1.5 seconds for any valid project/period — the snapshot is a direct row read, no calculation performed at query time (NFR)

**Given** a Delivery Manager calling the ledger endpoint for a project they do not manage,
**When** `rbacMiddleware` checks ownership,
**Then** HTTP 403 is returned; Finance and Admin can access any project's ledger

**Given** all monetary values in the response,
**When** inspected,
**Then** all are integer paise — no decimal currency values in the API response; `margin_percent` is a decimal (0–1 range)

**Given** `ledger.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests cover: valid snapshot retrieval, 404 on missing snapshot, response shape validation, RBAC 403 on wrong DM, paise integer constraint

**Architecture Notes:** `GET /api/v1/reports/projects/:id/ledger` is a thin service layer read — `SELECT breakdown_json FROM calculation_snapshots WHERE entity_type='PROJECT' AND entity_id=:id AND period_month=:m AND period_year=:y ORDER BY calculated_at DESC LIMIT 1`. Query keyed as `['ledger', projectId, period]` in TanStack Query.

---

### Story 6.4: Ledger Drawer — UI Component

**As a** Finance, Delivery Manager, or Admin user,
**I want to** click any project row and see a detailed Ledger Drawer that shows exactly how the margin figure was calculated — with every employee's hours and cost contribution visible,
**So that** I can trust the numbers and investigate any unexpected result without leaving the dashboard.

#### Acceptance Criteria

**Given** any project row in the dashboard,
**When** the user clicks it,
**Then** an antd v6 `Drawer` component opens from the right side at 480px width with the project name and data period in the drawer title — this is "The Ledger" (FR35)

**Given** the Drawer opens,
**When** the `GET /api/v1/reports/projects/:id/ledger` API call resolves,
**Then** the drawer renders within 1.5 seconds total (network + render) showing: Revenue, Cost, Profit, Margin % KPI tiles at the top; an employee cost breakdown table below

**Given** the employee breakdown table,
**When** it renders,
**Then** columns are: Employee Name, Designation, Hours, Cost/Hour (₹), Contribution (₹); all monetary cells use `font-feature-settings: 'tnum'` (tabular numerals) for column alignment

**Given** any figure in the Ledger that is derived (not a raw input),
**When** rendered,
**Then** it has a dotted underline (`border-bottom: 1px dotted`); hovering over it shows a tooltip with the formula used to calculate it (e.g., "Annual CTC (₹X) + ₹1,80,000 overhead ÷ 12 ÷ 160 hours")

**Given** any employee row where `contribution_paise` is the largest single contributor to a loss,
**When** the project is in loss (`profit_paise < 0`),
**Then** that row's background is `#FFF2F0` — consistent with the loss-row convention

**Given** the `engine_version` and `calculated_at` fields in the snapshot,
**When** rendered at the bottom of the Drawer,
**Then** a metadata footer shows "Calculated: [relative timestamp] · Engine v[version]" so users can identify stale data

**Given** the Drawer on mobile viewports,
**When** the screen width is < 768px,
**Then** the Drawer renders at 100% width (full-screen overlay) instead of 480px

**Given** the Drawer is open and the user presses Escape or clicks the backdrop,
**When** the close event fires,
**Then** the Drawer closes and the TanStack Query cache entry for that ledger remains warm (no refetch on reopen within 5 minutes)

**Given** `ledger-drawer.test.tsx`,
**When** `pnpm test` runs,
**Then** tests cover: drawer open on row click, API call with correct project ID and period, dotted underline on derived figures, loss-row background, metadata footer content, mobile width override, Escape/backdrop close

**Architecture Notes:** Drawer state managed by `useState` in the parent dashboard component — no global state. `useQuery(['ledger', projectId, period], ...)` with `staleTime: 5 * 60 * 1000`. Never recalculates — reads only from snapshot.

---

### Story 6.5: Employee Dashboard

**As an** Admin, Finance user, or Department Head,
**I want to** view a dashboard showing profitability metrics per individual employee — billable utilisation, revenue contribution, cost, profit, and profitability rank,
**So that** I can identify high-cost low-revenue team members and make informed staffing decisions.

#### Acceptance Criteria

**Given** `GET /api/v1/reports/employees`,
**When** called by Admin or Finance,
**Then** it returns all active employees with computed metrics from `calculation_snapshots` for the current period: `employeeId`, `name`, `designation`, `department`, `totalHours`, `billableHours`, `billableUtilisationPercent` (billableHours ÷ standardMonthlyHours as decimal), `totalCostPaise`, `revenueContributionPaise`, `profitContributionPaise`, `profitabilityRank` (ranked descending by revenueContributionPaise) (FR38)

**Given** a Department Head calls `GET /api/v1/reports/employees`,
**When** `rbacMiddleware` applies department scoping,
**Then** only employees in their department are returned; Admin and Finance receive all employees (FR10, FR38)

**Given** HR calls `GET /api/v1/reports/employees`,
**When** `rbacMiddleware` checks the role,
**Then** HTTP 403 is returned — HR manages employee records but does not view financial profitability data

**Given** the Employee Dashboard page renders,
**When** it loads,
**Then** it shows an antd `Table` (`size="small"`) with columns: Rank (#), Name, Designation, Department, Billable Utilisation (%), Revenue Contribution (₹), Cost (₹), Profit Contribution (₹), Margin % — all monetary columns right-aligned with `tabular-nums`

**Given** an employee row with `billableUtilisationPercent < 0.5` (below 50%),
**When** the row renders,
**Then** the Billable Utilisation cell is highlighted with amber text — a visual signal that the employee is under-utilised

**Given** an employee row where `profitContributionPaise < 0` (negative contribution),
**When** the row renders,
**Then** the row background is `#FFF2F0` consistent with the loss-row convention across all dashboards

**Given** the Employee Dashboard filter bar,
**When** a user selects filters (department, designation),
**Then** the table re-queries with those filters as URL search params; results update without page reload

**Given** the profitabilityRank column,
**When** sorted ascending,
**Then** the highest revenue contributors appear first; the rank numbers reflect the server-computed ordering for the full (unfiltered) dataset

**Given** any employee name in the table,
**When** clicked,
**Then** it navigates to a read-only employee detail view showing: month-by-month billable hours history, project assignments with per-project contribution (all sourced from `calculation_snapshots`)

**Given** `employee-dashboard.test.tsx`,
**When** `pnpm test` runs,
**Then** tests cover: Admin/Finance full visibility, Department Head scope filtering, HR 403, under-utilisation highlight (< 50%), loss-row background on negative contribution, profitability rank ordering, filter param propagation

**Architecture Notes:** Employee-level metrics are derived from `calculation_snapshots` rows where `entity_type = 'EMPLOYEE'` — these rows are persisted in Epic 4 Story 4.5 and are available by the time Epic 6 begins. Query keyed as `['reports', 'employees', filters]` in TanStack Query. `billableUtilisationPercent` calculated server-side as `billableHours / standardMonthlyHours`.

---

## Epic 7: Export, Sharing & Audit

**Goal:** Give users the ability to export profitability reports as PDFs, share read-only snapshots via secure links, and provide Admins with a complete audit trail of all system mutations — closing the loop on data governance and stakeholder communication.

**FRs Covered:** FR41, FR42, FR43, FR44

---

### Story 7.1: PDF Export

**As a** Finance, Delivery Manager, or Admin user,
**I want to** export any profitability report or project detail view as a PDF,
**So that** I can share polished reports with clients or leadership without granting them system access.

#### Acceptance Criteria

**Given** `POST /api/v1/reports/export/pdf` is called with `{ reportType, entityId, period }`,
**When** the request is received,
**Then** a Puppeteer instance launches, navigates to the internal report URL for that entity/period (with a service-level auth token, not user session), and renders it to PDF (FR41)

**Given** the Puppeteer render,
**When** it completes,
**Then** the response returns the PDF binary with headers `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=IPIS-[reportType]-[entityId]-[period].pdf`

**Given** the PDF generation time,
**When** measured under load,
**Then** the endpoint responds within 10 seconds for any report type (NFR3)

**Given** Puppeteer's Chromium dependency,
**When** the Docker image is built,
**Then** it uses a non-alpine Node base image (e.g., `node:22-slim` or `node:22`) — alpine lacks the shared libraries Puppeteer requires

**Given** a Finance or Delivery Manager user requesting export,
**When** `rbacMiddleware` checks,
**Then** Finance and Admin can export any report; Delivery Manager can only export their own projects' reports; HR cannot access export endpoints (HTTP 403)

**Given** the frontend "Export PDF" button,
**When** it appears on any dashboard or project detail page,
**Then** clicking it posts to the export endpoint, shows an antd `message.loading('Generating PDF…')` notification, and triggers the file download on response — the button is disabled during the request to prevent double-submission

**Given** Puppeteer throws an error (e.g., timeout, render failure),
**When** the exception is caught in the route handler via `asyncHandler`,
**Then** HTTP 500 is returned with error code `PDF_GENERATION_FAILED`; the error is logged via pino with `{ reportType, entityId, period }`

**Given** `pdf.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests cover: correct Content-Disposition header, RBAC 403 for HR, DM scope enforcement, 500 on Puppeteer failure (mocked); Puppeteer itself is mocked — no real browser in unit tests

**Architecture Notes:** Puppeteer instance is created per-request (not pooled) — sufficient for internal low-volume use. Service-level auth token for internal navigation uses a short-lived JWT signed with `INTERNAL_SERVICE_SECRET` env var, not tied to user sessions.

---

### Story 7.2: Shareable Report Links

**As a** Finance or Admin user,
**I want to** generate a shareable link for any report that allows anyone with the link to view a read-only snapshot — without requiring a login,
**So that** I can share profitability data with external stakeholders or board members securely and on a time-limited basis.

#### Acceptance Criteria

**Given** `POST /api/v1/reports/share` is called with `{ reportType, entityId, period }`,
**When** the request succeeds,
**Then** a `shared_report_tokens` row is created with: `id` (UUID v4), `created_by` (FK→users), `report_type`, `entity_id`, `period_month`, `period_year`, `snapshot_data` (JSONB — the full report payload at time of creation), `expires_at` (now + 30 days), `revoked_at` (null), `created_at` (FR42)

**Given** the response from `POST /api/v1/reports/share`,
**When** the token is created,
**Then** the response body includes `{ token: "<uuid>", shareUrl: "/reports/shared/<uuid>", expiresAt: "<ISO timestamp>" }` — the `shareUrl` is the public-facing path

**Given** `GET /api/v1/reports/shared/:token` (public endpoint — no authentication required),
**When** called with a valid, non-expired, non-revoked token,
**Then** the `snapshot_data` JSONB is returned as the response body; HTTP 200 (FR43)

**Given** the token is expired (`expires_at < now()`),
**When** the public endpoint is called,
**Then** HTTP 410 Gone is returned with error code `LINK_EXPIRED`

**Given** the token has been revoked (`revoked_at IS NOT NULL`),
**When** the public endpoint is called,
**Then** HTTP 410 Gone is returned with error code `LINK_REVOKED`

**Given** `DELETE /api/v1/reports/share/:tokenId` is called by an Admin,
**When** the request succeeds,
**Then** `revoked_at` is set to `now()` on the token row; subsequent calls to the public endpoint for that token return 410 (FR43)

**Given** a non-Admin user calling `DELETE /api/v1/reports/share/:tokenId`,
**When** `rbacMiddleware` checks,
**Then** HTTP 403 is returned — only Admins can revoke tokens

**Given** the public shared report page (`/reports/shared/:token` in the frontend),
**When** it loads,
**Then** it fetches from the public API endpoint, renders the report in read-only mode with a banner: "This is a shared snapshot · Generated [date] · Expires [date]"; no navigation, no interactive filters — snapshot only

**Given** `share.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests cover: token creation with correct expiry, valid token retrieval, expired token 410, revoked token 410, Admin revoke flow, RBAC 403 on non-Admin revoke

**Architecture Notes:** `snapshot_data` is populated by calling the same report service function that powers the live dashboard — called once at share-time, stored in JSONB. Public endpoint has no `rbacMiddleware` but DOES go through `asyncHandler` and global error middleware. Rate limiting on the public endpoint: 60 req/min per IP (express-rate-limit).

---

### Story 7.3: Audit Log View

**As an** Admin,
**I want to** view a paginated, filterable audit log of all significant system actions,
**So that** I can investigate anomalies, track data changes, and demonstrate compliance with internal governance requirements.

#### Acceptance Criteria

**Given** `GET /api/v1/audit-log` is called by an Admin,
**When** the query runs,
**Then** it returns paginated `audit_events` rows (default 50 per page) with: `id`, `actor_name`, `actor_email`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB summary), `ip_address`, `created_at` (FR44)

**Given** a non-Admin user calls `/api/v1/audit-log`,
**When** `rbacMiddleware` checks,
**Then** HTTP 403 is returned

**Given** the audit log page in the Admin section,
**When** it renders,
**Then** it shows an antd v6 `Table` with columns: Timestamp, Actor, Action (antd `Tag` color-coded by action category), Entity, Details (expandable row showing full `metadata` JSON)

**Given** the filter bar above the table,
**When** a user filters by action type (multi-select dropdown),
**Then** the table re-queries with `action IN (...)` filter applied via URL search params

**Given** the filter bar date range picker,
**When** a user selects a date range,
**Then** the table re-queries with `created_at BETWEEN :start AND :end` — using antd v6 `DatePicker.RangePicker`

**Given** the actor filter,
**When** a user types in the actor search input,
**Then** a debounced query filters by `actor_email ILIKE '%:term%'`

**Given** the audit log table,
**When** rendered,
**Then** there are NO delete, purge, or edit buttons — the audit log is strictly append-only and read-only in the UI

**Given** PostgreSQL indexes on `audit_events`,
**When** the migration runs,
**Then** indexes are created on: `created_at DESC`, `actor_id`, `action`, `entity_type` — supporting the common filter patterns

**Given** `audit-log.test.tsx`,
**When** `pnpm test` runs,
**Then** tests cover: table renders with mocked data, action type filter updates query params, date range filter, read-only assertion (no delete buttons present), RBAC 403 for non-Admin

---

### Story 7.4: Audit Event Instrumentation

**As the** system,
**I want to** automatically record a structured audit event after every significant mutation,
**So that** Admins have a complete, tamper-evident history of all data changes without developers needing to remember to add logging per-feature.

#### Acceptance Criteria

**Given** `audit.service.ts` with `logAuditEvent({ actorId, action, entityType, entityId, ipAddress, metadata })`,
**When** called,
**Then** it inserts one row into `audit_events` and returns immediately — it is always wrapped in `try/catch` and never rethrows (fire-and-forget; audit failure must never break the primary operation)

**Given** the `audit_events` table,
**When** the migration runs,
**Then** it includes: `id` (UUID), `actor_id` (FK→users, nullable for system actions), `action` (VARCHAR — enum-like string), `entity_type` (VARCHAR), `entity_id` (VARCHAR), `ip_address` (VARCHAR), `metadata` (JSONB), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())

**Given** the following mutating operations, each MUST call `logAuditEvent` after successful commit:
- User created/updated/deactivated → action: `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`
- Project created/resubmitted → `PROJECT_CREATED`, `PROJECT_RESUBMITTED`
- Project approved/rejected → `PROJECT_APPROVED`, `PROJECT_REJECTED` (metadata includes comment)
- Timesheet upload → `UPLOAD_TIMESHEET_SUCCESS` or `UPLOAD_TIMESHEET_REJECTED`
- Billing upload → `UPLOAD_BILLING_SUCCESS`
- Salary upload → `UPLOAD_SALARY_SUCCESS` or `UPLOAD_SALARY_PARTIAL`
- Share link created/revoked → `SHARE_LINK_CREATED`, `SHARE_LINK_REVOKED`
- PDF exported → `PDF_EXPORTED` (metadata includes reportType, entityId, period)
- Recalculation triggered → `RECALCULATION_TRIGGERED` (metadata includes runId, projectsProcessed)
- System settings updated → `SETTINGS_UPDATED`

**Given** `req.ip` is available in all route handlers,
**When** `logAuditEvent` is called,
**Then** `ip_address` is populated from `req.ip` — supporting the audit trail for access investigations

**Given** `audit.service.test.ts`,
**When** `pnpm test` runs,
**Then** tests cover: correct row insert for each action type, fire-and-forget on DB error (primary operation unaffected), nullable actor for system-initiated events, all 18+ action strings are constants (not magic strings) exported from `audit.constants.ts`

**Architecture Notes:** Action strings are constants in `packages/shared/src/constants/audit.constants.ts` — imported by both service and tests. `logAuditEvent` is called at the service layer (not route handler) after the primary transaction commits. `actor_id` is nullable to support future scheduled/system jobs that trigger mutations without a user context.

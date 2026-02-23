---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/product-brief-BMAD_101-2026-02-23.md
  - docs/requirements/raw_requirements.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
project_name: 'BMAD_101'
user_name: 'Dell'
date: '2026-02-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (50 FRs across 8 categories):**
- Authentication & Session Management (FR1–FR4, FR49–FR50): Email/password, JWT,
  2-hour inactivity auto-logout, password reset, forced first-login password change
- User & Role Management (FR5–FR10): Admin-managed RBAC, 5 roles, system config,
  API-level enforcement on every data access path
- Employee Data Management (FR11–FR16): Bulk Excel upload (row-level partial import),
  individual form entry, edit, resign marking
- Data Ingestion (FR17–FR21): Atomic timesheet upload (all-or-nothing), revenue/billing
  upload, synchronous profitability recalculation triggered on every successful upload
- Project Management (FR22–FR28, FR45–FR47): Project creation (4 engagement models),
  pending → approved workflow, rejection/resubmission, % completion entry, team roster,
  email notifications (Admin on new submission; Delivery Manager on decision)
- Profitability Calculation Engine (FR29–FR35): 4 distinct model logics (T&M, Fixed
  Cost, AMC, Infrastructure), 4-level profitability surfacing, calculation breakdown
  traceability across 6 derived fields
- Dashboards & Reporting (FR36–FR40): Executive, Project, Employee, Department
  dashboards with role-scoped data; Admin pending approvals panel
- Export, Sharing & Audit (FR41–FR44): PDF export (server-side, ≤10s), unauthenticated
  shareable links, immutable audit log, Admin audit log view

**Non-Functional Requirements (16 NFRs):**
- Performance: Dashboard <1s load · Recalculation <30s post-upload · PDF <10s ·
  Upload validation <60s for ≤5,000 rows · Ledger Drawer <1.5s (from UX spec)
- Security: HTTPS · bcrypt passwords · JWT with inactivity expiry and active-session
  refresh · API-level role enforcement on every request · CORS restriction ·
  no sensitive data in logs
- Reliability: 99.5% monthly uptime (business hours) · daily PostgreSQL backups
  (30-day retention) · immutable audit records · failed recalculation must not corrupt
  last successful calculation state
- Scalability: ≤50 concurrent users · ≤500 active projects · 3+ years upload history
  growth without schema changes

**Scale & Complexity:**
- Primary domain: Internal full-stack web application (React SPA + ExpressJS REST API + PostgreSQL + AWS)
- Complexity level: Medium — calculation engine correctness + RBAC data scoping + upload pipeline integrity are the defining technical risks
- ~8 major backend modules: auth, RBAC, employee management, upload pipeline, calculation engine, dashboards/reporting, export, audit
- ~27 frontend surfaces (21 routes + ~6 modal/drawer overlays) using Ant Design v5

### Technical Constraints & Dependencies

- **Stack is fixed:** React · ExpressJS · PostgreSQL · AWS
- **Server-side Excel parsing only:** No client-side data processing
- **Synchronous recalculation:** No background job queues — upload triggers immediate recalculation, user receives completion confirmation. Computational scope: ≤500 active projects × N employees × uploaded period data. Query strategy must be designed to hit the 30-second ceiling reliably. *(Open: indexed aggregation approach TBD in architecture decisions)*
- **Single-tenant:** One instance, one company — no tenant isolation complexity
- **No external integrations for v1:** No SSO, no timesheet system API, no ERP
- **Email delivery required:** FR46/FR47 require transactional email for project approval/rejection notifications. Infrastructure decision needed: AWS SES vs. third-party transactional email service. *(Open: to decide in architecture decisions)*
- **3-person build team:** Architecture must be implementable by 1 backend + 1 frontend + 1 QA — no exotic patterns
- **Calculation correctness is a trust requirement:** All 4 engine models validated against manual Excel before go-live; regression-tested on every change
- **Greenfield:** No historical data migration; forward-looking from go-live only

### Cross-Cutting Concerns Identified

1. **RBAC Data Scoping** — Every API endpoint must enforce role-based query filtering. Not middleware — a query-level concern on every data access path.

2. **Two-Transaction-Model Upload Pipeline** — Two distinct, named upload patterns that must never be conflated:
   - *Atomic model* (timesheet/revenue): All-or-nothing. One bad row rejects the entire file. No partial state ever enters the system.
   - *Row-level model* (salary master): Valid rows import immediately; failed rows are made available for correction and re-upload.
   These require separate code paths with distinct error recovery behavior.

3. **Calculation Engine Integrity** — The engine must be a discrete, independently testable module. Calculation logic cannot be entangled with request handling or data access. TDD required.

4. **Upload Cross-Reference Validation Performance** — Referential integrity checks during upload (employee IDs vs. salary master; project names vs. approved projects) require database lookups for files up to 5,000 rows within a 60-second window. Batch lookup strategy required — row-by-row queries will not meet NFR4.

5. **Calculation Explainability (Ledger Drawer) — Open Architectural Decision:** Six derived fields (Margin %, Employee Cost, Utilization %, Billable %, Cost per Hour, Revenue Contribution) require decomposed payloads from dedicated endpoints.
   **Key open question:** Do we persist calculation intermediates at recalculation time, or recompute from raw data on-demand when the Ledger Drawer fires?
   - *Persist intermediates:* Every recalculation writes breakdown snapshots per project/employee/period. Drawer queries are fast reads. Storage grows with upload frequency.
   - *Recompute on-demand:* Drawer triggers a fresh calculation from raw data. No extra storage. Must complete in ≤1.5s (UX spec). *(To decide in architecture decisions)*

6. **Shareable Link Policy — Open Architectural Decision:** Unauthenticated shareable links expose commercially sensitive profitability data. Architecture must answer: Do links expire? Can they be revoked by Admin? What is the exact data scope (dashboard snapshot vs. live data)? These are policy decisions with direct schema and security implications. *(To decide in architecture decisions)*

7. **Audit Trail Immutability** — Audit log writes are append-only. No UPDATE or DELETE operations on audit records by any code path.

8. **PDF Export + Shareable Link Infrastructure** — Both require server-side rendering. PDF generation must complete ≤10s. Shareable links must return data without session auth — requires a public-facing endpoint subset within an otherwise private API.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack internal web application — React SPA (frontend) + ExpressJS REST API (backend) + PostgreSQL (database) + AWS (hosting). Stack fixed by PRD. Additional decisions established here: TypeScript (both tiers), pnpm monorepo, Prisma ORM, Ant Design v6.

### Starter Options Considered

No single official starter exists for React + Express + PostgreSQL. Three paths evaluated:
- Community boilerplate (simple-vite-react-express): Under-maintained — rejected
- Separate repos: Coordination overhead for 3-person team — rejected
- pnpm monorepo (manually scaffolded): Modern, team-friendly, zero unnecessary abstraction — selected

### Selected Approach: Manual pnpm Monorepo Scaffold

**Rationale:** A monorepo keeps frontend and backend in sync for a 3-person team, enables shared TypeScript type definitions, and removes cross-repo coordination overhead. Each package is scaffolded with the standard tool for its domain.

**Initialization Commands:**

```bash
# 1. Initialize monorepo
mkdir ipis && cd ipis
pnpm init
echo "packages:\n  - 'packages/*'" > pnpm-workspace.yaml

# 2. Frontend — React 19 + TypeScript via Vite 7
cd packages
npm create vite@latest frontend -- --template react-ts

# 3. Backend — Express 5 + TypeScript
mkdir backend && cd backend
pnpm init
pnpm add express@latest
pnpm add -D tsx typescript @types/express @types/node

# 4. Database — Prisma ORM + PostgreSQL
cd backend
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init

# 5. UI Component Library
cd ../frontend
pnpm add antd  # installs v6.3.0 (current)
```

**Architectural Decisions Established by This Scaffold:**

**Language & Runtime:**
- TypeScript across both frontend and backend (strict mode)
- Node.js 20+ (LTS) for backend runtime
- React 19 (latest stable) for frontend

**Frontend Tooling:**
- Vite 7.3.1 — build tool and dev server; HMR, fast cold starts
- react-ts Vite template — TypeScript + React configured out of the box

**Backend Tooling:**
- Express 5.2.1 — now stable; async error handling via rejected promises
- tsx — TypeScript execution for development (replaces ts-node); built-in watch mode
- tsc — compiled output for production (`dist/`)

**ORM & Database Access:**
- Prisma (latest) — type-safe queries, schema-first migrations, Prisma Studio for inspection. Chosen over Drizzle for superior DX and ecosystem maturity on a 3-person team.
- PostgreSQL driver via Prisma's pg adapter

**UI Component Library:**
- Ant Design v6.3.0 — current stable release (v5 EOL as of Feb 2026). API is substantially compatible with UX spec designs. Migration from v5 references in UX spec to be applied using antd v6 ConfigProvider token system.

**Code Organization (Monorepo Structure):**

```
ipis/
├── packages/
│   ├── frontend/          # Vite + React 19 + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── services/  # API client layer
│   │   └── vite.config.ts
│   ├── backend/           # Express 5 + TypeScript
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/  # Business logic (incl. calc engine)
│   │   │   ├── lib/       # Prisma client, utilities
│   │   │   └── index.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── shared/            # Shared TypeScript types (optional)
├── pnpm-workspace.yaml
└── package.json
```

**Testing Infrastructure:**
- Backend: Vitest (Jest-compatible, faster, native ESM) for unit + integration tests
- Frontend: Vitest + React Testing Library for component tests
- E2E: Playwright (to be configured in QA phase)

**Development Experience:**
- tsx --watch for backend hot reload
- Vite HMR for frontend instant reload
- Prisma Studio for database inspection during development
- ESLint + Prettier (configured by Vite template, extended for backend)

**Note:** Project monorepo initialization is the first implementation story. Confirm antd v6 adoption with team before frontend scaffold — UX spec references v5 tokens but v6 migration is straightforward via ConfigProvider.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Ledger Drawer data strategy: persist intermediates
- JWT storage: httpOnly cookie
- Upload progress feedback: Server-Sent Events (SSE)
- Shareable link policy: signed tokens, snapshot data, 30-day expiry, revocable

**Important Decisions (Shape Architecture):**
- TanStack Query v5 for server state + SSE for upload progress
- Prisma ORM with snapshot versioning (engine_version + calculated_at)
- App Runner deployment with Puppeteer caveat
- Route protection principle: API-level enforcement, frontend guards are UX only

**Deferred Decisions (Post-MVP):**
- Caching layer (Redis) — revisit if dashboard loads degrade at scale
- Shareable link expiry configurability — v2 Admin setting
- Calculation snapshot invalidation UI — v2 feature

### Data Architecture

**Database:** AWS RDS PostgreSQL (managed, automated backups, 30-day retention satisfying NFR12 out of the box)

**ORM:** Prisma (latest) — schema-first migrations, type-safe queries, Prisma Studio for development inspection

**Migration approach:** Prisma Migrate — migration files committed to source control, run automatically in CI/CD pipeline on deploy

**Validation library:** Zod v3 — schema-first validation shared between frontend and backend via the `shared/` monorepo package. Validates request bodies server-side; validates API responses client-side.

**Caching:** None for v1. Dashboard query performance addressed via PostgreSQL indexes (project_id, employee_id, upload_date). Revisit post-launch.

**Ledger Drawer — Persist Intermediates (Decision):**
At recalculation time, write calculation breakdown snapshots to a `calculation_snapshots` table per project/employee/period. Drawer queries are fast reads against this table. Schema includes:
- `engine_version` — identifies which calculation engine version produced the snapshot
- `calculated_at` — timestamp of the recalculation run that produced this snapshot
- `recalculation_run_id` — links snapshot to the upload event that triggered it

Snapshot invalidation strategy: when the calculation engine changes (bug fix or formula update), trigger a full recalculation on next admin action or upload. Display `calculated_at` in the Ledger Drawer footer — answers "is this current?"

### Authentication & Security

**JWT storage:** httpOnly cookie with `sameSite: 'strict'`. Token never accessible to JavaScript — XSS protection. Same-origin requests with `sameSite: strict` eliminate CSRF risk without additional tokens.

**JWT library:** `jose` v5 — modern, standards-compliant, actively maintained. Replaces the legacy `jsonwebtoken` package.

**Auth state hydration:** `GET /api/v1/auth/me` endpoint — called on app load via TanStack Query. Returns current user's role, name, and permissions. Cache cleared on logout. Frontend never reads the JWT directly.

**Password hashing:** bcrypt (as specified in PRD NFR6)

**Rate limiting:** `express-rate-limit` on auth endpoints only (login, password reset). Internal tool — global rate limiting is unnecessary overhead for v1.

**Route protection principle (critical):**
Frontend React Router guards are for UX only — they prevent unauthorized users from seeing a route, but provide no security guarantee. API-level RBAC is the sole security enforcement mechanism. Every protected endpoint validates the authenticated user's role before returning data. Must be tested: every protected endpoint has an API-level RBAC test as a story acceptance criterion.

**Sensitive field redaction:** `pino` logger configured with `redact` option to strip CTC, contract values, and billing rates from all log output (NFR9).

### API & Communication Patterns

**URL structure:** `/api/v1/...` — versioned from day one. Minimal overhead, enables future non-breaking extension.

**Standard error response shape:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "employeeId", "message": "Not found in system" }]
  }
}
```
Consistent error codes enable frontend to handle errors programmatically (display specific upload failure messages, drive UX error states).

**File upload handling:** `multer` — standard Express file upload middleware. Combined with `xlsx` (SheetJS) for server-side Excel parsing.

**Upload progress feedback — Server-Sent Events (SSE):**
TanStack Query's mutation model does not natively handle streaming progress for long-running operations (upload validation + recalculation = up to ~90s end-to-end). Solution: dedicated SSE endpoint for upload/recalculation progress.
- Upload endpoint accepts file → starts processing → returns an `uploadId`
- Frontend subscribes to `GET /api/v1/uploads/:uploadId/progress` via `EventSource`
- SSE stream emits: `"Parsing file..." → "Validating records..." → "Recalculating profitability..." → "Complete"`
- On complete, TanStack Query cache is invalidated to refresh dashboards
- Not managed by TanStack Query — a direct browser `EventSource` connection

**PDF generation:** Puppeteer — headless Chrome renders dashboard HTML to PDF, producing pixel-perfect output matching the React UI. Caveat: adds ~300-400MB to Docker image; requires a non-alpine Node base image with Chrome dependencies. Monitor App Runner image size limits. Contingency if image size becomes an issue: `@react-pdf/renderer` (lighter, no headless browser, but requires a separate PDF-specific component tree). Decision: proceed with Puppeteer for v1.

**Logging:** `pino` — structured JSON logging to stdout, captured by AWS CloudWatch via App Runner. Sensitive fields redacted via pino's `redact` option.

### Frontend Architecture

**State management:** TanStack Query v5 — manages all server state (dashboard data, project lists, employee data). Handles loading states, error states, cache invalidation, and background refetching out of the box. Replaces a separate state manager + API client for server state.

**Local UI state:** React's built-in `useState`/`useContext` for pure UI state (e.g., sidebar collapse). Zustand available if complexity grows — not added for v1.

**API client:** Native `fetch` — used by TanStack Query's `queryFn`. No Axios dependency. Thin wrapper utility for adding auth headers and base URL.

**Upload progress:** Direct browser `EventSource` — not TanStack Query. See SSE decision above.

**Routing:** React Router v7 — type-safe, role-scoped route guards for UX. Guards redirect unauthorized roles to their default landing page. Note: guards are UX only — API enforcement is the security layer.

**Form management:**
- Ant Design `Form` for standard forms (employee entry, system config, user management) — native antd validation display
- React Hook Form for complex adaptive forms (project creation with 4 engagement model variants) — more control over field-level validation and dynamic field rendering
- Do not mix both approaches within the same form

### Infrastructure & Deployment

**Hosting:** AWS App Runner — deploys from Docker container, fully managed, auto-scales, no load balancer or server configuration. Right-sized for 50 concurrent users with zero ops overhead for a 3-person team.

**Database:** AWS RDS PostgreSQL — managed, automated daily backups with 30-day retention (satisfies NFR12), point-in-time recovery, VPC-isolated from App Runner.

**CI/CD:** GitHub Actions — pipeline:
`push → lint + typecheck → Vitest → build Docker image → deploy to staging → (manual approval gate) → deploy to production`
AWS OIDC integration (no long-lived credentials stored in GitHub).

**Email:** AWS SES — transactional email for project approval/rejection notifications (FR46, FR47). Low volume, low cost, no third-party dependency.

**Shareable links:**
- Generated as a random UUID token stored in DB with: `report_snapshot` (JSON), `created_by`, `created_at`, `expires_at` (30 days), `revoked` (boolean)
- `GET /api/v1/reports/shared/:token` — public endpoint, no auth required
- Returns the snapshot data as captured at generation time (not live data)
- Admin can revoke any link (sets `revoked: true`)
- Expired or revoked tokens return 404

**Environment configuration:** Three environments — local development, staging (auto-deployed on merge to main), production (manual approval gate). Environment variables managed via AWS App Runner environment configuration. `.env` files for local development only (never committed).

### Decision Impact Analysis

**Implementation Sequence (dependencies drive order):**
1. Monorepo scaffold + shared Zod schemas
2. Prisma schema + RDS setup + initial migrations
3. Auth module (JWT via jose, httpOnly cookies, /auth/me endpoint)
4. RBAC middleware (role extraction, query scoping utilities)
5. Employee management module (salary upload — row-level validation model)
6. Calculation engine (isolated service, TDD, all 4 models)
7. Upload pipeline (timesheet + revenue — atomic validation model + SSE progress)
8. Calculation snapshot persistence (runs as part of upload pipeline)
9. Dashboard API endpoints (RBAC-scoped queries against snapshots + raw data)
10. Ledger Drawer API endpoints (reads from calculation_snapshots)
11. Frontend scaffold (Vite + antd v6 + React Router + TanStack Query)
12. Dashboard components (Executive → Project → Employee → Department)
13. PDF export (Puppeteer) + Shareable link generation
14. Audit log + Admin views
15. CI/CD pipeline + AWS deployment

**Cross-Component Dependencies:**
- Calculation engine must be complete before upload pipeline can trigger recalculation
- Calculation snapshots must be written before Ledger Drawer endpoints exist
- RBAC middleware must exist before any dashboard endpoint is built
- Auth module must exist before any RBAC middleware can function
- Shared Zod schemas must exist before frontend and backend can validate the same shapes
- SSE upload progress requires the upload pipeline to emit events to an in-process event emitter that the SSE endpoint subscribes to

## Implementation Patterns & Consistency Rules

**Critical Conflict Points Identified:** 9 areas where AI agents could make incompatible choices without explicit rules.

### Naming Patterns

#### Database Naming Conventions (Prisma Schema)

| Element | Convention | Example |
|---|---|---|
| Table names | `snake_case`, plural | `employees`, `projects`, `calculation_snapshots` |
| Column names | `snake_case` | `employee_id`, `annual_ctc`, `created_at` |
| Foreign keys | `{table_singular}_id` | `project_id`, `employee_id`, `uploaded_by_id` |
| Boolean columns | `is_` prefix | `is_resigned`, `is_revoked`, `is_approved` |
| Timestamp columns | `_at` suffix | `created_at`, `updated_at`, `calculated_at` |
| Junction tables | `{table_a}_{table_b}` alphabetical | `employee_projects` |
| Index names | `{table}_{column(s)}_idx` | `timesheets_project_id_idx` |
| Enum names | `PascalCase` | `EngagementModel`, `UserRole`, `ProjectStatus` |
| Enum values | `SCREAMING_SNAKE_CASE` | `FIXED_COST`, `TIME_AND_MATERIALS`, `PENDING_APPROVAL` |

**Anti-pattern:** Never use `camelCase` in Prisma schema column names. Prisma maps `snake_case` DB columns to `camelCase` TypeScript properties automatically — the DB stays snake_case, TypeScript stays camelCase.

#### API Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Resource URLs | `/api/v1/{plural-kebab}` | `/api/v1/employees`, `/api/v1/projects` |
| Nested resources | `/api/v1/{parent}/{id}/{child}` | `/api/v1/projects/:id/timesheets` |
| Action endpoints | `/api/v1/{resource}/:id/{verb}` | `/api/v1/projects/:id/approve` |
| Route parameters | `:camelCase` | `:projectId`, `:employeeId` |
| Query parameters | `camelCase` | `?startDate=`, `?engagementModel=` |
| SSE endpoints | `/api/v1/{resource}/:id/progress` | `/api/v1/uploads/:uploadId/progress` |
| Shared link endpoint | `/api/v1/reports/shared/:token` | (public, no auth) |

**HTTP method conventions:**
- `GET` — read, never mutates state
- `POST` — create new resource or trigger action (upload, approve)
- `PUT` — full replacement of a resource
- `PATCH` — partial update of a resource
- `DELETE` — soft delete only (set `is_active: false` or `is_resigned: true`)

**Anti-pattern:** Never use `GET` for state-changing operations (e.g., `GET /approve`).

#### Code Naming Conventions

**TypeScript / JavaScript:**

| Element | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `projectId`, `annualCtc`, `uploadedAt` |
| Functions | `camelCase`, verb-first | `calculateMargin()`, `validateTimesheet()` |
| Classes | `PascalCase` | `CalculationEngine`, `UploadService` |
| Interfaces/Types | `PascalCase`, no `I` prefix | `Project`, `CalculationSnapshot`, `UserRole` |
| Zod schemas | `camelCase`, `Schema` suffix | `projectSchema`, `timesheetRowSchema` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_ROWS`, `DEFAULT_WORKING_HOURS` |
| Boolean variables | `is`/`has`/`can` prefix | `isLoading`, `hasError`, `canApprove` |

**React Components:**

| Element | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `LedgerDrawer.tsx`, `MarginHealthBadge.tsx` |
| Component functions | `PascalCase` | `function LedgerDrawer()` |
| Hook files | `camelCase.ts`, `use` prefix | `useProjectData.ts` |
| Hook functions | `camelCase`, `use` prefix | `useProjectData()`, `useUploadProgress()` |
| Page files | `PascalCase.tsx` in `pages/` | `ExecutiveDashboard.tsx` |

**Anti-pattern:** Never mix `PascalCase` and `kebab-case` for the same element type.

---

### Structure Patterns

#### Backend File Organization

```
packages/backend/src/
├── routes/               # Express routers only — no business logic
│   ├── auth.routes.ts
│   ├── employees.routes.ts
│   ├── projects.routes.ts
│   ├── uploads.routes.ts
│   ├── dashboards.routes.ts
│   └── reports.routes.ts
├── middleware/           # Express middleware
│   ├── auth.middleware.ts        # JWT extraction + validation
│   ├── rbac.middleware.ts        # Role enforcement
│   ├── error.middleware.ts       # Global error handler
│   └── upload.middleware.ts      # multer config
├── services/             # Business logic — all domain operations live here
│   ├── calculation-engine/
│   │   ├── index.ts              # Engine entry point
│   │   ├── tm.calculator.ts      # T&M model
│   │   ├── fixed-cost.calculator.ts
│   │   ├── amc.calculator.ts
│   │   └── infrastructure.calculator.ts
│   ├── upload.service.ts
│   ├── employee.service.ts
│   ├── project.service.ts
│   └── report.service.ts
├── lib/                  # Shared utilities, Prisma client, config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── email.ts                  # AWS SES wrapper
│   ├── pdf.ts                    # Puppeteer wrapper
│   └── sse.ts                    # SSE event emitter
└── index.ts              # App entry point, Express setup
```

**Rule:** Routes call services. Services call Prisma. Never call Prisma directly from a route handler.

#### Frontend File Organization

```
packages/frontend/src/
├── components/           # Reusable components (not tied to a page)
│   ├── LedgerDrawer/
│   │   ├── LedgerDrawer.tsx
│   │   └── index.ts
│   ├── MarginHealthBadge.tsx
│   ├── AtRiskKPITile.tsx
│   ├── UploadConfirmationCard.tsx
│   ├── UploadHistoryLog.tsx
│   ├── DataPeriodIndicator.tsx
│   └── ProjectStatusBadge.tsx
├── pages/                # One file per route
│   ├── ExecutiveDashboard.tsx
│   ├── ProjectDashboard.tsx
│   ├── EmployeeDashboard.tsx
│   ├── DepartmentDashboard.tsx
│   └── UploadCenter.tsx
├── hooks/                # Custom hooks
│   ├── useAuth.ts                # Reads /auth/me, manages auth state
│   ├── useUploadProgress.ts      # SSE EventSource hook
│   └── useDashboardData.ts
├── services/             # API client functions (called by TanStack Query)
│   ├── api.ts                    # fetch wrapper (base URL, auth headers)
│   ├── projects.api.ts
│   ├── employees.api.ts
│   └── dashboards.api.ts
├── router/               # React Router config + route guards
│   ├── index.tsx
│   └── guards.tsx
└── theme/                # antd ConfigProvider token setup
    └── index.ts
```

#### Test File Location

**Rule:** Tests are co-located with the file they test.

```
services/calculation-engine/tm.calculator.ts
services/calculation-engine/tm.calculator.test.ts   ✅

__tests__/tm.calculator.test.ts                      ❌ (don't do this)
```

Exception: E2E tests live in `packages/e2e/` (Playwright, separate package).

---

### Format Patterns

#### API Response Formats

**Success response — single resource:**
```json
{ "data": { "id": "...", "name": "..." } }
```

**Success response — collection:**
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "pageSize": 20 }
}
```

**Success response — action (no body):**
```json
{ "success": true }
```

**Error response (all errors):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "employeeId", "message": "Not found in system" }]
  }
}
```

**Standard error codes:**

| Code | HTTP Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema failure, business rule violation |
| `UPLOAD_REJECTED` | 422 | Atomic upload validation failure |
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Valid session, insufficient role |
| `NOT_FOUND` | 404 | Resource not found, expired/revoked link |
| `CONFLICT` | 409 | Duplicate resource (e.g., duplicate employee ID) |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

**Anti-pattern:** Never return `200 OK` with an error body. HTTP status codes must accurately reflect the outcome.

#### Data Format Rules

| Data type | API format | Example |
|---|---|---|
| Dates/timestamps | ISO 8601 UTC string | `"2026-02-23T14:30:00.000Z"` |
| Currency amounts | Integer paise (₹ × 100) in API; formatted in frontend | `8400000` = ₹84,000 |
| Percentages | Decimal (0–1 range) in API; formatted as % in frontend | `0.871` = 87.1% |
| JSON field names | `camelCase` in API responses | `annualCtc`, `projectId` |
| Booleans | `true`/`false` only — never `1`/`0` or `"yes"`/`"no"` | |
| Null values | `null` — never `""` or `undefined` for absent optional fields | |

**Indian currency formatting (frontend only):**
```typescript
// Always use this utility — never ad-hoc toLocaleString calls
formatCurrency(8400000) // → "₹84,000" (paise → rupees, Indian grouping)
formatPercent(0.871)    // → "87.1%"
```

---

### Communication Patterns

#### SSE Event Naming (Upload Progress)

SSE events emitted by `GET /api/v1/uploads/:uploadId/progress`:

| Event name | Payload | When |
|---|---|---|
| `parsing` | `{ step: "parsing", message: "Parsing file..." }` | File received, xlsx parsing started |
| `validating` | `{ step: "validating", total: N, processed: N }` | Row-by-row validation in progress |
| `rejected` | `{ step: "rejected", errors: [{row, field, message}] }` | Atomic validation failure |
| `recalculating` | `{ step: "recalculating", message: "Recalculating profitability..." }` | Validation passed, recalc started |
| `complete` | `{ step: "complete", recordsImported: N, period: "2026-02" }` | All done |
| `error` | `{ step: "error", message: "..." }` | Unexpected server error |

**Rule:** SSE events are named in `lowercase` only. Never `PascalCase` or `camelCase` for SSE event names.

#### TanStack Query Key Conventions

Query keys follow a hierarchical array structure:

```typescript
// Pattern: [resource, scope, filters]
['projects']                              // all projects
['projects', projectId]                   // single project
['projects', projectId, 'timesheets']     // project's timesheets
['dashboards', 'executive', { period }]  // executive dashboard with filter
['auth', 'me']                           // current user
['employees']                            // all employees
['calculation-snapshots', entityId, figureType, period]  // ledger drawer
```

**Rule:** Query keys must be defined as constants in the relevant `*.api.ts` file — never inline in components.

```typescript
// ✅ In projects.api.ts
export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
}

// ❌ Never inline in a component
useQuery({ queryKey: ['projects', id], ... })
```

---

### Process Patterns

#### RBAC Enforcement Pattern

Every protected route applies middleware in this order:
```typescript
router.get('/projects',
  authMiddleware,                            // 1. Extract + validate JWT → attach req.user
  rbacMiddleware(['admin', 'finance']),      // 2. Check role
  asyncHandler(async (req, res) => {
    const projects = await projectService.getAll(req.user);  // 3. Scoped service call
    res.json({ data: projects });
  })
);
```

**RBAC scoping in service layer:**
```typescript
// Every service function that returns data accepts req.user and applies scoping internally
async function getAll(user: AuthUser): Promise<Project[]> {
  const where: Prisma.ProjectWhereInput = { status: 'ACTIVE' };
  if (user.role === 'DELIVERY_MANAGER') where.deliveryManagerId = user.id;
  if (user.role === 'DEPT_HEAD') where.departmentId = user.departmentId;
  return prisma.project.findMany({ where });
}
```

**Anti-pattern:** Never apply data scoping in the route handler. Scoping lives in the service layer only.

#### Calculation Engine Calling Pattern

The calculation engine is a pure function module — no database calls, no HTTP calls:

```typescript
// ✅ Correct: engine takes data, returns results (all values in paise)
const result = calculateTm({
  billedHours: 160,
  billingRate: 525000,   // paise
  employeeCosts: [{ hours: 160, costPerHour: 31200 }]  // paise
});
// → { revenue: 84000000, cost: 4992000, profit: 79008000, marginPercent: 0.9406 }

// ❌ Never: engine fetches its own data
async function calculateTm(projectId: string) {
  const project = await prisma.project.findUnique(...)  // FORBIDDEN
}
```

All values in and out of the engine are **integer paise**. Conversion happens at the service layer boundary.

#### Upload Validation Flow Pattern

```typescript
// Atomic upload (timesheet/revenue): validate ALL rows before inserting ANY
async function processTimesheetUpload(file: Buffer, user: AuthUser) {
  const rows = parseExcel(file);               // 1. Parse
  const errors = await validateAllRows(rows);  // 2. Validate all
  if (errors.length > 0) {
    await createAuditLog('UPLOAD_REJECTED', user.id);
    throw new UploadRejectedError(errors);     // 3. Reject entire file
  }
  await prisma.$transaction(async (tx) => {   // 4. Insert all in transaction
    await tx.timesheetEntry.createMany({ data: rows });
    await tx.uploadEvent.create({ ... });
  });
  await triggerRecalculation();               // 5. Recalculate after commit
}

// Row-level upload (salary): insert valid rows, collect invalid
async function processSalaryUpload(file: Buffer, user: AuthUser) {
  const rows = parseExcel(file);
  const { valid, invalid } = await validateRowsIndividually(rows);
  await prisma.employee.createMany({ data: valid });
  return { imported: valid.length, failed: invalid };
}
```

**Rule:** Never mix atomic and row-level validation patterns between upload types.

#### Express Error Handling Pattern

All async route handlers use `asyncHandler` — never try/catch in route handlers:

```typescript
// ✅ Correct
router.post('/upload', asyncHandler(async (req, res) => {
  const result = await uploadService.process(req.file, req.user);
  res.json({ data: result });
}));

// ❌ Never
router.post('/upload', async (req, res, next) => {
  try { ... } catch (e) { next(e); }
});
```

Global error middleware formats all thrown errors into the standard error response shape.

#### Frontend Loading State Pattern

Use TanStack Query's built-in states — never manually manage `isLoading` booleans:

```typescript
// ✅ Correct
const { data, isLoading, isError, error } = useQuery({
  queryKey: projectKeys.all,
  queryFn: () => projectsApi.getAll(),
});
if (isLoading) return <Skeleton />;
if (isError) return <ErrorState message={error.message} />;
return <ProjectTable data={data} />;

// ❌ Never
const [isLoading, setIsLoading] = useState(false);
```

---

### Enforcement Guidelines

**All AI agents MUST:**
1. Use `snake_case` in Prisma schema, `camelCase` in TypeScript, `camelCase` in JSON responses
2. Store currency as integer paise in the database and API; format to ₹ only in the frontend
3. Store percentages as decimals (0–1) in the database and API; format as % only in the frontend
4. Call Prisma only from service layer functions — never from route handlers
5. Apply RBAC data scoping inside service functions — never in route handlers
6. Use `asyncHandler` wrapper for all async Express route handlers
7. Keep the calculation engine as pure functions with no database or HTTP calls
8. Define TanStack Query keys as constants in `*.api.ts` files — never inline
9. Use ISO 8601 UTC strings for all date/time values in API requests and responses
10. Return `null` (never `""` or `undefined`) for absent optional fields in API responses

**Pattern verification:** Each story's acceptance criteria includes a pattern compliance check. Code review must verify: naming conventions, layer separation (routes → services → Prisma), RBAC scoping location, and currency/percentage representation.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ipis/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions: lint → test → build → deploy
├── packages/
│   ├── shared/                       # Shared Zod schemas + TypeScript types + utils
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── auth.schema.ts
│   │       │   ├── employee.schema.ts
│   │       │   ├── project.schema.ts
│   │       │   ├── upload.schema.ts
│   │       │   ├── dashboard.schema.ts
│   │       │   └── index.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── utils/
│   │           ├── currency.ts       # formatCurrency(paise) → "₹84,000"
│   │           ├── percent.ts        # formatPercent(0.871) → "87.1%"
│   │           └── date.ts
│   │
│   ├── backend/                      # ExpressJS 5 + TypeScript + Prisma
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts              # Entry point
│   │       ├── app.ts                # Express app factory
│   │       ├── routes/
│   │       │   ├── auth.routes.ts    # POST /login, POST /logout, GET /auth/me,
│   │       │   │                     # POST /auth/forgot-password, POST /auth/reset-password
│   │       │   ├── users.routes.ts   # CRUD /users (Admin only)
│   │       │   ├── employees.routes.ts
│   │       │   ├── projects.routes.ts# CRUD + /approve + /reject + /completion + /team-members
│   │       │   ├── uploads.routes.ts # POST timesheets + billing; GET :id/progress (SSE);
│   │       │   │                     # GET history
│   │       │   ├── dashboards.routes.ts
│   │       │   ├── ledger.routes.ts  # GET /ledger/:entityType/:entityId/:figureType
│   │       │   ├── reports.routes.ts # export-pdf, share, GET shared/:token (public)
│   │       │   ├── audit.routes.ts   # GET /audit-logs (Admin only)
│   │       │   ├── config.routes.ts  # GET/PUT /config (Admin only)
│   │       │   └── index.ts
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts
│   │       │   ├── rbac.middleware.ts
│   │       │   ├── error.middleware.ts
│   │       │   ├── upload.middleware.ts
│   │       │   └── async-handler.ts
│   │       ├── services/
│   │       │   ├── calculation-engine/
│   │       │   │   ├── index.ts
│   │       │   │   ├── tm.calculator.ts
│   │       │   │   ├── tm.calculator.test.ts
│   │       │   │   ├── fixed-cost.calculator.ts
│   │       │   │   ├── fixed-cost.calculator.test.ts
│   │       │   │   ├── amc.calculator.ts
│   │       │   │   ├── amc.calculator.test.ts
│   │       │   │   ├── infrastructure.calculator.ts
│   │       │   │   ├── infrastructure.calculator.test.ts
│   │       │   │   └── types.ts
│   │       │   ├── auth.service.ts + auth.service.test.ts
│   │       │   ├── user.service.ts + user.service.test.ts
│   │       │   ├── employee.service.ts + employee.service.test.ts
│   │       │   ├── project.service.ts + project.service.test.ts
│   │       │   ├── upload.service.ts + upload.service.test.ts
│   │       │   ├── snapshot.service.ts + snapshot.service.test.ts
│   │       │   ├── dashboard.service.ts + dashboard.service.test.ts
│   │       │   ├── ledger.service.ts + ledger.service.test.ts
│   │       │   ├── report.service.ts + report.service.test.ts
│   │       │   └── audit.service.ts + audit.service.test.ts
│   │       └── lib/
│   │           ├── prisma.ts         # Prisma client singleton
│   │           ├── email.ts          # AWS SES wrapper
│   │           ├── pdf.ts            # Puppeteer wrapper
│   │           ├── sse.ts            # In-process EventEmitter for SSE
│   │           ├── excel.ts          # xlsx (SheetJS) parse helpers
│   │           ├── errors.ts         # Custom error classes
│   │           └── config.ts         # Typed env var access
│   │
│   ├── frontend/                     # React 19 + Vite 7 + TypeScript + antd v6
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx              # QueryClientProvider + antd ConfigProvider
│   │       ├── App.tsx
│   │       ├── theme/index.ts        # antd v6 ConfigProvider tokens
│   │       ├── router/
│   │       │   ├── index.tsx
│   │       │   └── guards.tsx        # RoleGuard, AuthGuard (UX only)
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   ├── useUploadProgress.ts  # EventSource SSE hook
│   │       │   └── useRoleAccess.ts
│   │       ├── services/
│   │       │   ├── api.ts            # fetch wrapper
│   │       │   ├── auth.api.ts
│   │       │   ├── users.api.ts
│   │       │   ├── employees.api.ts
│   │       │   ├── projects.api.ts
│   │       │   ├── uploads.api.ts
│   │       │   ├── dashboards.api.ts
│   │       │   ├── ledger.api.ts
│   │       │   ├── reports.api.ts
│   │       │   ├── audit.api.ts
│   │       │   └── config.api.ts
│   │       ├── components/
│   │       │   ├── LedgerDrawer/
│   │       │   │   ├── LedgerDrawer.tsx
│   │       │   │   ├── LedgerDrawer.test.tsx
│   │       │   │   └── index.ts
│   │       │   ├── MarginHealthBadge.tsx + .test.tsx
│   │       │   ├── AtRiskKPITile.tsx
│   │       │   ├── UploadConfirmationCard.tsx + .test.tsx
│   │       │   ├── UploadHistoryLog.tsx
│   │       │   ├── DataPeriodIndicator.tsx
│   │       │   ├── ProjectStatusBadge.tsx
│   │       │   └── ErrorState.tsx
│   │       ├── pages/
│   │       │   ├── auth/
│   │       │   │   ├── Login.tsx
│   │       │   │   ├── ForgotPassword.tsx
│   │       │   │   └── ResetPassword.tsx
│   │       │   ├── dashboards/
│   │       │   │   ├── ExecutiveDashboard.tsx   # FR36
│   │       │   │   ├── ProjectDashboard.tsx     # FR37
│   │       │   │   ├── EmployeeDashboard.tsx    # FR38
│   │       │   │   └── DepartmentDashboard.tsx  # FR39
│   │       │   ├── projects/
│   │       │   │   ├── ProjectList.tsx
│   │       │   │   ├── ProjectDetail.tsx
│   │       │   │   └── CreateEditProject.tsx    # FR22 — adaptive per engagement model
│   │       │   ├── employees/
│   │       │   │   ├── EmployeeList.tsx
│   │       │   │   └── CreateEditEmployee.tsx   # FR14/FR15
│   │       │   ├── upload/
│   │       │   │   └── UploadCenter.tsx         # FR17/FR20 — all upload types + history
│   │       │   ├── admin/
│   │       │   │   ├── UserManagement.tsx       # FR5-FR8
│   │       │   │   ├── SystemConfig.tsx         # FR9
│   │       │   │   ├── PendingApprovals.tsx     # FR24/FR40
│   │       │   │   └── AuditLog.tsx             # FR44
│   │       │   └── reports/
│   │       │       └── SharedReport.tsx         # FR42 — public route
│   │       └── assets/
│   │           └── logo.svg
│   │
│   └── e2e/
│       ├── package.json
│       ├── playwright.config.ts
│       └── tests/
│           ├── auth.spec.ts
│           ├── upload-success.spec.ts  # Journey 1
│           ├── upload-failure.spec.ts  # Journey 2
│           ├── salary-upload.spec.ts   # Journey 3
│           ├── project-lifecycle.spec.ts# Journey 4
│           └── portfolio.spec.ts       # Journey 5
│
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml                # Local PostgreSQL for development
├── .gitignore
├── .env.example
└── README.md
```

### Prisma Schema Key Tables

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Auth + RBAC | `id`, `email`, `password_hash`, `role`, `department_id`, `is_active` |
| `employees` | Salary master | `id`, `employee_code`, `name`, `department_id`, `designation`, `annual_ctc_paise`, `overhead_paise`, `joining_date`, `is_resigned` |
| `projects` | All 4 engagement models | `id`, `name`, `client`, `engagement_model`, `status`, `delivery_manager_id`, `contract_value_paise`, `completion_percent`, `start_date`, `end_date` |
| `employee_projects` | Team roster (FR28) | `project_id`, `employee_id`, `role`, `assigned_at` |
| `timesheet_entries` | Uploaded timesheet rows | `id`, `upload_event_id`, `employee_id`, `project_id`, `billable_hours`, `non_billable_hours`, `period_month`, `period_year` |
| `billing_records` | Revenue/billing rows | `id`, `upload_event_id`, `project_id`, `invoice_amount_paise`, `invoice_date` |
| `upload_events` | Upload history + provenance | `id`, `upload_type`, `uploaded_by_id`, `period_month`, `period_year`, `records_imported`, `status`, `created_at` |
| `calculation_snapshots` | Ledger Drawer source | `id`, `recalculation_run_id`, `entity_type`, `entity_id`, `figure_type`, `period_month`, `period_year`, `value_paise`, `breakdown_json`, `engine_version`, `calculated_at` |
| `recalculation_runs` | Groups snapshot writes | `id`, `upload_event_id`, `projects_processed`, `completed_at` |
| `audit_logs` | Immutable event log | `id`, `event_type`, `actor_id`, `entity_type`, `entity_id`, `metadata_json`, `created_at` |
| `shared_report_links` | Shareable link tokens | `id`, `token`, `report_snapshot_json`, `created_by_id`, `expires_at`, `is_revoked` |
| `system_config` | Working hours, thresholds | `id`, `standard_monthly_hours`, `healthy_margin_threshold`, `at_risk_margin_threshold` |

### Architectural Boundaries

**API Boundaries:**
- All authenticated endpoints require valid JWT in httpOnly cookie
- RBAC middleware sits between auth middleware and route handler on every protected route
- `GET /api/v1/reports/shared/:token` is the only unauthenticated endpoint
- SSE endpoint `GET /api/v1/uploads/:uploadId/progress` requires auth (Finance/Admin only)
- All responses follow the standard `{ data }` / `{ error }` envelope

**Service Boundaries:**
- Calculation engine is a pure function boundary — no I/O; inputs/outputs are plain TypeScript objects in paise
- Upload service owns the SSE event emitter — emits progress events consumed by the SSE endpoint
- Snapshot service is called only by upload service after successful recalculation commit
- Audit service exposes append-only methods — no update or delete operations anywhere

**Data Boundaries:**
- Prisma client instantiated once as singleton in `lib/prisma.ts`
- Only service files import Prisma — middleware and routes never import Prisma directly
- `calculation_snapshots` table written only by `snapshot.service.ts`
- `audit_logs` table has no Prisma update or delete operations

### Requirements to Structure Mapping

| FR Category | Backend location | Frontend location |
|---|---|---|
| Auth & Session (FR1–FR4, FR49–FR50) | `routes/auth.routes.ts` · `services/auth.service.ts` · `middleware/auth.middleware.ts` | `pages/auth/` · `hooks/useAuth.ts` |
| User & Role Management (FR5–FR10) | `routes/users.routes.ts` · `services/user.service.ts` · `routes/config.routes.ts` | `pages/admin/UserManagement.tsx` · `pages/admin/SystemConfig.tsx` |
| Employee Data (FR11–FR16) | `routes/employees.routes.ts` · `services/employee.service.ts` | `pages/employees/` · `pages/upload/UploadCenter.tsx` |
| Data Ingestion (FR17–FR21) | `routes/uploads.routes.ts` · `services/upload.service.ts` · `lib/sse.ts` · `lib/excel.ts` | `pages/upload/UploadCenter.tsx` · `hooks/useUploadProgress.ts` · `components/UploadConfirmationCard.tsx` |
| Project Management (FR22–FR28, FR45–FR47) | `routes/projects.routes.ts` · `services/project.service.ts` · `lib/email.ts` | `pages/projects/` · `pages/admin/PendingApprovals.tsx` |
| Calculation Engine (FR29–FR35) | `services/calculation-engine/` · `services/snapshot.service.ts` | `components/LedgerDrawer/` · `services/ledger.api.ts` |
| Dashboards (FR36–FR40) | `routes/dashboards.routes.ts` · `services/dashboard.service.ts` | `pages/dashboards/` · `components/MarginHealthBadge.tsx` · `components/AtRiskKPITile.tsx` |
| Export, Share & Audit (FR41–FR44) | `routes/reports.routes.ts` · `services/report.service.ts` · `lib/pdf.ts` · `services/audit.service.ts` | `pages/admin/AuditLog.tsx` · `pages/reports/SharedReport.tsx` |

### Data Flow

```
Excel Upload → multer (middleware) → upload.service
  → excel.ts (parse) → validate (batch DB lookup via Prisma)
  → prisma.$transaction (insert rows + upload_event)
  → SSE events via sse.ts (progress to frontend EventSource)
  → calculation-engine (pure functions, per project, all in paise)
  → snapshot.service (write calculation_snapshots + recalculation_run)
  → audit.service (write audit_log entry)
  → SSE "complete" event → frontend invalidates TanStack Query cache
  → dashboard.service (RBAC-scoped reads) → dashboard API response
  → ledger.service (reads calculation_snapshots) → drawer API response
```

### Development Workflow Integration

**Local development:**
```bash
pnpm install                     # install all workspace deps
# PostgreSQL must be running on localhost:5432 (see options below)
pnpm --filter backend migrate    # run Prisma migrations
pnpm --filter backend dev        # tsx --watch (port 3000)
pnpm --filter frontend dev       # Vite HMR (port 5173, proxies /api → 3000)
```

**PostgreSQL setup (choose one):**
- **Option A — Native install (recommended):** Install PostgreSQL locally, create user `ipis` with password `ipis_dev` and database `ipis_dev`. Grant CREATEDB permission for Prisma shadow database.
- **Option B — Docker Compose:** `docker-compose up -d` (uses the included `docker-compose.yml`)

Either option results in the same connection URL: `postgresql://ipis:ipis_dev@localhost:5432/ipis_dev`

**CI/CD pipeline (GitHub Actions):**
```
Push to any branch:  pnpm install → typecheck → lint → vitest
Push to main:        above + docker build → deploy to App Runner (staging)
Manual approval:     deploy to App Runner (production)
```

## Architecture Validation

### Coherence Validation

All core architectural decisions were cross-checked for compatibility. No conflicts found.

| Decision pair | Compatible? | Notes |
|---|---|---|
| JWT httpOnly cookie + React Router guards | ✅ Yes | Guards read from `/auth/me` endpoint, never from cookie directly |
| SSE progress + TanStack Query cache invalidation | ✅ Yes | SSE `complete` event triggers `queryClient.invalidateQueries()` — clean handoff |
| Prisma atomic transactions + row-level salary model | ✅ Yes | Distinct code paths; atomic uses `prisma.$transaction`, row-level uses `createMany` |
| Puppeteer PDF + App Runner | ✅ Yes (with caveat) | Non-alpine base image required; image size ~300-400MB; monitor App Runner container limits |
| Calculation snapshots + Ledger Drawer ≤1.5s NFR | ✅ Yes | Snapshots are pre-written at recalculation time; Drawer is a fast indexed read |
| pino redact + audit log writes | ✅ Yes | Redaction only applies to log output, not DB writes; audit log captures full event metadata |
| Zod shared schemas + frontend/backend validation | ✅ Yes | `shared/` package consumed by both; same schema validates request body and API response |
| AWS SES email + App Runner VPC | ✅ Yes | SES is a public AWS endpoint; VPC egress to SES is standard |
| CORS restriction + public shareable link endpoint | ✅ Yes | Shareable link endpoint is token-authenticated, not session-authenticated; CORS must allow it |

**Verdict:** All decisions are internally consistent and mutually reinforcing.

---

### Gap Analysis

Four data model gaps were identified and resolved. Two minor implementation gaps were noted.

#### Critical / Important Gaps — RESOLVED

**Gap 1 — Missing `departments` table**

Multiple tables reference `department_id` as a foreign key (`users.department_id`, `employees.department_id`) but no `departments` table was defined in the Prisma schema listing.

Resolution: Add `departments` table.

```
departments
  id            UUID PK
  name          VARCHAR(100) NOT NULL UNIQUE
  head_user_id  UUID FK → users.id (nullable)
  created_at    TIMESTAMP
```

**Gap 2 — Missing `password_reset_tokens` table**

FR49 (password reset flow) requires storing short-lived tokens issued via forgot-password email. No table existed for this.

Resolution: Add `password_reset_tokens` table.

```
password_reset_tokens
  id          UUID PK
  user_id     UUID FK → users.id
  token_hash  VARCHAR(255) NOT NULL  -- store hash, not plaintext
  expires_at  TIMESTAMP NOT NULL
  used_at     TIMESTAMP (nullable)   -- set on redemption; prevents reuse
  created_at  TIMESTAMP
```

**Gap 3 — Missing `billing_rate_paise` on `employee_projects`**

T&M revenue calculation requires `Revenue = Billed hours × Billing Rate`. The billing rate is per-employee-per-project and was absent from the schema. Without it, the T&M calculator has no rate to apply.

Resolution: Add nullable column `billing_rate_paise BIGINT` to `employee_projects`. Nullable because only T&M projects require it; Fixed/AMC/Infrastructure projects do not.

**Gap 4 — Missing `is_billable` on `employees`**

The Employee Dashboard Billable % metric (FR38) and employee-wise profitability calculation require knowing whether an employee is billable or non-billable. The raw requirements explicitly list "Billable / Non-Billable" as an Employee Master field. This column was absent from the `employees` table definition.

Resolution: Add `is_billable BOOLEAN NOT NULL DEFAULT true` to `employees`.

---

#### Minor Gaps — NOTED

**Minor 1 — CORS middleware not specified**

The NFR specifies CORS restriction to same-origin for the internal app. The `middleware/` directory listing should include a `cors.middleware.ts` that configures `cors` npm package with explicit `origin` allowlist (frontend URL) for the Express app. No schema or structural change required — implementation-level detail.

**Minor 2 — Ledger Drawer export endpoint not listed**

The UX spec references an export action within the Ledger Drawer (FR41 — export calculation breakdown). The `reports.routes.ts` file handles PDF export but the Ledger Drawer's per-figure export was not explicitly listed. The route `GET /api/v1/ledger/:entityType/:entityId/:figureType/export` should be added to `ledger.routes.ts`. No structural change required.

---

### Updated Prisma Schema Tables (Post-Gap Fixes)

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Auth + RBAC | `id`, `email`, `password_hash`, `role`, `department_id`, `is_active` |
| `departments` | ⭐ NEW — Dept master | `id`, `name`, `head_user_id` |
| `password_reset_tokens` | ⭐ NEW — FR49 reset flow | `id`, `user_id`, `token_hash`, `expires_at`, `used_at` |
| `employees` | Salary master | `id`, `employee_code`, `name`, `department_id`, `designation`, `annual_ctc_paise`, `overhead_paise`, `joining_date`, `is_billable` ⭐, `is_resigned` |
| `projects` | All 4 engagement models | `id`, `name`, `client`, `engagement_model`, `status`, `delivery_manager_id`, `contract_value_paise`, `completion_percent`, `start_date`, `end_date` |
| `employee_projects` | Team roster (FR28) | `project_id`, `employee_id`, `role`, `billing_rate_paise` ⭐, `assigned_at` |
| `timesheet_entries` | Uploaded timesheet rows | `id`, `upload_event_id`, `employee_id`, `project_id`, `billable_hours`, `non_billable_hours`, `period_month`, `period_year` |
| `billing_records` | Revenue/billing rows | `id`, `upload_event_id`, `project_id`, `invoice_amount_paise`, `invoice_date` |
| `upload_events` | Upload history + provenance | `id`, `upload_type`, `uploaded_by_id`, `period_month`, `period_year`, `records_imported`, `status`, `created_at` |
| `calculation_snapshots` | Ledger Drawer source | `id`, `recalculation_run_id`, `entity_type`, `entity_id`, `figure_type`, `period_month`, `period_year`, `value_paise`, `breakdown_json`, `engine_version`, `calculated_at` |
| `recalculation_runs` | Groups snapshot writes | `id`, `upload_event_id`, `projects_processed`, `completed_at` |
| `audit_logs` | Immutable event log | `id`, `event_type`, `actor_id`, `entity_type`, `entity_id`, `metadata_json`, `created_at` |
| `shared_report_links` | Shareable link tokens | `id`, `token`, `report_snapshot_json`, `created_by_id`, `expires_at`, `is_revoked` |
| `system_config` | Working hours, thresholds | `id`, `standard_monthly_hours`, `healthy_margin_threshold`, `at_risk_margin_threshold` |

_(⭐ = added or amended during gap analysis)_

---

### Architecture Completeness Checklist

| Area | Status | Notes |
|---|---|---|
| Stack decisions (language, runtime, ORM, UI) | ✅ Complete | TypeScript, Node 20, Prisma, antd v6 |
| Authentication & security model | ✅ Complete | jose JWT, httpOnly cookie, bcrypt, pino redact |
| RBAC design | ✅ Complete | 5 roles, middleware + service-layer scoping |
| Upload pipeline design | ✅ Complete | Atomic (timesheet/revenue) + row-level (salary) |
| Calculation engine design | ✅ Complete | Pure function module, all 4 models, paise |
| Ledger Drawer data strategy | ✅ Complete | Persist intermediates at recalculation time |
| Upload progress feedback | ✅ Complete | SSE (EventSource), not TanStack Query |
| PDF export infrastructure | ✅ Complete | Puppeteer, App Runner caveat noted |
| Email delivery | ✅ Complete | AWS SES |
| Shareable links | ✅ Complete | UUID tokens, 30-day, snapshot data, revocable |
| Audit trail | ✅ Complete | Append-only audit_logs, no UPDATE/DELETE |
| Project directory structure | ✅ Complete | Full tree to file level |
| Prisma schema tables | ✅ Complete | 14 tables, gap fixes applied |
| Naming conventions | ✅ Complete | DB, API, TypeScript, React |
| API response shapes | ✅ Complete | Standard envelope + error codes |
| Data format rules | ✅ Complete | Paise, decimal %, ISO 8601 UTC |
| Implementation sequence | ✅ Complete | 15-step dependency order |
| Infrastructure & CI/CD | ✅ Complete | App Runner, RDS, GitHub Actions |
| Requirements to structure mapping | ✅ Complete | All 8 FR categories mapped |

**Overall status: READY FOR IMPLEMENTATION — High confidence.**

All 50 functional requirements and 16 non-functional requirements have structural homes in the architecture. No open architectural questions remain. Gap analysis complete with all critical gaps resolved.

---

### Implementation Handoff Guidelines

**For AI development agents executing stories:**

1. This document is the single source of truth for all technical decisions. If a story's implementation conflicts with any decision here, flag it before writing code.

2. The Implementation Patterns & Consistency Rules section is mandatory reading before any code is written. Pattern violations must be caught in code review.

3. The calculation engine (step 6 in the implementation sequence) must be fully TDD'd before the upload pipeline calls it. No exceptions.

4. Every story that adds a protected API endpoint must include an RBAC test as an acceptance criterion.

5. The `departments` table and `password_reset_tokens` table gaps are resolved in architecture — Prisma schema implementation must include both tables in the initial migration.

6. Currency and percentage values: paise in DB and API, formatted in frontend only. This rule applies without exception across all 50 FRs.

7. The antd version is v6.3.0 (not v5 as referenced in the UX spec). All component implementations must use v6 APIs.

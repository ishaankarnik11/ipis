# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IPIS — Internal Profitability Intelligence System.** A full-stack business intelligence platform for tracking project profitability, resource utilization, employee costs, and financial metrics across departments. Serves 5 roles: Admin, Finance, HR, Delivery Manager, Department Head.

## Tech Stack

- **Monorepo:** pnpm workspaces (`packages/backend`, `packages/frontend`, `packages/shared`, `packages/e2e`)
- **Backend:** Express 5, Prisma 6 (PostgreSQL), JWT auth via HTTP-only cookies, Zod validation, Vitest
- **Frontend:** React 19, Vite, Ant Design 6, TanStack React Query, react-router 7, Vitest + Testing Library
- **Shared:** Zod schemas, TypeScript types, utility functions (currency/percent formatting)
- **E2E:** Playwright with role-based test accounts and isolated test database

## Build & Dev Commands

```bash
pnpm dev                                  # Start backend (port 3000) + frontend (port 5173)
pnpm test                                 # Run all unit/integration tests
pnpm typecheck                            # tsc --noEmit across all packages
pnpm lint                                 # ESLint across all packages

# Package-specific
pnpm --filter backend test                # Backend tests only (needs PostgreSQL)
pnpm --filter frontend test               # Frontend tests only (no DB needed)
pnpm --filter backend test -- --testPathPattern="dashboard.service"  # Single test file

# Database
pnpm --filter backend migrate:deploy      # Apply migrations
pnpm --filter backend db:seed             # Seed dev data
pnpm --filter backend db:studio           # Prisma Studio (port 5555)
pnpm --filter backend db:generate         # Regenerate Prisma client

# E2E (requires running app + separate test DB: ipis_test_e2e)
pnpm test:e2e
```

## Architecture

### Backend Pattern: Route → Middleware → Service → Prisma

```
routes/*.routes.ts     → authMiddleware → rbacMiddleware(['ROLE']) → asyncHandler(handler)
services/*.service.ts  → Business logic, Prisma queries, audit logging
lib/                   → JWT, Excel (xlsx), PDF (Puppeteer), SSE, logger (pino)
middleware/            → auth, rbac, validation (Zod), error handling, file upload (Multer)
```

All API responses follow `{ data, meta }` structure. Routes registered at `/api/v1/*` in `routes/index.ts`.

### Frontend Pattern: Page → API Service → React Query

```
pages/                 → Route-level components (admin/, dashboards/, projects/, upload/)
components/            → Reusable UI (modals, badges, tables)
services/*.api.ts      → API functions + query key factories (e.g., projectKeys.all())
hooks/useAuth.ts       → Auth state via React Query, role-based landing pages
router/                → Guards: AuthGuard, LoginGuard, RoleGuard, ChangePasswordGuard
```

### Calculation Engine (`services/calculation-engine/`)

Modular calculators per engagement model (T&M, Fixed Cost, AMC, Infrastructure). Results persisted as `CalculationSnapshot` records with entity type, figure type, period, value (paise), and breakdown JSON. Dashboards read from snapshots, never recalculate at query time.

### Key Conventions

- **Monetary values:** BigInt in paise (₹1 = 100 paise). Use `formatCurrency()` for display.
- **IDs:** UUID v4 everywhere.
- **Auth:** JWT in HTTP-only cookie `ipis_token`, 2-hour sliding expiry. RBAC via middleware.
- **Roles:** `ADMIN | FINANCE | HR | DELIVERY_MANAGER | DEPT_HEAD`
- **Error classes:** `NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`, `UploadRejectedError`
- **Soft operations:** No hard deletes — use `isActive`, `isResigned` flags.
- **Tests:** Backend tests need PostgreSQL running. Frontend tests use jsdom mocks. Each test file creates isolated fixtures.
- **Prisma selects:** Use projection objects (`const FIELD_SELECT = {...}`) to shape responses.

### Database Models (Prisma)

Core: `User`, `Department`, `Employee`, `Project`, `EmployeeProject` (junction with billing rates), `ProjectRole`
Financial: `TimesheetEntry`, `BillingRecord`, `CalculationSnapshot`, `RecalculationRun`
System: `UploadEvent` (with `errorSummary` JSON), `AuditEvent`, `SystemConfig`, `SharedReportToken`

## BMAD Method Integration

This project uses **BMad Method v6** for AI-driven agile development. All BMAD artifacts live under `_bmad/` and `_bmad-output/`.

```
/bmad-help              # Context-aware help
/bmad-dev-story         # Execute a story (TDD-driven)
/bmad-create-story      # Prepare a story with full dev context
/bmad-sprint-planning   # Generate sprint tracking from epics
/bmad-code-review       # Adversarial code review
/bmad-party-mode        # Multi-agent discussion
```

**Artifacts:**
- `_bmad-output/planning-artifacts/` — PRDs, briefs, research
- `_bmad-output/implementation-artifacts/` — Stories, sprint plans, architecture
- `docs/` — Project knowledge base

## Implementation Gate — Sprint Status (MANDATORY)

After completing ANY story implementation — whether via `/bmad-dev-story`, a direct implementation plan, ad-hoc coding, or any other method — you MUST update `_bmad-output/implementation-artifacts/sprint-status.yaml` to reflect the current story status (`in-progress` while working, `review` when implementation is complete and ready for code review). This applies regardless of which workflow or agent was used. Skipping this step is a process violation.


Add under a ## Testing section at the top level of CLAUDE.md\n\nAfter any code changes, always run the full test suite and fix any failing tests before marking work as complete. Pay special attention to mock updates when adding new API functions.
Add under a ## Workflow Conventions section in CLAUDE.md\n\nWhen updating project tracking (sprint status, story files), always update ALL related status files in the same step as the implementation. Never consider a story complete without updating sprint-status.md.
Add under ## Testing section in CLAUDE.md\n\nWhen fixing frontend tests, be aware of ambiguous text matching. Use getAllByText, getByRole with exact matchers, or data-testid attributes instead of getByText when text appears in multiple DOM elements.
Add under a ## Git section in CLAUDE.md\n\nFor Git authentication issues: prefer Personal Access Tokens (PATs) via HTTPS as the first approach. Don't cycle through SSH keys, gh CLI, and brew if they aren't already configured.
Add under a ## Setup / Onboarding section in CLAUDE.md\n\nWhen providing setup instructions or seed credentials, verify them against the actual seed data files in the codebase before telling the user.
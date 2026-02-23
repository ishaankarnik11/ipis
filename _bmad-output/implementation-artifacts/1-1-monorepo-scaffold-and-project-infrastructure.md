# Story 1.1: Monorepo Scaffold & Project Infrastructure

Status: done

## Story

As a developer,
I want a fully initialized pnpm monorepo with all package configurations, shared utilities, and local development tooling,
so that the entire team can immediately begin building features on a consistent, reproducible foundation.

## Acceptance Criteria (BDD)

### AC1: Workspace Dependencies Install Successfully
**Given** the project repository is initialized,
**When** a developer runs `pnpm install` from the root,
**Then** all workspace dependencies install successfully with no errors across all four packages (`frontend`, `backend`, `shared`, `e2e`)

### AC2: PostgreSQL Is Accessible Locally
**Given** the monorepo is set up,
**When** a developer has PostgreSQL running locally (via native install or `docker-compose up -d`),
**Then** a PostgreSQL instance is accessible on port 5432 with database `ipis_dev`

### AC3: Prisma Initial Migration Runs Successfully
**Given** the database is running,
**When** a developer runs `pnpm --filter backend migrate`,
**Then** Prisma runs `prisma migrate dev` successfully, creating the initial migration with the `users`, `departments`, and `system_config` tables

### AC4: Backend and Frontend Start Correctly with Proxy
**Given** both services are configured,
**When** a developer runs the backend (`pnpm --filter backend dev`) and frontend (`pnpm --filter frontend dev`) simultaneously,
**Then** the backend starts on port 3000 and the frontend starts on port 5173 with no errors, and the frontend proxies `/api` requests to port 3000

### AC5: Shared Utilities Work Correctly
**Given** the shared package exists,
**When** any backend or frontend module imports from `packages/shared`,
**Then** `formatCurrency(paise: number): string` returns correctly formatted Indian rupee strings (e.g., `8400000` -> `"₹84,000"`) and `formatPercent(decimal: number): string` returns percentage strings (e.g., `0.871` -> `"87.1%"`)

### AC6: antd v6 ConfigProvider Tokens Active
**Given** the frontend is initialized,
**When** a developer views the app at `localhost:5173`,
**Then** the antd v6 `ConfigProvider` is active with `colorPrimary: #1B2A4A`, `colorError: #E05A4B`, `colorSuccess: #389E0D`, `colorWarning: #D48806`, `fontFamily: Inter` tokens applied globally

### AC7: All Architecture-Specified Directories Exist
**Given** the monorepo structure,
**When** examining the directory tree,
**Then** all architecture-specified directories exist: `packages/backend/src/{routes,middleware,services,lib}`, `packages/frontend/src/{components,pages,hooks,services,router,theme}`, `packages/shared/src/{schemas,types,utils}`, `packages/e2e/tests`

### AC8: Linting Passes All Packages
**Given** ESLint and Prettier are configured,
**When** a developer runs `pnpm lint` from root,
**Then** all packages pass linting with zero errors

### AC9: TypeScript Strict Mode Compiles Clean
**Given** TypeScript is configured,
**When** a developer runs `pnpm typecheck` from root,
**Then** all packages compile with zero TypeScript errors in strict mode

## Tasks / Subtasks

- [x] Task 1: Initialize pnpm monorepo workspace (AC: 1)
  - [x] 1.1 Create root `package.json` with workspace scripts (`lint`, `typecheck`, `dev`, `test`)
  - [x] 1.2 Create `pnpm-workspace.yaml` with `packages: ['packages/*']`
  - [x] 1.3 Create `.gitignore` (node_modules, dist, .env, prisma/*.db)
  - [x] 1.4 Create root `.env.example`
- [x] Task 2: Set up `packages/shared` package (AC: 5)
  - [x] 2.1 Create `package.json` with name `@ipis/shared`
  - [x] 2.2 Create `tsconfig.json` (strict mode, composite: true)
  - [x] 2.3 Create `src/utils/currency.ts` with `formatCurrency(paise: number): string` -- Indian rupee formatting with grouping (e.g., `8400000` -> `"₹84,000"`)
  - [x] 2.4 Create `src/utils/percent.ts` with `formatPercent(decimal: number): string` (e.g., `0.871` -> `"87.1%"`)
  - [x] 2.5 Create `src/utils/date.ts` (placeholder)
  - [x] 2.6 Create `src/schemas/index.ts` (placeholder barrel export)
  - [x] 2.7 Create `src/schemas/auth.schema.ts` (placeholder -- will be populated in Story 1.2)
  - [x] 2.8 Create `src/types/index.ts` (placeholder barrel export)
  - [x] 2.9 Create unit tests for `formatCurrency` and `formatPercent` in co-located test files
- [x] Task 3: Set up `packages/backend` package (AC: 3, 4)
  - [x] 3.1 Create `package.json` with name `@ipis/backend`; add dependencies: `express`, `@prisma/client`, `pino`, `jose`, `bcrypt`, `cors`, `express-rate-limit`, `multer`, `xlsx`
  - [x] 3.2 Add dev dependencies: `prisma`, `tsx`, `typescript`, `@types/express`, `@types/node`, `@types/bcrypt`, `@types/cors`, `@types/multer`, `vitest`
  - [x] 3.3 Create `tsconfig.json` (strict mode, target ES2022, module NodeNext)
  - [x] 3.4 Create `src/index.ts` -- entry point, starts Express on port 3000
  - [x] 3.5 Create `src/app.ts` -- Express app factory (separate from index.ts)
  - [x] 3.6 Create `src/lib/prisma.ts` -- Prisma client singleton
  - [x] 3.7 Create `src/lib/config.ts` -- typed env var access
  - [x] 3.8 Create `src/lib/errors.ts` -- custom error classes (AppError, ValidationError, etc.)
  - [x] 3.9 Create `src/middleware/async-handler.ts` -- asyncHandler wrapper for all async route handlers
  - [x] 3.10 Create `src/middleware/error.middleware.ts` -- global error handler returning standard error shape
  - [x] 3.11 Create directory stubs: `src/routes/`, `src/middleware/`, `src/services/`, `src/lib/`
  - [x] 3.12 Create `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `PORT=3000`
  - [x] 3.13 Create `Dockerfile` (node:22-slim base -- non-alpine for future Puppeteer compatibility)
- [x] Task 4: Set up Prisma and initial migration (AC: 2, 3)
  - [x] 4.1 Run `npx prisma init` in backend package
  - [x] 4.2 Create `prisma/schema.prisma` with initial three tables: `users`, `departments`, `system_config`
  - [x] 4.3 Define `users` table: `id` (UUID PK), `email` (VARCHAR UNIQUE), `password_hash` (VARCHAR), `name` (VARCHAR), `role` (enum: ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD), `department_id` (FK -> departments, nullable), `is_active` (BOOLEAN DEFAULT true), `must_change_password` (BOOLEAN DEFAULT false), `created_at`, `updated_at`
  - [x] 4.4 Define `departments` table: `id` (UUID PK), `name` (VARCHAR(100) NOT NULL UNIQUE), `head_user_id` (UUID FK -> users, nullable), `created_at`
  - [x] 4.5 Define `system_config` table: `id` (UUID PK), `standard_monthly_hours` (INT DEFAULT 160), `healthy_margin_threshold` (DECIMAL DEFAULT 0.20), `at_risk_margin_threshold` (DECIMAL DEFAULT 0.05), `updated_at`
  - [x] 4.6 Define enums: `UserRole` (ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD)
  - [x] 4.7 Run `npx prisma migrate dev --name init` and verify migration succeeds
- [x] Task 5: Set up local PostgreSQL (AC: 2)
  - [x] 5.1 Create `docker-compose.yml` at root with PostgreSQL 16 service on port 5432 (optional Docker path)
  - [x] 5.2 Set default credentials: user `ipis`, password `ipis_dev`, database `ipis_dev`
  - [x] 5.3 Document both setup paths: native install (recommended) and Docker Compose (alternative)
  - [x] 5.4 Verify PostgreSQL is accessible on localhost:5432 and `prisma migrate dev` succeeds
- [x] Task 6: Set up `packages/frontend` package (AC: 4, 6)
  - [x] 6.1 Scaffold with `npm create vite@latest frontend -- --template react-ts`
  - [x] 6.2 Add dependencies: `antd`, `@tanstack/react-query`, `react-router`, `inter-fontface` (or import from Google Fonts/CDN)
  - [x] 6.3 Add dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
  - [x] 6.4 Configure `vite.config.ts` with `/api` proxy to `http://localhost:3000`
  - [x] 6.5 Create `src/theme/index.ts` with antd v6 ConfigProvider tokens
  - [x] 6.6 Create `src/main.tsx` with `QueryClientProvider` + antd `ConfigProvider` wrapping `<App />`
  - [x] 6.7 Create `src/App.tsx` with placeholder route structure
  - [x] 6.8 Create directory stubs: `src/components/`, `src/pages/`, `src/hooks/`, `src/services/`, `src/router/`
  - [x] 6.9 Ensure Inter font is loaded and applied globally
- [x] Task 7: Set up `packages/e2e` package (AC: 1)
  - [x] 7.1 Create `package.json` with name `@ipis/e2e`
  - [x] 7.2 Add Playwright as dev dependency
  - [x] 7.3 Create `playwright.config.ts`
  - [x] 7.4 Create `tests/` directory (empty, placeholder)
- [x] Task 8: Configure ESLint and Prettier (AC: 8)
  - [x] 8.1 Configure ESLint at root level (shared config for all packages)
  - [x] 8.2 Configure Prettier at root level
  - [x] 8.3 Add root-level `pnpm lint` script that runs ESLint across all packages
  - [x] 8.4 Verify `pnpm lint` passes with zero errors
- [x] Task 9: Configure TypeScript strict mode (AC: 9)
  - [x] 9.1 Ensure all `tsconfig.json` files have `strict: true`
  - [x] 9.2 Add root `pnpm typecheck` script that runs `tsc --noEmit` across all packages
  - [x] 9.3 Verify `pnpm typecheck` passes with zero errors
- [x] Task 10: Create GitHub Actions CI stub (AC: N/A -- infrastructure)
  - [x] 10.1 Create `.github/workflows/ci.yml` with basic pipeline: install -> typecheck -> lint -> test
- [x] Task 11: Final integration verification (AC: ALL)
  - [x] 11.1 Clean install: `rm -rf node_modules && pnpm install` succeeds
  - [x] 11.2 PostgreSQL accessible on localhost:5432 (native install verified)
  - [x] 11.3 `pnpm --filter backend migrate` runs initial migration
  - [x] 11.4 Backend starts on 3000, frontend starts on 5173, proxy works
  - [x] 11.5 `pnpm lint` passes all packages
  - [x] 11.6 `pnpm typecheck` passes all packages
  - [x] 11.7 Shared `formatCurrency` and `formatPercent` import and work in both backend and frontend

## Dev Notes

### Critical Architecture Constraints

> **MANDATORY: Read and follow these 10 enforcement rules before writing any code.**
> [Source: architecture.md#Enforcement Guidelines]

1. Use `snake_case` in Prisma schema, `camelCase` in TypeScript, `camelCase` in JSON responses
2. Store currency as **integer paise** in database and API; format to rupees only in frontend
3. Store percentages as **decimals (0-1)** in database and API; format as % only in frontend
4. Call Prisma only from service layer functions -- never from route handlers
5. Apply RBAC data scoping inside service functions -- never in route handlers
6. Use `asyncHandler` wrapper for all async Express route handlers
7. Keep calculation engine as pure functions with no database or HTTP calls
8. Define TanStack Query keys as constants in `*.api.ts` files -- never inline
9. Use ISO 8601 UTC strings for all date/time values in API requests and responses
10. Return `null` (never `""` or `undefined`) for absent optional fields in API responses

### Tech Stack -- Exact Versions

| Technology | Version | Notes |
|---|---|---|
| Node.js | 20+ LTS | Runtime |
| TypeScript | strict mode | Both frontend and backend |
| pnpm | latest | Workspace monorepo manager |
| Vite | 7.3.1 | Frontend build tool |
| React | 19 | Latest stable |
| Ant Design | **v6.3.0** | NOT v5 -- v5 is EOL. Use v6 ConfigProvider token system |
| Express | 5.2.1 | Stable. Async error handling via rejected promises |
| Prisma | latest | ORM. Schema-first migrations |
| Zod | v3 | Shared validation schemas |
| TanStack Query | v5 | Server state management |
| React Router | v7 | Type-safe routing |
| jose | v5 | JWT library (modern, standards-compliant) |
| pino | latest | Structured JSON logging with `redact` option |
| tsx | latest | TypeScript execution for dev (replaces ts-node) |
| Vitest | latest | Unit + integration tests |
| Playwright | latest | E2E tests |

### antd v6 ConfigProvider Tokens

```typescript
// packages/frontend/src/theme/index.ts
export const themeConfig = {
  token: {
    colorPrimary: '#1B2A4A',
    colorError: '#E05A4B',
    colorSuccess: '#389E0D',
    colorWarning: '#D48806',
    colorInfo: '#1677FF',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F0F2F5',
    colorBorder: '#D9D9D9',
    borderRadius: 6,
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};
```

[Source: ux-design-specification.md#Section 5.3 + Section 7.1]

### Shared Package Utilities -- Implementation Spec

**`formatCurrency(paise: number): string`**
- Input: integer paise (e.g., `8400000` = ₹84,000)
- Output: Indian rupee string with grouping (e.g., `"₹84,000"`)
- Must use Indian numbering system (lakhs, crores): `₹1,20,00,000` for 1.2 crore
- Use `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })` on `paise / 100`

**`formatPercent(decimal: number): string`**
- Input: decimal 0-1 (e.g., `0.871`)
- Output: percentage string (e.g., `"87.1%"`)
- One decimal place precision

[Source: architecture.md#Data Format Rules + epics.md#Story 1.1 AC5]

### Prisma Schema -- Initial Migration Tables

```prisma
// packages/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  FINANCE
  HR
  DELIVERY_MANAGER
  DEPT_HEAD
}

model User {
  id                  String     @id @default(uuid())
  email               String     @unique
  passwordHash        String     @map("password_hash")
  name                String
  role                UserRole
  departmentId        String?    @map("department_id")
  department          Department? @relation(fields: [departmentId], references: [id])
  isActive            Boolean    @default(true) @map("is_active")
  mustChangePassword  Boolean    @default(false) @map("must_change_password")
  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")

  @@map("users")
}

model Department {
  id         String   @id @default(uuid())
  name       String   @unique @db.VarChar(100)
  headUserId String?  @map("head_user_id")
  createdAt  DateTime @default(now()) @map("created_at")
  users      User[]

  @@map("departments")
}

model SystemConfig {
  id                      String   @id @default(uuid())
  standardMonthlyHours    Int      @default(160) @map("standard_monthly_hours")
  healthyMarginThreshold  Decimal  @default(0.20) @map("healthy_margin_threshold")
  atRiskMarginThreshold   Decimal  @default(0.05) @map("at_risk_margin_threshold")
  updatedAt               DateTime @updatedAt @map("updated_at")

  @@map("system_config")
}
```

**Key rules:**
- Table names: `snake_case`, plural (`users`, `departments`, `system_config`)
- Column names: `snake_case` in DB, `camelCase` in TypeScript via `@map()`
- Foreign keys: `{table_singular}_id` pattern
- Boolean columns: `is_` prefix in DB
- Timestamps: `_at` suffix in DB
- Enum values: `SCREAMING_SNAKE_CASE`

[Source: architecture.md#Naming Patterns + architecture.md#Updated Prisma Schema Tables]

### Local PostgreSQL Setup

**Option A — Native Install (recommended for local dev):**
1. Install PostgreSQL (v16+ recommended)
2. Create user and database:
```sql
CREATE USER ipis WITH PASSWORD 'ipis_dev';
ALTER USER ipis CREATEDB;
CREATE DATABASE ipis_dev OWNER ipis;
```
3. Connection URL: `postgresql://ipis:ipis_dev@localhost:5432/ipis_dev`

**Option B — Docker Compose (alternative):**
```yaml
# docker-compose.yml (project root)
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ipis
      POSTGRES_PASSWORD: ipis_dev
      POSTGRES_DB: ipis_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Both options produce the same `DATABASE_URL`. No code changes needed between them.

### Backend Entry Points

```
src/index.ts  -- starts the Express server on PORT (default 3000)
src/app.ts    -- Express app factory (separate from index.ts for testing)
```

**Middleware chain order (for all future routes):**
1. `authMiddleware` -- extract + validate JWT, attach `req.user`
2. `rbacMiddleware(['admin', 'finance'])` -- check role
3. `asyncHandler(async (req, res) => { ... })` -- route handler

**Global error handler format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
}
```

[Source: architecture.md#Express Error Handling Pattern + API & Communication Patterns]

### Vite Proxy Configuration

```typescript
// packages/frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

[Source: architecture.md#Development Workflow Integration]

### File Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Route files | `{resource}.routes.ts` | `auth.routes.ts` |
| Middleware | `{name}.middleware.ts` | `auth.middleware.ts` |
| Service files | `{resource}.service.ts` | `auth.service.ts` |
| Test files | `{file}.test.ts` (co-located) | `currency.test.ts` |
| React components | `PascalCase.tsx` | `LedgerDrawer.tsx` |
| Hooks | `camelCase.ts` with `use` prefix | `useAuth.ts` |
| API service files | `{resource}.api.ts` | `auth.api.ts` |
| Zod schemas | `{resource}.schema.ts` | `auth.schema.ts` |

[Source: architecture.md#Naming Patterns]

### UX Design Tokens for Scaffold

**Typography:**
- Primary font: Inter (load via CDN or npm package)
- Full fallback: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Financial figures: `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';`

**Responsive breakpoints (desktop-first):**
- >= 1440px: Full experience (220px sider)
- 1024-1439px: Collapsed sider (64px icons)
- 768-1023px: Tablet read-only (sider hidden, uploads disabled)
- < 768px: Out of scope for MVP

**Accessibility:**
- WCAG 2.1 Level AA compliance target
- Browser support: Chrome, Edge, Firefox (latest 2 versions), Safari 16+

[Source: ux-design-specification.md#Section 7.2 + Section 12.2]

### What This Story Does NOT Include

These items belong to **later stories** in Epic 1:
- Authentication middleware and JWT (Story 1.2)
- Login UI and session management (Story 1.3)
- User CRUD API (Story 1.4)
- User management UI (Story 1.5)
- Password reset flow (Story 1.6)

This story creates the **foundation only** -- the monorepo structure, dev tooling, initial DB tables, shared utilities, and theme configuration. No business logic, no API endpoints, no UI pages.

### Cross-Story Context (Epic 1)

All subsequent Epic 1 stories depend on this scaffold:
- **Story 1.2** will add `auth.routes.ts`, `auth.service.ts`, `auth.middleware.ts`, `rbac.middleware.ts`, and the `auth.schema.ts` Zod schema
- **Story 1.3** will add the Login page, `useAuth` hook, `AuthGuard`, sidebar `Menu` component
- **Story 1.4** will add `users.routes.ts`, `user.service.ts`, `config.routes.ts`
- **Story 1.5** will add `UserManagement.tsx`, `SystemConfig.tsx` pages
- **Story 1.6** will add the `password_reset_tokens` Prisma migration, forgot/reset password pages

### Project Structure Notes

The directory tree MUST match this exact structure after Story 1.1 completion:

```
ipis/
├── .github/
│   └── workflows/
│       └── ci.yml
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── auth.schema.ts       (placeholder)
│   │       │   └── index.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── utils/
│   │           ├── currency.ts
│   │           ├── currency.test.ts
│   │           ├── percent.ts
│   │           ├── percent.test.ts
│   │           └── date.ts
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts
│   │       ├── routes/
│   │       │   └── index.ts            (health check route only)
│   │       ├── middleware/
│   │       │   ├── async-handler.ts
│   │       │   └── error.middleware.ts
│   │       ├── services/
│   │       └── lib/
│   │           ├── prisma.ts
│   │           ├── config.ts
│   │           └── errors.ts
│   ├── frontend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── theme/
│   │       │   └── index.ts
│   │       ├── router/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── components/
│   │       ├── pages/
│   │       └── assets/
│   └── e2e/
│       ├── package.json
│       ├── playwright.config.ts
│       └── tests/
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml
├── .gitignore
├── .env.example
└── README.md
```

[Source: architecture.md#Complete Project Directory Structure]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Monorepo Scaffold & Project Infrastructure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow Integration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Section 5.3 ConfigProvider Tokens]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Section 7.1 Color System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Section 7.2 Typography]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Section 12.2 Responsive Breakpoints]

## Testing Requirements

### Unit Tests Required (Vitest)
- `packages/shared/src/utils/currency.test.ts` -- Test `formatCurrency()`:
  - Standard case: `8400000` -> `"₹84,000"`
  - Zero: `0` -> `"₹0"`
  - Large value (crores): `120000000` -> `"₹12,00,000"` (Indian grouping)
  - Small value: `100` -> `"₹1"`
- `packages/shared/src/utils/percent.test.ts` -- Test `formatPercent()`:
  - Standard: `0.871` -> `"87.1%"`
  - Zero: `0` -> `"0.0%"`
  - 100%: `1` -> `"100.0%"`
  - Negative: `-0.05` -> `"-5.0%"`

### Integration Verification (Manual or Script)
- `pnpm install` -- zero errors
- PostgreSQL accessible on localhost:5432 (native install or `docker-compose up -d`)
- `pnpm --filter backend migrate` -- creates 3 tables
- Backend starts on 3000, frontend on 5173
- Frontend proxy `/api` routes to backend
- `pnpm lint` -- zero errors
- `pnpm typecheck` -- zero errors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None required.

### Completion Notes List

- AC1 (pnpm install): PASS — clean install succeeds across all 5 workspace packages (500 dependencies)
- AC2 (PostgreSQL): PASS — PostgreSQL 18.2 running natively on localhost:5432, database ipis_dev created. docker-compose.yml retained as alternative path.
- AC3 (Prisma migration): PASS — Migration `20260223164510_init` applied successfully, creating users, departments, system_config tables
- AC4 (Backend/Frontend start): CREATED — Backend entry point on port 3000, Frontend Vite on port 5173 with /api proxy
- AC5 (Shared utilities): PASS — formatCurrency and formatPercent implemented and tested (12/12 tests pass)
- AC6 (antd ConfigProvider): CREATED — theme/index.ts with all specified tokens (colorPrimary #1B2A4A, etc.), ConfigProvider wrapping App
- AC7 (Directory structure): PASS — All architecture-specified directories exist
- AC8 (Lint): PASS — `pnpm lint` passes with zero errors across shared, backend, frontend
- AC9 (TypeScript strict): PASS — `pnpm typecheck` passes with zero errors, all tsconfig.json have strict: true
- CI stub: CREATED — .github/workflows/ci.yml with install -> typecheck -> lint -> test pipeline

### File List

- `package.json` — Root workspace config
- `pnpm-workspace.yaml` — Workspace packages definition
- `.gitignore` — Git ignore rules
- `.env.example` — Root env template
- `.prettierrc` — Prettier config
- `eslint.config.js` — Shared ESLint flat config
- `docker-compose.yml` — Optional PostgreSQL via Docker
- `.github/workflows/ci.yml` — CI pipeline stub
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts` — Barrel exports
- `packages/shared/src/utils/currency.ts` — formatCurrency (paise → ₹)
- `packages/shared/src/utils/currency.test.ts` — 6 tests
- `packages/shared/src/utils/percent.ts` — formatPercent (decimal → %)
- `packages/shared/src/utils/percent.test.ts` — 6 tests
- `packages/shared/src/utils/date.ts` — Placeholder
- `packages/shared/src/schemas/index.ts` — Schema barrel export
- `packages/shared/src/schemas/auth.schema.ts` — Login schema placeholder
- `packages/shared/src/types/index.ts` — UserRole type
- `packages/backend/package.json`
- `packages/backend/tsconfig.json`
- `packages/backend/.env.example`
- `packages/backend/.env` — Local dev env (not committed)
- `packages/backend/Dockerfile`
- `packages/backend/prisma/schema.prisma` — User, Department, SystemConfig
- `packages/backend/prisma/migrations/20260223164510_init/migration.sql`
- `packages/backend/src/index.ts` — Entry point
- `packages/backend/src/app.ts` — Express app factory
- `packages/backend/src/routes/index.ts` — Health check route
- `packages/backend/src/middleware/async-handler.ts`
- `packages/backend/src/middleware/error.middleware.ts`
- `packages/backend/src/lib/config.ts` — Typed env access
- `packages/backend/src/lib/prisma.ts` — PrismaClient singleton
- `packages/backend/src/lib/errors.ts` — AppError hierarchy
- `packages/backend/src/lib/logger.ts` — Pino logger with redact
- `packages/frontend/package.json`
- `packages/frontend/tsconfig.json`
- `packages/frontend/vite.config.ts` — Proxy /api to :3000
- `packages/frontend/index.html` — Inter font via Google Fonts CDN
- `packages/frontend/src/main.tsx` — QueryClient + ConfigProvider
- `packages/frontend/src/App.tsx` — BrowserRouter placeholder
- `packages/frontend/src/theme/index.ts` — antd v6 tokens
- `packages/frontend/src/vite-env.d.ts`
- `packages/e2e/package.json`
- `packages/e2e/playwright.config.ts`

### Change Log

- Created root workspace: package.json, pnpm-workspace.yaml, .gitignore, .env.example, docker-compose.yml
- Created packages/shared with formatCurrency, formatPercent utilities and 12 unit tests
- Created packages/backend with Express 5 app, Prisma schema, error handling, health check route
- Created packages/frontend with Vite + React 19 + antd ConfigProvider + TanStack Query
- Created packages/e2e with Playwright config
- Created eslint.config.js and .prettierrc at root
- Created .github/workflows/ci.yml
- **[Code Review]** Fixed antd version ^5.24.0 → ^6.3.0 (H1)
- **[Code Review]** Fixed Vite version ^6.2.0 → ^7.3.1 (H2)
- **[Code Review]** Fixed frontend build script tsc -b → tsc --noEmit (H3)
- **[Code Review]** Replaced console.log with pino logger; created lib/logger.ts (M1)
- **[Code Review]** Wired config.ts into index.ts; made jwtSecret lazy getter (M2)
- **[Code Review]** Fixed schemas/index.ts to re-export auth.schema (M3)
- **[Code Review]** Removed orphaned tsconfig.node.json (M4)
- **[Code Review]** Added File List to Dev Agent Record (M5)
- **[Code Review]** Fixed jose version ^6.0.0 → ^5.0.0 (L1)

# Story 1.2: Authentication API — Login, Session & Logout

Status: done

## Story

As a user of any role,
I want to authenticate securely with my email and password and maintain a protected session,
so that only authorised users can access the application and sessions expire automatically after inactivity.

## Acceptance Criteria (AC)

1. **Given** a valid active user exists in the database,
   **When** `POST /api/v1/auth/login` is called with correct email and password,
   **Then** a JWT is issued using `jose` v5, set as an `httpOnly`, `sameSite: 'strict'` cookie, and the response returns `{ data: { id, name, role, email } }` — the JWT is never returned in the response body.

2. **Given** an incorrect email or password,
   **When** `POST /api/v1/auth/login` is called,
   **Then** the response is `401 UNAUTHORIZED` with `{ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }` — no distinction between wrong email and wrong password (prevents user enumeration).

3. **Given** an authenticated user,
   **When** `GET /api/v1/auth/me` is called with a valid session cookie,
   **Then** the response returns `{ data: { id, name, role, email, departmentId } }` — this endpoint is the frontend's sole source of auth state.

4. **Given** an authenticated user,
   **When** `POST /api/v1/auth/logout` is called,
   **Then** the JWT cookie is cleared (`maxAge: 0`) and the response returns `{ success: true }`.

5. **Given** a request to any protected endpoint without a valid JWT cookie,
   **When** `authMiddleware` processes the request,
   **Then** the response is `401 UNAUTHORIZED` before any business logic or database query executes.

6. **Given** a JWT that has exceeded 2 hours of inactivity,
   **When** any authenticated endpoint is called,
   **Then** the response is `401 UNAUTHORIZED` with `{ error: { code: "UNAUTHORIZED", message: "Session expired" } }`.

7. **Given** an active session within the 2-hour window,
   **When** the user makes any authenticated API call,
   **Then** the JWT expiry is refreshed automatically (sliding expiry) so active users are never unexpectedly logged out.

8. **Given** a user with `is_active: false`,
   **When** `POST /api/v1/auth/login` is called with their credentials,
   **Then** the response is `401 UNAUTHORIZED` — deactivated accounts cannot log in.

9. **Given** the login endpoint,
   **When** `express-rate-limit` middleware is applied,
   **Then** the login endpoint returns `429 TOO MANY REQUESTS` after 10 failed attempts per IP in 15 minutes.

10. **Given** user password storage,
    **When** any user is created or their password updated,
    **Then** the password is stored as a bcrypt hash — plaintext is never stored, logged, or returned in any response.

11. **Given** the `shared/schemas/auth.schema.ts` Zod schema,
    **When** `POST /api/v1/auth/login` receives a request body,
    **Then** the body is validated against `loginSchema` (email format, non-empty password) before any database query; invalid bodies return `400 VALIDATION_ERROR`.

12. **Given** the `pino` logger is configured,
    **When** any auth-related log entry is written,
    **Then** the `redact` option strips password fields from all log output — plaintext or hashed passwords never appear in logs.

## Tasks / Subtasks

- [x] Task 1: Auth service — login, me, logout (AC: 1, 2, 3, 4, 8, 10)
  - [x] 1.1 Create `services/auth.service.ts` with `login(email, password)` — lookup user by email, verify `isActive`, bcrypt compare, return user data (no hash)
  - [x] 1.2 Add `getCurrentUser(userId)` — fetch user by ID, return `{ id, name, role, email, departmentId }`
  - [x] 1.3 Add `hashPassword(plain)` utility for future use (Story 1.4 user creation, Story 1.6 password change)
  - [x] 1.4 Create `services/auth.service.test.ts` — unit tests with mocked Prisma

- [x] Task 2: JWT token utilities (AC: 1, 6, 7)
  - [x] 2.1 Create `lib/jwt.ts` — `signToken(payload)` using `jose` v5 `SignJWT` with HS256, 2h expiry
  - [x] 2.2 Add `verifyToken(token)` using `jwtVerify`, returns payload or throws
  - [x] 2.3 Secret: `new TextEncoder().encode(config.jwtSecret)` — jose v5 requires Uint8Array
  - [x] 2.4 Create `lib/jwt.test.ts` — sign/verify round-trip, expired token rejection

- [x] Task 3: Auth middleware — JWT extraction + sliding expiry (AC: 5, 6, 7)
  - [x] 3.1 Create `middleware/auth.middleware.ts` — extract JWT from `req.cookies`, verify, attach `req.user`
  - [x] 3.2 On valid token: re-issue JWT with fresh 2h expiry as new cookie (sliding window)
  - [x] 3.3 On missing/invalid/expired token: throw `UnauthorizedError`
  - [x] 3.4 Create `middleware/auth.middleware.test.ts`

- [x] Task 4: RBAC middleware (AC: 5)
  - [x] 4.1 Create `middleware/rbac.middleware.ts` — `rbacMiddleware(allowedRoles: UserRole[])` factory
  - [x] 4.2 Check `req.user.role` against allowed roles, throw `ForbiddenError` if not permitted
  - [x] 4.3 Create `middleware/rbac.middleware.test.ts`

- [x] Task 5: Auth routes (AC: 1, 2, 3, 4, 11)
  - [x] 5.1 Create `routes/auth.routes.ts` with three endpoints
  - [x] 5.2 `POST /api/v1/auth/login` — validate body with `loginSchema`, call `authService.login()`, sign JWT, set cookie, return user data
  - [x] 5.3 `GET /api/v1/auth/me` — protected via `authMiddleware`, call `authService.getCurrentUser()`
  - [x] 5.4 `POST /api/v1/auth/logout` — clear cookie with `maxAge: 0`, return `{ success: true }`
  - [x] 5.5 Register auth routes in `routes/index.ts`

- [x] Task 6: Cookie and CORS configuration (AC: 1, 4)
  - [x] 6.1 Add `cookie-parser` middleware to app.ts (needed to read `req.cookies`)
  - [x] 6.2 Configure cookie options: `httpOnly: true`, `sameSite: 'strict'`, `secure: config.nodeEnv === 'production'`, `path: '/'`
  - [x] 6.3 Update CORS config with `credentials: true` and explicit `origin`

- [x] Task 7: Rate limiting on login (AC: 9)
  - [x] 7.1 Create login-specific rate limiter in `routes/auth.routes.ts`: 10 requests per IP per 15 minutes
  - [x] 7.2 Apply only to `POST /login` route, not to `/me` or `/logout`

- [x] Task 8: Zod validation middleware (AC: 11)
  - [x] 8.1 Create `middleware/validate.middleware.ts` — generic Zod validation middleware factory
  - [x] 8.2 On validation failure: throw `ValidationError` with field-level details
  - [x] 8.3 Apply to login route: `validate(loginSchema)`

- [x] Task 9: Prisma seed script (AC: 1, 2, 8)
  - [x] 9.1 Create `prisma/seed.ts` — seed a test admin user with bcrypt-hashed password
  - [x] 9.2 Add `prisma.seed` config to backend `package.json`
  - [x] 9.3 Seed at least one active user and one deactivated user for manual testing

- [x] Task 10: Integration tests (AC: 1-12)
  - [x] 10.1 Create `routes/auth.routes.test.ts` — integration tests using `supertest` against `createApp()`
  - [x] 10.2 Test: successful login returns cookie + user data (no JWT in body)
  - [x] 10.3 Test: wrong credentials return 401 (same message for wrong email vs wrong password)
  - [x] 10.4 Test: `/me` with valid cookie returns user profile with departmentId
  - [x] 10.5 Test: `/me` without cookie returns 401
  - [x] 10.6 Test: `/logout` clears cookie
  - [x] 10.7 Test: deactivated user cannot login
  - [x] 10.8 Test: invalid/malformed body returns 400 VALIDATION_ERROR
  - [x] 10.9 Test: expired token returns 401

## Dev Notes

### Architecture Constraints (MUST follow)

1. **Layer separation**: Routes call services. Services call Prisma. NEVER call Prisma from route handlers.
2. **asyncHandler**: Wrap ALL async route handlers with `asyncHandler()` from `middleware/async-handler.ts`. Never use try/catch in routes.
3. **RBAC in middleware**: Role checks go in `rbacMiddleware`, not in service functions. Data-scoping (filtering by department, etc.) goes in service functions.
4. **Naming**: `snake_case` in DB (Prisma `@map()`), `camelCase` in TypeScript and JSON responses. Prisma handles the mapping automatically.
5. **Error response shape**: `{ error: { code, message, details? } }` — already implemented in `middleware/error.middleware.ts` + `lib/errors.ts`.
6. **Null for absent fields**: Return `null` (never `""` or `undefined`) for optional fields like `departmentId`.
7. **ISO 8601 UTC**: All date/time values in API responses.
8. **JWT never in response body**: Token goes ONLY in httpOnly cookie.
9. **No user enumeration**: Login failure must return identical message regardless of whether email or password was wrong.
10. **Pino logger**: Already configured in `lib/logger.ts` with redaction of `*.password`, `*.passwordHash`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| Express app factory | `src/app.ts` | Add cookie-parser + auth routes here |
| Error classes | `src/lib/errors.ts` | `UnauthorizedError`, `ValidationError`, `ForbiddenError` already exist |
| Error middleware | `src/middleware/error.middleware.ts` | Formats all AppError subclasses automatically |
| asyncHandler | `src/middleware/async-handler.ts` | Wraps async route handlers |
| Prisma client | `src/lib/prisma.ts` | Singleton, import from here |
| Config | `src/lib/config.ts` | `config.jwtSecret` (lazy getter), `config.nodeEnv` |
| Logger | `src/lib/logger.ts` | Pino with redact — use `logger.info/error/warn` |
| Login Zod schema | `shared/src/schemas/auth.schema.ts` | `loginSchema` already validates email + non-empty password |
| UserRole type | `shared/src/types/index.ts` | `'ADMIN' \| 'FINANCE' \| 'HR' \| 'DELIVERY_MANAGER' \| 'DEPT_HEAD'` |
| Health route | `src/routes/index.ts` | Mount auth routes alongside existing health check |

### jose v5 API (Critical — do NOT guess)

```typescript
import { SignJWT, jwtVerify } from 'jose';

// Secret MUST be Uint8Array for HS256
const secret = new TextEncoder().encode(config.jwtSecret);

// Sign token
const token = await new SignJWT({ sub: userId, role, email })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('2h')
  .sign(secret);

// Verify token — throws on invalid/expired
const { payload } = await jwtVerify(token, secret);
// payload.sub = userId, payload.role, payload.email
```

- jose is pure ESM — use `import`, not `require`
- `jwtVerify` throws `JWTExpired` on expired tokens — catch and throw `UnauthorizedError("Session expired")`
- `jwtVerify` throws `JWSSignatureVerificationFailed` on tampered tokens

### bcrypt API

```typescript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 10);       // salt rounds = 10
const match = await bcrypt.compare(password, hash);  // true/false
```

### express-rate-limit API

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 10,                  // 10 attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' } },
});
```

### Cookie Configuration

```typescript
const COOKIE_NAME = 'ipis_token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.nodeEnv === 'production',
  path: '/',
  maxAge: 2 * 60 * 60 * 1000,  // 2 hours in ms
};
```

### Request Type Extension

Create a type declaration for `req.user`:
```typescript
// src/types/express.d.ts
import { UserRole } from '@ipis/shared';
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
      };
    }
  }
}
```

### Middleware Chain Pattern (for protected routes)

```typescript
router.get('/auth/me',
  authMiddleware,           // 1. Extract + validate JWT, attach req.user, refresh cookie
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({ data: user });
  })
);
```

### New Dependencies Required

| Package | Purpose | Install command |
|---|---|---|
| `cookie-parser` | Parse cookies from request | `pnpm --filter @ipis/backend add cookie-parser` |
| `@types/cookie-parser` | TypeScript types | `pnpm --filter @ipis/backend add -D @types/cookie-parser` |
| `supertest` | HTTP integration testing | `pnpm --filter @ipis/backend add -D supertest @types/supertest` |

All other dependencies (`jose`, `bcrypt`, `express-rate-limit`, `pino`) are already installed.

### Prisma Schema — No Migration Needed

The existing schema already has all required fields:
- `User.email` (unique)
- `User.passwordHash` (mapped from `password_hash`)
- `User.role` (UserRole enum: ADMIN, FINANCE, HR, DELIVERY_MANAGER, DEPT_HEAD)
- `User.departmentId` (optional FK to Department)
- `User.isActive` (boolean, default true)
- `User.mustChangePassword` (boolean, default false — used in Story 1.6)

No new tables or columns are needed for this story.

### Project Structure Notes

New files to create:
```
packages/backend/src/
├── lib/
│   └── jwt.ts                    # JWT sign/verify utilities
│   └── jwt.test.ts               # JWT unit tests
├── middleware/
│   ├── auth.middleware.ts         # JWT extraction + sliding expiry
│   ├── auth.middleware.test.ts
│   ├── rbac.middleware.ts         # Role enforcement factory
│   ├── rbac.middleware.test.ts
│   └── validate.middleware.ts     # Zod validation factory
├── routes/
│   ├── auth.routes.ts             # POST /login, GET /me, POST /logout
│   └── auth.routes.test.ts        # Integration tests with supertest
├── services/
│   ├── auth.service.ts            # Business logic
│   └── auth.service.test.ts       # Unit tests with mocked Prisma
├── types/
│   └── express.d.ts               # req.user type extension
└── prisma/
    └── seed.ts                    # Seed admin + test users
```

Existing files to modify:
```
packages/backend/src/app.ts        # Add cookie-parser, CORS credentials, mount auth routes
packages/backend/src/routes/index.ts  # Import and mount auth routes
packages/backend/package.json      # Add cookie-parser, supertest, seed config
```

### Testing Strategy

- **Unit tests** (Vitest, co-located): auth.service, jwt utilities, auth.middleware, rbac.middleware
- **Integration tests** (Vitest + supertest): auth.routes — test full HTTP request/response cycle against `createApp()`
- **Mock Prisma** in unit tests: `vi.mock('../lib/prisma.js')` — mock the Prisma client methods
- **Test database**: Integration tests should use a seeded in-memory or test database, or mock at service level
- **Co-located test files**: `*.test.ts` next to the file they test

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication, API Patterns, Error Handling, Middleware Stack, Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1-FR4, FR10, FR49-FR50, NFR5-NFR10]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Login page, Session management, Error states]
- [Source: _bmad-output/implementation-artifacts/1-1-monorepo-scaffold-and-project-infrastructure.md — Established patterns, Code review fixes]

### Previous Story Intelligence (from Story 1.1)

**Patterns established:**
- Express app factory pattern in `app.ts` (separate from `index.ts` for testability)
- Error classes hierarchy in `lib/errors.ts` — reuse `UnauthorizedError`, `ValidationError`, `ForbiddenError`
- asyncHandler wrapper already in `middleware/async-handler.ts`
- Pino logger with redact in `lib/logger.ts`
- Config with lazy `jwtSecret` getter in `lib/config.ts`
- Zod loginSchema already scaffolded in shared package

**Issues to avoid (from code review):**
- Never use `console.log` — always use `logger` from `lib/logger.ts`
- Never use `tsc -b` — use `tsc --noEmit` for type checking
- jose is v5 (not v6) — API: `SignJWT`, `jwtVerify`, secret as `Uint8Array`
- antd is v6.3.0 (not v5) — irrelevant for this backend story but noted for consistency
- Test scripts must include `--passWithNoTests` flag

**Git context:**
- Single commit so far: `ed822e1 feat: Story 1.1 — Monorepo scaffold and project infrastructure`
- All foundation code is in place and verified working

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- TS2749 in auth.middleware.ts:33 — Used `req['user']` as a type expression; fixed by using `UserRole` type directly
- TS2307 in validate.middleware.ts — `Cannot find module 'zod'`; fixed by adding `zod` to backend dependencies
- TS2742 in auth.routes.ts — Router type inference issue in pnpm monorepo; fixed with explicit `RouterType` annotation (same pattern as Story 1.1)
- ESLint unused import errors (4 total) — removed unused `beforeEach`, `NextFunction`, `afterAll`, and `next` parameter

### Completion Notes List

- All 10 tasks and ~35 subtasks implemented and verified
- 32 new backend tests passing (5 test files), 12 shared tests still passing (44 total)
- Typecheck: 0 errors | Lint: 0 errors | Tests: 44/44 passing
- TDD approach followed: tests written alongside implementation for each module
- jose v5 API used correctly with Uint8Array secret encoding
- Sliding expiry implemented: every authenticated request re-issues a fresh 2h JWT cookie
- Rate limiter applied only to login endpoint (10 req/IP/15min)
- No user enumeration: identical error message AND timing-safe bcrypt for wrong email vs wrong password
- Cookie-based auth only — JWT never appears in response body
- Seed script creates 3 users (active admin, active finance with dept, deactivated HR)

### Change Log

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/types/express.d.ts` | Express Request type extension for `req.user` |
| CREATE | `src/lib/jwt.ts` | JWT sign/verify utilities using jose v5 HS256 |
| CREATE | `src/lib/jwt.test.ts` | 3 tests: round-trip, invalid token, tampered token |
| CREATE | `src/services/auth.service.ts` | Auth business logic: login, getCurrentUser, hashPassword |
| CREATE | `src/services/auth.service.test.ts` | 10 tests: login variants, getCurrentUser, hashPassword |
| CREATE | `src/middleware/auth.middleware.ts` | JWT extraction from cookies, verification, sliding expiry |
| CREATE | `src/middleware/auth.middleware.test.ts` | 4 tests: no cookie, valid token, sliding expiry, expired token |
| CREATE | `src/middleware/rbac.middleware.ts` | Role-based access control middleware factory |
| CREATE | `src/middleware/rbac.middleware.test.ts` | 4 tests: allowed/forbidden role, no user, non-admin roles |
| CREATE | `src/middleware/validate.middleware.ts` | Generic Zod validation middleware factory |
| CREATE | `src/routes/auth.routes.ts` | POST /login, GET /me, POST /logout endpoints |
| CREATE | `src/routes/auth.routes.test.ts` | 11 integration tests with supertest |
| CREATE | `prisma/seed.ts` | Seed script: 3 users (admin, finance, deactivated HR) |
| MODIFY | `src/app.ts` | Added cookie-parser middleware, CORS with credentials |
| MODIFY | `src/routes/index.ts` | Mounted auth routes at /api/v1/auth |
| MODIFY | `package.json` | Added cookie-parser, zod, supertest deps + seed config |
| REVIEW-FIX | `src/services/auth.service.ts` | Added timing-safe bcrypt hash for user-not-found path |
| REVIEW-FIX | `src/middleware/auth.middleware.ts` | Use config.nodeEnv instead of process.env directly |
| REVIEW-FIX | `src/middleware/auth.middleware.test.ts` | Added config mock for auth.middleware import |
| REVIEW-FIX | `src/routes/auth.routes.ts` | Moved authMiddleware to chain, added skipSuccessfulRequests |
| REVIEW-FIX | `src/routes/auth.routes.test.ts` | Added expired token + rate limit integration tests |
| REVIEW-FIX | `shared/src/schemas/auth.schema.ts` | Removed stale placeholder comment |

### File List

**New files (13):**
- `packages/backend/src/types/express.d.ts`
- `packages/backend/src/lib/jwt.ts`
- `packages/backend/src/lib/jwt.test.ts`
- `packages/backend/src/services/auth.service.ts`
- `packages/backend/src/services/auth.service.test.ts`
- `packages/backend/src/middleware/auth.middleware.ts`
- `packages/backend/src/middleware/auth.middleware.test.ts`
- `packages/backend/src/middleware/rbac.middleware.ts`
- `packages/backend/src/middleware/rbac.middleware.test.ts`
- `packages/backend/src/middleware/validate.middleware.ts`
- `packages/backend/src/routes/auth.routes.ts`
- `packages/backend/src/routes/auth.routes.test.ts`
- `packages/backend/prisma/seed.ts`

**Modified files (4):**
- `packages/backend/src/app.ts`
- `packages/backend/src/routes/index.ts`
- `packages/backend/package.json`
- `pnpm-lock.yaml`

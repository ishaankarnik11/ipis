# Gotchas & Framework Reference

Living document of framework-specific traps, version pins, and patterns discovered during development. **Check this file before starting any new story.**

## Dependency Version Pins

| Package | Correct Version | Wrong Version to Avoid | Source |
|---|---|---|---|
| antd | ^6.3.0 | v5.x (EOL) | Story 1.1 code review |
| Vite | ^7.3.1 | v6.x | Story 1.1 code review |
| jose | ^5.0.0 | v6.x | Story 1.1 code review |
| React | 19 | — | Architecture spec |
| React Router | v7 | v6 | Architecture spec |
| Express | 5.2.1 | v4.x | Architecture spec |

## antd v6 Breaking Changes

### Alert: `message` prop renamed to `title`

**Hit in:** Stories 1.3, 1.5, 1.6

```tsx
// WRONG (v5 API)
<Alert type="error" message="Something went wrong" />

// CORRECT (v6 API)
<Alert type="error" title="Something went wrong" />
```

### Modal: `destroyOnClose` renamed to `destroyOnHidden`

**Hit in:** Story 1.5

```tsx
// WRONG (v5 API)
<Modal destroyOnClose>

// CORRECT (v6 API)
<Modal destroyOnHidden>
```

### ConfigProvider token system

antd v6 uses `ConfigProvider` with token-based theming. Tokens are configured in `packages/frontend/src/theme/index.ts`. Do not use v5 theme API.

### Spin: `tip` prop renamed to `description`

**Hit in:** Story 2.4

```tsx
// WRONG (v5 API)
<Spin tip="Loading..." />

// CORRECT (v6 API)
<Spin description="Loading..." />
```

### Upload: `beforeUpload` receives `RcFile`, not `File`

**Hit in:** Story 2.4

The antd `Upload` component's `beforeUpload` callback receives an `RcFile` (which extends native `File` with `uid` and optional `lastModifiedDate`). Do NOT type it as `File` — use `RcFile` from `antd/es/upload`.

```tsx
import type { RcFile } from 'antd/es/upload';

const beforeUpload = (file: RcFile) => {
  // file.uid is available (RcFile-specific)
  // file.name, file.size, file.type are inherited from File
  return false; // prevent auto-upload
};
```

When passing to `FormData`, no conversion is needed — `RcFile` extends `File` so `formData.append('file', rcFile)` works directly.

## jose v5 API

**Hit in:** Stories 1.1, 1.2

jose is pure ESM — use `import`, not `require`.

```typescript
import { SignJWT, jwtVerify } from 'jose';

// Secret MUST be Uint8Array for HS256 — do NOT pass a string
const secret = new TextEncoder().encode(config.jwtSecret);

// Sign
const token = await new SignJWT({ sub: userId, role, email })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('2h')
  .sign(secret);

// Verify — throws JWTExpired on expired, JWSSignatureVerificationFailed on tampered
const { payload } = await jwtVerify(token, secret);
```

## React Router v7

**Hit in:** Story 1.3

- Import from `react-router` (NOT `react-router-dom`)
- Use `createBrowserRouter` + `RouterProvider` (NOT legacy `BrowserRouter`)
- Use `<Navigate>` for redirects, `<Outlet />` for nested routes

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router';
```

## TypeScript in pnpm Monorepo

### TS2742: Router type inference

**Hit in:** Stories 1.1, 1.2

pnpm monorepo can cause Router type inference issues. Fix with explicit `RouterType` annotation.

### TS2749: req['user'] as type expression

**Hit in:** Story 1.2

Don't use `req['user']` as a type expression. Use the `UserRole` type directly.

### TS2307: Zod not found in backend

**Hit in:** Story 1.2

Zod must be added as a dependency in the backend package directly, even though it exists in shared. Run: `pnpm --filter @ipis/backend add zod`

### tsconfig.json must not include vite.config.ts

**Hit in:** Story 1.3

Including `vite.config.ts` in `tsconfig.json` `include` causes type errors due to vitest/vite version mismatches. Remove it from `include`.

## Build & Tooling

### Never use `tsc -b` for type checking

**Hit in:** Story 1.1

Use `tsc --noEmit` instead. The `-b` flag is for project references build mode and behaves differently.

### Never use `console.log`

**Hit in:** Story 1.1

Always use pino `logger` from `lib/logger.ts`. The logger has `redact` configured to strip sensitive fields (`*.password`, `*.passwordHash`).

### Test scripts need `--passWithNoTests`

**Hit in:** Story 1.2

Add `--passWithNoTests` flag to test scripts so packages without tests don't fail CI.

### Navigation config in .ts files (not .tsx)

**Hit in:** Story 1.3

`config/navigation.ts` uses `createElement()` for icons instead of JSX, since it's a `.ts` file. Don't rename to `.tsx` — keep the pattern consistent.

### `tsconfig.tsbuildinfo` is a build artifact

Add to `.gitignore` — it should not be committed.

## HTTP Patterns

### `postForm()` for FormData / multipart uploads

**Hit in:** Story 2.4

Use the `postForm()` helper (from the shared API module) for FormData uploads instead of manually setting `Content-Type: multipart/form-data`. The helper handles the correct headers and encoding.

```typescript
import { postForm } from '../api';

const formData = new FormData();
formData.append('file', file);

const result = await postForm('/api/v1/employees/upload', formData);
```

Do NOT set `Content-Type` manually — the browser sets the correct `multipart/form-data; boundary=...` header automatically when using `FormData`.

## Prisma Patterns

### Auto-mapping handles case conversion

Prisma automatically maps `snake_case` DB columns to `camelCase` TypeScript fields via `@map()`. Do NOT manually transform field names in service code.

### BigInt serialization for JSON responses

**Hit in:** Story 2.2

Prisma returns `BigInt` for fields mapped to PostgreSQL `BIGINT`. JavaScript's `JSON.stringify` cannot serialize `BigInt` natively — it throws `TypeError: Do not know how to serialize a BigInt`.

Convert BigInt to Number in serialization functions before returning from API routes:

```typescript
// In service serialization
function serializeEmployee(emp: Employee) {
  return {
    ...emp,
    annualCtcPaise: Number(emp.annualCtcPaise), // BigInt → Number
  };
}
```

This is safe for values up to `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) which covers all practical salary values in paise.

### Prisma calls only from service layer

Never import Prisma in route handlers. Routes call services, services call Prisma.

## Security Patterns

### Timing-safe bcrypt for non-existent users

**Hit in:** Story 1.2 code review

When a login attempt has a non-existent email, still run a bcrypt hash comparison against a dummy value. This prevents timing-based user enumeration.

### SHA-256 for one-time tokens, bcrypt for passwords

**Hit in:** Story 1.6

- Passwords: bcrypt with salt rounds 10 (slow, salted — good for stored secrets)
- One-time tokens: SHA-256 hash (fast, deterministic — good for single-use tokens)

### Interactive Prisma $transaction for atomic operations

**Hit in:** Story 1.6 code review (TOCTOU fix)

When an operation needs to read-then-write atomically (e.g., validate a token then mark it used), use an interactive transaction, not a batch transaction.

```typescript
await prisma.$transaction(async (tx) => {
  const token = await tx.passwordResetToken.findFirst({ where: { tokenHash } });
  if (!token || token.usedAt) throw new Error('Invalid token');
  await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  await tx.user.update({ where: { id: token.userId }, data: { passwordHash: newHash } });
});
```

### Fire-and-forget with .catch()

**Hit in:** Story 1.6 code review

When calling an async function fire-and-forget (e.g., sending email after forgot-password), always add `.catch()` to prevent unhandled promise rejections.

```typescript
sendPasswordResetEmail(email, resetUrl).catch((err) => logger.error(err, 'Failed to send reset email'));
```

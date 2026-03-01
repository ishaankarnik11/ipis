# Error Handling Patterns — IPIS

This document defines the canonical error handling patterns used across the IPIS codebase. Reference these patterns when writing new code.

---

## 1. Pure Function Validation (RangeError Guard Pattern)

**Use when:** Validating numeric inputs in calculation/business logic functions.

**Reference:** `packages/backend/src/services/calculation-engine/cost-rate.calculator.ts`

```typescript
export function calculateCostPerHour({ annualCtcPaise, overheadPaise, standardMonthlyHours }: CostRateInput): number {
  if (!Number.isFinite(annualCtcPaise) || annualCtcPaise < 0) {
    throw new RangeError('annualCtcPaise must be a non-negative finite number');
  }
  if (!Number.isFinite(standardMonthlyHours) || standardMonthlyHours <= 0) {
    throw new RangeError('standardMonthlyHours must be greater than zero');
  }
  return Math.round((annualCtcPaise + overheadPaise) / 12 / standardMonthlyHours);
}
```

**Key principles:**
- Guard with `Number.isFinite()` to catch `NaN`, `Infinity`, `-Infinity`, `null`, `undefined`
- Throw `RangeError` for invalid numeric inputs (not generic `Error`)
- Include the parameter name and constraint in the error message
- Validate all preconditions before computation (fail fast)

---

## 2. Backend API Error Hierarchy

**Use when:** Throwing errors from route handlers and services.

**Reference:** `packages/backend/src/lib/errors.ts`

```typescript
// Base class — all API errors extend this
AppError(code: string, message: string, statusCode: number, details?: Array<{ field?: string; message: string }>)

// Specialized subclasses
ValidationError(message, details?)     // 400 — input validation failures
UnauthorizedError(message?)            // 401 — not authenticated
ForbiddenError(message?)               // 403 — not authorized (RBAC)
NotFoundError(message?)                // 404 — resource not found
ConflictError(message)                 // 409 — duplicate/conflict
UploadRejectedError(message, details?) // 422 — upload validation failure
```

**Usage in route handlers:**

```typescript
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { asyncHandler } from '../middleware/async-handler.js';

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const project = await projectService.findById(req.params.id);
  if (!project) throw new NotFoundError('Project not found');
  if (project.deliveryManagerId !== req.user!.id) throw new ForbiddenError();
  res.json({ data: project });
}));
```

**Key principles:**
- Always wrap async route handlers with `asyncHandler()` — it catches rejected promises and forwards to Express error middleware
- Throw the appropriate `AppError` subclass — never throw raw `Error` in routes
- The global `errorMiddleware` formats all `AppError` instances into `{ error: { code, message, details } }`
- Unhandled errors are logged via pino and return `500 INTERNAL_ERROR`

---

## 3. Frontend API Error Handling

> **Note:** This section covers API error handling via `ApiError` and TanStack Query callbacks. The codebase does not use React error boundaries; all errors are handled at the API call site.

**Use when:** Making API calls from the frontend.

**Reference:** `packages/frontend/src/services/api.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public error: { code: string; message: string; details?: Array<{ field: string; message: string }> },
  ) {
    super(error.message);
  }
}
```

**Frontend error display pattern:**

```typescript
// In mutation callbacks (TanStack Query):
useMutation({
  mutationFn: (data) => createProject(data),
  onError: (err) => {
    if (err instanceof ApiError) {
      message.error(err.error.message);          // Show server message
    } else {
      message.error('An unexpected error occurred');
    }
  },
});
```

**Key principles:**
- All API responses parse into `ApiError` when `!res.ok`
- 401 responses auto-redirect to `/login?expired=true` (session expiry interceptor)
- Use `instanceof ApiError` to distinguish API errors from network/runtime errors
- Display `err.error.message` (the server's message), not `err.message` (may be generic)

---

## 4. Error Type Selection Guide

| Scenario | Error Type | Example |
|---|---|---|
| Invalid numeric input (NaN, Infinity, negative) | `RangeError` | Calculator receives NaN hours |
| Business rule violation | `AppError` subclass | Duplicate team member assignment → `ConflictError` |
| Input validation failure | `ValidationError` (400) | Missing required field |
| Authentication failure | `UnauthorizedError` (401) | Invalid or expired session |
| Authorization failure | `ForbiddenError` (403) | DM accessing another DM's project |
| Resource not found | `NotFoundError` (404) | Project ID doesn't exist |
| Data conflict | `ConflictError` (409) | Employee already assigned |
| Upload rejection | `UploadRejectedError` (422) | CSV has invalid rows |
| Unexpected internal error | Caught by `errorMiddleware` | Unhandled Prisma error → `500` |

---

## Anti-Patterns (Avoid)

1. **Don't catch and swallow errors silently** — always log or re-throw
2. **Don't throw generic `Error` in routes** — use `AppError` subclasses for proper HTTP status codes
3. **Don't use `try/catch` in route handlers** — `asyncHandler()` does this automatically
4. **Don't validate deep inside business logic** — validate at the boundary (route entry, function entry)
5. **Don't return error objects** — throw them; let the middleware handle formatting

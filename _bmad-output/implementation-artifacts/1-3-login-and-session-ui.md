# Story 1.3: Login & Session UI

Status: done

## Story

As a user of any role,
I want a login page and persistent session across page navigation,
so that I can access the application and work uninterrupted without being unexpectedly redirected.

## Acceptance Criteria (AC)

1. **Given** an unauthenticated user navigates to any protected route,
   **When** the `AuthGuard` React Router guard evaluates,
   **Then** the user is redirected to `/login` — no flash of protected content.

2. **Given** the login page at `/login`,
   **When** a user enters valid credentials and submits,
   **Then** `POST /api/v1/auth/login` is called; on success the user is redirected to their role-appropriate landing page (Admin -> `/admin`, Finance -> `/dashboards/executive`, HR -> `/employees`, Delivery Manager -> `/projects`, Dept Head -> `/dashboards/department`).

3. **Given** invalid credentials are submitted,
   **When** the API returns `401`,
   **Then** an inline antd `Alert` (type="error") displays "Invalid email or password" — no page reload.

4. **Given** the login form is submitting,
   **When** the API call is in-flight,
   **Then** the Submit button shows a loading spinner and is disabled to prevent double-submission.

5. **Given** an authenticated user navigates between pages,
   **When** `useAuth` queries `GET /api/v1/auth/me` via TanStack Query on app load,
   **Then** the user's role and identity are available application-wide without re-fetching on each navigation; the query key is `['auth', 'me']`.

6. **Given** a user's session expires mid-use,
   **When** the next API call returns `401`,
   **Then** the user is redirected to `/login` with message: "Your session has expired. Please log in again."

7. **Given** an authenticated user clicks "Log Out" in the top navigation bar,
   **When** `POST /api/v1/auth/logout` succeeds,
   **Then** `queryClient.clear()` is called, the JWT cookie is cleared, and the user is redirected to `/login`.

8. **Given** the left sidebar `Menu` component,
   **When** rendered for any authenticated user,
   **Then** only navigation items appropriate for their role are rendered — unauthorized items are absent entirely (not hidden, not greyed out).

9. **Given** the login page renders,
   **When** a keyboard user tabs through the form,
   **Then** focus order is: Email input -> Password input -> Submit button, with visible antd focus rings on each element.

10. **Given** an already-authenticated user navigates to `/login`,
    **When** `useAuth` returns a valid user,
    **Then** the user is immediately redirected to their role-appropriate landing page — they never see the login form.

## Tasks / Subtasks

- [x] Task 1: API client utility (AC: 5, 6)
  - [x] 1.1 Create `services/api.ts` — fetch wrapper with base URL, credentials: 'include' (for cookies), JSON content-type
  - [x] 1.2 Add global 401 response interceptor that clears auth cache and redirects to `/login`
  - [x] 1.3 Export typed `get`, `post`, `patch`, `put`, `del` helper functions

- [x] Task 2: Auth API service and useAuth hook (AC: 5, 7)
  - [x] 2.1 Create `services/auth.api.ts` — `authKeys` constant (`['auth', 'me']`), `login()`, `logout()`, `getMe()` functions
  - [x] 2.2 Create `hooks/useAuth.ts` — `useAuth()` hook using `useQuery(authKeys.me, getMe)`, returns `{ user, isLoading, isError }`
  - [x] 2.3 Add `useLogin()` mutation hook — calls `login()`, on success invalidates `authKeys.me`
  - [x] 2.4 Add `useLogout()` mutation hook — calls `logout()`, on success calls `queryClient.clear()`

- [x] Task 3: Route guards (AC: 1, 10)
  - [x] 3.1 Create `router/guards.tsx` — `AuthGuard` component that checks `useAuth()` state
  - [x] 3.2 If loading: render a centered antd `Spin` spinner (full page)
  - [x] 3.3 If unauthenticated: `<Navigate to="/login" />` — no flash of protected content
  - [x] 3.4 If authenticated and on `/login`: redirect to role-appropriate landing page
  - [x] 3.5 Create `RoleGuard` component — checks `user.role` against `allowedRoles` prop, redirects to landing page if unauthorized

- [x] Task 4: Login page (AC: 2, 3, 4, 9)
  - [x] 4.1 Create `pages/auth/Login.tsx` — antd `Form` with Email (`Input`) and Password (`Input.Password`) fields
  - [x] 4.2 Form validation: email required + email format, password required (use antd Form rules)
  - [x] 4.3 Submit handler calls `useLogin()` mutation; on error shows antd `Alert` with error message
  - [x] 4.4 Submit button: `loading` prop tied to mutation `isPending` state
  - [x] 4.5 On success: redirect to role-appropriate landing page using `getRoleLandingPage(role)` utility
  - [x] 4.6 Keyboard accessibility: natural tab order (email -> password -> submit), visible focus rings

- [x] Task 5: App layout with sidebar and top bar (AC: 7, 8)
  - [x] 5.1 Create `layouts/AppLayout.tsx` — antd `Layout` with `Sider` (left sidebar, 220px) and `Header` (top bar, 48px navy)
  - [x] 5.2 Top bar: collapse toggle (left), user name + "Log Out" button (right)
  - [x] 5.3 Left sidebar: antd `Menu` with role-scoped navigation items
  - [x] 5.4 Create `config/navigation.ts` — define all nav items with required roles, filter by `user.role`
  - [x] 5.5 Sidebar collapse preference stored in `localStorage`

- [x] Task 6: Router configuration (AC: 1, 2, 8, 10)
  - [x] 6.1 Create `router/index.tsx` — React Router v7 route definitions
  - [x] 6.2 Public routes: `/login` wrapped in LoginGuard
  - [x] 6.3 Protected routes: wrap with `AuthGuard` -> `AppLayout` -> `<Outlet />`
  - [x] 6.4 Admin routes: nest under `RoleGuard allowedRoles={['ADMIN']}` -> `/admin/users`, `/admin/config`
  - [x] 6.5 Placeholder pages for all role landing pages (to be implemented in later stories)
  - [x] 6.6 Update `App.tsx` to use new router (replaced BrowserRouter with RouterProvider + createBrowserRouter)

- [x] Task 7: Session expiry handling (AC: 6)
  - [x] 7.1 In `services/api.ts` 401 interceptor: redirects to `/login?expired=true` (skips /auth/login path)
  - [x] 7.2 Login page reads `?expired=true` query param and shows "Your session has expired. Please log in again." via antd `Alert` (type="info")

- [x] Task 8: Tests (AC: 1-10)
  - [x] 8.1 Create `hooks/useAuth.test.ts` — 4 tests: user data when authenticated, null when not, loading state, getRoleLandingPage mapping
  - [x] 8.2 Create `pages/auth/Login.test.tsx` — 6 tests: renders fields, submission calls mutation, redirect on success, error alert, expired alert, keyboard accessibility
  - [x] 8.3 Create `router/guards.test.tsx` — 7 tests: AuthGuard redirect/render/spinner, LoginGuard redirect/render, RoleGuard allow/deny

## Dev Notes

### Architecture Constraints (MUST follow)

1. **TanStack Query is the SOLE auth state manager** — no Redux, no Context API for auth. `useAuth()` hook wraps `useQuery`.
2. **Frontend guards are UX only** — they prevent seeing routes but provide NO security. API-level RBAC is the sole enforcement.
3. **Query keys as constants** — define in `auth.api.ts` as `authKeys = { me: ['auth', 'me'] as const }`. Never inline query keys.
4. **antd v6.3.0** (NOT v5) — use `ConfigProvider` token system already configured in `theme/index.ts`.
5. **React Router v7** — import from `react-router` (not `react-router-dom`). Use `<Navigate>` for redirects, `<Outlet />` for nested routes.
6. **Credentials in fetch** — `credentials: 'include'` on all API calls so httpOnly cookies are sent. No manual Authorization headers.
7. **No JWT access in frontend** — the JWT is in an httpOnly cookie, inaccessible to JavaScript. All auth state comes from `GET /api/v1/auth/me`.

### Existing Code to Reuse (DO NOT recreate)

| What | Path | Notes |
|---|---|---|
| QueryClient | `src/main.tsx` | Already configured with staleTime: 5min, retry: 1 |
| ConfigProvider | `src/main.tsx` | Already wraps app with antd theme |
| Theme tokens | `src/theme/index.ts` | colorPrimary #1B2A4A, colorError #E05A4B, Inter font |
| BrowserRouter | `src/App.tsx` | Replace current placeholder with new router |
| Vite proxy | `vite.config.ts` | `/api` proxied to `localhost:3000` — no CORS issues in dev |
| LoginSchema | `shared/schemas/auth.schema.ts` | `loginSchema` with email + password validation |
| UserRole type | `shared/types/index.ts` | `'ADMIN' \| 'FINANCE' \| 'HR' \| 'DELIVERY_MANAGER' \| 'DEPT_HEAD'` |

### Role-Appropriate Landing Pages

```typescript
export function getRoleLandingPage(role: UserRole): string {
  const landingPages: Record<UserRole, string> = {
    ADMIN: '/admin',
    FINANCE: '/dashboards/executive',
    HR: '/employees',
    DELIVERY_MANAGER: '/projects',
    DEPT_HEAD: '/dashboards/department',
  };
  return landingPages[role];
}
```

### API Client Pattern

```typescript
// services/api.ts
const BASE_URL = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',  // Send httpOnly cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) {
    // Session expired — clear cache and redirect
    window.location.href = '/login?expired=true';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.json();
    throw new ApiError(res.status, body.error);
  }
  return res.json();
}
```

### useAuth Hook Pattern

```typescript
// hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';
import { authKeys, getMe } from '../services/auth.api';

export function useAuth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,       // Don't retry 401s
    staleTime: Infinity, // Only refetch on explicit invalidation
  });
  return { user: data?.data ?? null, isLoading, isAuthenticated: !!data?.data };
}
```

### Sidebar Navigation Config Pattern

```typescript
// config/navigation.ts
import type { UserRole } from '@ipis/shared';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];  // Which roles can see this item
}

export const navItems: NavItem[] = [
  { key: 'admin-users', label: 'User Management', path: '/admin/users', icon: <UserOutlined />, roles: ['ADMIN'] },
  { key: 'admin-config', label: 'System Config', path: '/admin/config', icon: <SettingOutlined />, roles: ['ADMIN'] },
  { key: 'employees', label: 'Employees', path: '/employees', icon: <TeamOutlined />, roles: ['HR'] },
  { key: 'projects', label: 'Projects', path: '/projects', icon: <ProjectOutlined />, roles: ['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'] },
  // ... more items in later stories
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
```

### New Dependencies Required

None — all dependencies already installed (react-router, @tanstack/react-query, antd, @testing-library/react).

### Project Structure Notes

New files to create:
```
packages/frontend/src/
├── services/
│   ├── api.ts                    # Fetch wrapper with 401 interceptor
│   └── auth.api.ts               # Auth API functions + query keys
├── hooks/
│   └── useAuth.ts                # Auth state hook (TanStack Query)
├── router/
│   ├── index.tsx                 # Route definitions
│   └── guards.tsx                # AuthGuard, RoleGuard
├── layouts/
│   └── AppLayout.tsx             # Sidebar + top bar layout
├── config/
│   └── navigation.ts             # Role-scoped nav items
├── pages/
│   └── auth/
│       └── Login.tsx             # Login page
└── (placeholder pages for landing routes)
```

Existing files to modify:
```
src/App.tsx                        # Replace placeholder with router
src/main.tsx                       # May need to export queryClient for logout
```

### Testing Strategy

- **Unit tests** (Vitest + React Testing Library): useAuth hook, Login page component, route guards
- **Mock API calls**: Use `vi.mock('../services/api')` or MSW for API mocking
- **Test co-location**: `*.test.ts` / `*.test.tsx` next to source files

### UX Design Notes

- Login is Tier 3 (low effort) — follow standard antd Form patterns
- Color system: navy primary (#1B2A4A), coral error (#E05A4B), white backgrounds
- Form validation on blur, not on keystroke
- Required field asterisk before label
- Submit button: disable + loading spinner during API call
- Accessibility: WCAG 2.1 AA — labels on all inputs (never placeholder-only), keyboard navigation, focus rings, aria-live for errors
- Responsive: desktop-first; sidebar 220px expanded, collapses to 64px icons at <1024px

### Previous Story Intelligence (from Stories 1.1 and 1.2)

**Patterns from 1.1:**
- antd v6.3.0 (NOT v5), Vite 7.3.1, React 19, React Router v7
- ConfigProvider with theme tokens already wired in main.tsx
- QueryClient already configured in main.tsx
- Empty directory stubs (pages/, hooks/, services/, components/, router/) ready for use
- Vite proxy routes `/api` to `localhost:3000`

**Patterns from 1.2 (backend, not yet implemented but story ready):**
- API endpoints: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- Login response: `{ data: { id, name, role, email } }`
- Me response: `{ data: { id, name, role, email, departmentId } }`
- Logout response: `{ success: true }`
- Error response: `{ error: { code, message } }`
- JWT in httpOnly cookie — frontend never touches the token directly

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Auth, Route Guards, Navigation, TanStack Query]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1-FR4, NFR5, NFR7, NFR10]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Tier 3 screens, Form patterns, Accessibility, Navigation]
- [Source: _bmad-output/implementation-artifacts/1-2-authentication-api-login-session-and-logout.md — API contract]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- vitest `pool: 'forks'` causes `spawn UNKNOWN` on Windows — switched to `pool: 'threads'`
- jsdom lacks `window.matchMedia` — added mock in `test-setup.ts`
- antd v6 Alert: `message` prop renamed to `title` — updated Login.tsx
- `userEvent.type()` keystroke delays cause 5s timeouts in form submission tests — fixed with `userEvent.setup({ delay: null })`
- `tsconfig.json` included `vite.config.ts` which caused type errors due to vitest/vite version mismatch — removed from `include`

### Completion Notes List

- All 8 tasks completed, all 17 frontend tests passing (4 useAuth + 7 guards + 6 Login)
- Full regression: 61 tests (17 frontend + 32 backend + 12 shared), 0 typecheck errors, 0 lint errors
- Used antd v6 API (`title` on Alert, not deprecated `message`)
- React Router v7 `createBrowserRouter` + `RouterProvider` pattern (not legacy BrowserRouter)
- TanStack Query as sole auth state manager per architecture constraint
- 401 interceptor skips `/auth/login` path to avoid redirect loop during login failures
- Sidebar collapse persisted in localStorage key `sidebar-collapsed`
- Navigation items use `createElement()` instead of JSX (`.ts` file, not `.tsx`)
- Installed `@ant-design/icons`, `@testing-library/user-event` as devDependencies; `jsdom` for vitest environment

### Change Log

| Change | Reason |
|---|---|
| Created `services/api.ts` | Fetch wrapper with 401 interceptor, typed HTTP helpers |
| Created `services/auth.api.ts` | Auth API functions (login, logout, getMe) + query keys |
| Created `hooks/useAuth.ts` | useAuth, useLogin, useLogout hooks + getRoleLandingPage |
| Created `router/guards.tsx` | AuthGuard, LoginGuard, RoleGuard route protection |
| Created `pages/auth/Login.tsx` | Login form with email/password, error/expired alerts |
| Created `layouts/AppLayout.tsx` | App shell with collapsible sidebar, header, logout |
| Created `config/navigation.ts` | Role-scoped navigation items for sidebar menu |
| Created `router/index.tsx` | React Router v7 route tree with guards and placeholders |
| Modified `App.tsx` | Replaced BrowserRouter with RouterProvider + createBrowserRouter |
| Modified `vite.config.ts` | Added vitest config (jsdom, threads pool, setup file) |
| Modified `tsconfig.json` | Removed `vite.config.ts` from include (type mismatch fix) |
| Created `test-setup.ts` | jest-dom matchers + matchMedia mock for jsdom |
| Created `hooks/useAuth.test.ts` | 4 unit tests for auth hooks |
| Created `pages/auth/Login.test.tsx` | 6 unit tests for login page |
| Created `router/guards.test.tsx` | 7 unit tests for route guards |
| **Code Review Fix**: Removed unused `useAuth()` call in Login.tsx | Dead code — `mustChangePassword` unused in Login component |
| **Code Review Fix**: Fixed Alert prop `message` → `title` in Login.tsx | antd v6 deprecated `message` in favor of `title` |
| **Code Review Fix**: Added 30s timeout to flaky Login redirect test | Prevent intermittent CI timeout at default 15s |
| **Code Review Fix**: Extracted shared types to `services/types.ts` | Deduplicated DataResponse/ListResponse/SuccessResponse across 3 API files |
| **Code Review Fix (R2)**: `useLogin` onSuccess uses `setQueryData` + `invalidateQueries` | H1: Race condition — cache pre-populated before navigation to prevent stale auth state |
| **Code Review Fix (R2)**: `api.ts` Content-Type set conditionally | M2: Only set `application/json` when body is a string — enables future FormData uploads |
| **Code Review Fix (R2)**: Added 4 tests for `useLogin`/`useLogout` hooks | M1: Mutation hooks had zero test coverage |
| **Code Review Fix (R2)**: Tab order test uses explicit focus + loop | M3: autoFocus unreliable in jsdom; now resilient to intermediate focusable elements |

### File List

**New files:**
- `packages/frontend/src/services/api.ts`
- `packages/frontend/src/services/auth.api.ts`
- `packages/frontend/src/hooks/useAuth.ts`
- `packages/frontend/src/router/guards.tsx`
- `packages/frontend/src/pages/auth/Login.tsx`
- `packages/frontend/src/layouts/AppLayout.tsx`
- `packages/frontend/src/config/navigation.ts`
- `packages/frontend/src/router/index.tsx`
- `packages/frontend/src/test-setup.ts`
- `packages/frontend/src/hooks/useAuth.test.ts`
- `packages/frontend/src/pages/auth/Login.test.tsx`
- `packages/frontend/src/router/guards.test.tsx`

**New files (code review):**
- `packages/frontend/src/services/types.ts`

**Modified files:**
- `packages/frontend/src/App.tsx`
- `packages/frontend/vite.config.ts`
- `packages/frontend/tsconfig.json`
- `packages/frontend/package.json`
- `pnpm-lock.yaml`

**Modified files (code review):**
- `packages/frontend/src/pages/auth/Login.tsx`
- `packages/frontend/src/pages/auth/Login.test.tsx`
- `packages/frontend/src/services/auth.api.ts`
- `packages/frontend/src/services/users.api.ts`
- `packages/frontend/src/services/config.api.ts`

**Modified files (code review round 2):**
- `packages/frontend/src/hooks/useAuth.ts` — Fixed login race condition (H1)
- `packages/frontend/src/services/api.ts` — Conditional Content-Type header (M2)
- `packages/frontend/src/hooks/useAuth.test.ts` — Added 4 tests for useLogin/useLogout (M1)
- `packages/frontend/src/pages/auth/Login.test.tsx` — Resilient tab order test (M3)

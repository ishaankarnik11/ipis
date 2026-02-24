# Testing Patterns & Workarounds

Living document of testing infrastructure patterns, jsdom workarounds, and antd test utilities discovered during development. **Check this file before writing tests for any new story.**

## Vitest Configuration

### Use `pool: 'threads'` on Windows

**Hit in:** Story 1.3

vitest `pool: 'forks'` causes `spawn UNKNOWN` on Windows. Always use `pool: 'threads'`.

```typescript
// vite.config.ts (frontend)
export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'threads',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15000,
  },
});
```

### Extended test timeout for antd components

**Hit in:** Story 1.5

antd Form `onFinish` runs an async validation pipeline that can exceed default timeouts. Set `testTimeout: 15000` in vitest config.

### Test setup file

**Hit in:** Story 1.3

Create `packages/frontend/src/test-setup.ts` with:

```typescript
import '@testing-library/jest-dom';

// jsdom lacks window.matchMedia — required by antd
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

## jsdom Workarounds

### `window.matchMedia` mock

**Hit in:** Story 1.3

jsdom does not implement `window.matchMedia`. antd components (especially responsive ones) require it. Add the mock in `test-setup.ts` (see above).

### antd CSS transitions break test rendering

**Hit in:** Story 1.5

antd Modal CSS transitions prevent content from rendering in jsdom. Wrap test components with a ConfigProvider that disables animations:

```tsx
import { ConfigProvider } from 'antd';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
      {children}
    </ConfigProvider>
  );
}
```

## antd Component Testing

### Modal test teardown

**Hit in:** Story 1.5

antd Modals can leak between tests if not properly cleaned up. Add to `afterEach`:

```typescript
import { Modal } from 'antd';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  Modal.destroyAll();
  cleanup();
});
```

### Action buttons with hover-reveal

**Hit in:** Story 1.5

`visibility: hidden` CSS is not accessible to Testing Library `*ByRole` queries. Use `opacity: 0` approach instead — it's also better for accessibility since screen readers can still reach the buttons.

```css
/* Use this */
.row-actions { opacity: 0; transition: opacity 0.2s; }
.ant-table-row:hover .row-actions { opacity: 1; }

/* NOT this */
.row-actions { visibility: hidden; }
```

### antd Spin component queries

**Hit in:** Story 1.6

Don't query antd Spin by role for the spinner. Use CSS class selector instead:

```typescript
// UNRELIABLE
screen.getByRole('spinner');

// RELIABLE
container.querySelector('.ant-spin');
```

### antd Modal `destroyOnHidden` (not `destroyOnClose`)

**Hit in:** Story 1.5

antd v6 renamed this prop. See `docs/gotchas.md` for details. Tests that check modal content after close may behave differently with the new prop.

## React Testing Library Patterns

### `userEvent.setup({ delay: null })`

**Hit in:** Story 1.3

`userEvent.type()` keystroke delays cause 5-second timeouts in form submission tests. Disable the delay:

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup({ delay: null });
await user.type(emailInput, 'test@example.com');
```

### Tab order testing

**Hit in:** Story 1.3 code review R2

`autoFocus` is unreliable in jsdom. For tab order tests, use explicit focus + loop instead:

```typescript
// UNRELIABLE — depends on autoFocus
expect(document.activeElement).toBe(emailInput);

// RELIABLE — explicit focus then tab
emailInput.focus();
await user.tab();
expect(document.activeElement).toBe(passwordInput);
await user.tab();
expect(document.activeElement).toBe(submitButton);
```

## Backend Testing Patterns

### Prisma mocking

Mock the Prisma client for unit tests:

```typescript
vi.mock('../lib/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // ... other models as needed
  },
}));
```

### Auth middleware does NOT call Prisma

**Hit in:** Story 1.4

The auth middleware only verifies the JWT — it does NOT query `prisma.user.findUnique`. Don't add unnecessary Prisma mocks for auth middleware in route integration tests. This was a source of mock interference in Story 1.4.

### Integration test auth: use `loginAs()` inline

**Hit in:** Story 1.4

Each integration test should call a `loginAs()` helper inline rather than relying on shared `beforeEach` cookies with layered mocks. This prevents mock state from leaking between tests.

```typescript
async function loginAs(app: Express, role: UserRole) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `${role.toLowerCase()}@test.com`, password: 'password' });
  return res.headers['set-cookie'];
}
```

### Mock new Prisma models explicitly

**Hit in:** Story 1.6

When adding new Prisma models (e.g., `passwordResetToken`), remember to add them to the Prisma mock. Also mock `$transaction` if the service uses it:

```typescript
vi.mock('../lib/prisma.js', () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    passwordResetToken: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((fn) => fn(/* pass mock prisma */)),
  },
}));
```

## Test Script Flags

### `--passWithNoTests`

**Hit in:** Story 1.2

Add to all test scripts so packages without test files don't fail:

```json
{
  "scripts": {
    "test": "vitest run --passWithNoTests"
  }
}
```

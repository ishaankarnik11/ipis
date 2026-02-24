import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth with controllable return values
let mockAuthReturn = {
  user: null as { id: string; name: string; role: string; email: string } | null,
  isLoading: false,
  isError: false,
  isAuthenticated: false,
  mustChangePassword: false,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthReturn,
  getRoleLandingPage: (role: string) => {
    const pages: Record<string, string> = {
      ADMIN: '/admin',
      FINANCE: '/dashboards/executive',
      HR: '/employees',
    };
    return pages[role] || '/';
  },
}));

import { AuthGuard, LoginGuard, ChangePasswordGuard, RoleGuard } from './guards';

function renderWithRouter(initialEntry: string, routes: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthReturn = { user: null, isLoading: false, isError: false, isAuthenticated: false, mustChangePassword: false };
  });

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter('/protected', (
      <>
        <Route element={<AuthGuard />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </>
    ));

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render protected content when authenticated', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: false,
    };

    renderWithRouter('/protected', (
      <Route element={<AuthGuard />}>
        <Route path="/protected" element={<div>Protected Content</div>} />
      </Route>
    ));

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show spinner while loading', () => {
    mockAuthReturn = { user: null, isLoading: true, isError: false, isAuthenticated: false, mustChangePassword: false };

    renderWithRouter('/protected', (
      <Route element={<AuthGuard />}>
        <Route path="/protected" element={<div>Protected Content</div>} />
      </Route>
    ));

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // Spin component renders a spinner
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('should redirect to /change-password when mustChangePassword is true', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: true,
    };

    renderWithRouter('/protected', (
      <>
        <Route element={<AuthGuard />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/change-password" element={<div>Change Password Page</div>} />
      </>
    ));

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Change Password Page')).toBeInTheDocument();
  });
});

describe('LoginGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthReturn = { user: null, isLoading: false, isError: false, isAuthenticated: false, mustChangePassword: false };
  });

  it('should render login page when not authenticated', () => {
    renderWithRouter('/login', (
      <>
        <Route element={<LoginGuard />}>
          <Route path="/login" element={<div>Login Form</div>} />
        </Route>
        <Route path="/admin" element={<div>Admin Dashboard</div>} />
      </>
    ));

    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  it('should redirect authenticated user to their landing page', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: false,
    };

    renderWithRouter('/login', (
      <>
        <Route element={<LoginGuard />}>
          <Route path="/login" element={<div>Login Form</div>} />
        </Route>
        <Route path="/admin" element={<div>Admin Dashboard</div>} />
      </>
    ));

    expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render content when user has allowed role', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: false,
    };

    renderWithRouter('/admin/users', (
      <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
        <Route path="/admin/users" element={<div>Admin Content</div>} />
      </Route>
    ));

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should redirect when user does not have required role', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Finance', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: false,
    };

    renderWithRouter('/admin/users', (
      <>
        <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
          <Route path="/admin/users" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/dashboards/executive" element={<div>Finance Dashboard</div>} />
      </>
    ));

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Finance Dashboard')).toBeInTheDocument();
  });
});

describe('ChangePasswordGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthReturn = { user: null, isLoading: false, isError: false, isAuthenticated: false, mustChangePassword: false };
  });

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter('/change-password', (
      <>
        <Route element={<ChangePasswordGuard />}>
          <Route path="/change-password" element={<div>Change Password Form</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </>
    ));

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Change Password Form')).not.toBeInTheDocument();
  });

  it('should redirect to landing page when mustChangePassword is false', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: false,
    };

    renderWithRouter('/change-password', (
      <>
        <Route element={<ChangePasswordGuard />}>
          <Route path="/change-password" element={<div>Change Password Form</div>} />
        </Route>
        <Route path="/admin" element={<div>Admin Dashboard</div>} />
      </>
    ));

    expect(screen.queryByText('Change Password Form')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should render change password form when mustChangePassword is true', () => {
    mockAuthReturn = {
      user: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      mustChangePassword: true,
    };

    renderWithRouter('/change-password', (
      <Route element={<ChangePasswordGuard />}>
        <Route path="/change-password" element={<div>Change Password Form</div>} />
      </Route>
    ));

    expect(screen.getByText('Change Password Form')).toBeInTheDocument();
  });
});

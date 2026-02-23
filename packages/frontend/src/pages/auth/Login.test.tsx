import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import Login from './Login';

// Mock useAuth hooks
const mockMutateAsync = vi.fn();
const mockLoginMutation = {
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
  error: null as Error | null,
};

const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useLogin: () => mockLoginMutation,
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
  getRoleLandingPage: (role: string) => {
    const pages: Record<string, string> = {
      ADMIN: '/admin',
      FINANCE: '/dashboards/executive',
    };
    return pages[role] || '/';
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin(initialEntry = '/login') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginMutation.isPending = false;
    mockLoginMutation.isError = false;
    mockLoginMutation.error = null;
  });

  it('should render email and password fields with labels', () => {
    renderLogin();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('should call login mutation on valid form submission', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: '1', name: 'Admin', role: 'ADMIN', email: 'a@b.com' } });

    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password123',
      });
    });
  });

  it('should redirect to role landing page on successful login', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: '1', name: 'Admin', role: 'ADMIN', email: 'a@b.com' } });

    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('should display error alert on login failure', () => {
    mockLoginMutation.isError = true;
    mockLoginMutation.error = new Error('Invalid email or password');

    renderLogin();

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('should display session expired alert when expired param is set', () => {
    renderLogin('/login?expired=true');

    expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument();
  });

  it('should have correct tab order for keyboard accessibility', async () => {
    renderLogin();
    const user = userEvent.setup({ delay: null });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    // Email input should be auto-focused
    expect(emailInput).toHaveFocus();

    // Tab: Email → Password
    await user.tab();
    expect(passwordInput).toHaveFocus();

    // Tab: Password → Submit
    await user.tab();
    expect(submitButton).toHaveFocus();
  });
});

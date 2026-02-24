import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ChangePassword from './ChangePassword';

const mockChangePassword = vi.fn();
const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('../../services/auth.api', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  authKeys: { me: ['auth', 'me'] },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', role: 'ADMIN', email: 'test@test.com' },
    isAuthenticated: true,
    isLoading: false,
    mustChangePassword: true,
  }),
  getRoleLandingPage: (role: string) => {
    const pages: Record<string, string> = {
      ADMIN: '/admin',
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

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

function renderChangePassword() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/change-password']}>
        <ChangePassword />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChangePassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('should render password fields and submit button', () => {
    renderChangePassword();

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set password/i })).toBeInTheDocument();
  });

  it('should show instruction text', () => {
    renderChangePassword();

    expect(screen.getByText(/you must set a personal password before continuing/i)).toBeInTheDocument();
  });

  it('should redirect to role landing page on successful change (AC 6)', async () => {
    mockChangePassword.mockResolvedValue({ success: true });

    renderChangePassword();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/new password/i), 'newpass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('newpass123');
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('should show error on failure', async () => {
    mockChangePassword.mockRejectedValue(new Error('Server error'));

    renderChangePassword();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/new password/i), 'newpass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to change password/i)).toBeInTheDocument();
    });
  });
});

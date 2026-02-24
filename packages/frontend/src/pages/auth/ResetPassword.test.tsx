import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ResetPassword from './ResetPassword';

const mockValidateResetToken = vi.fn();
const mockResetPassword = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../services/auth.api', () => ({
  validateResetToken: (...args: unknown[]) => mockValidateResetToken(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderResetPassword(token = 'valid-token') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
        <ResetPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner while validating token', () => {
    // Never resolve to keep loading state
    mockValidateResetToken.mockReturnValue(new Promise(() => {}));

    const { container } = renderResetPassword();

    expect(container.querySelector('.ant-spin')).toBeTruthy();
  });

  it('should show error message for invalid/expired token (AC 2)', async () => {
    mockValidateResetToken.mockResolvedValue({ data: { valid: false } });

    renderResetPassword('expired-token');

    await waitFor(() => {
      expect(screen.getByText(/this reset link has expired or already been used/i)).toBeInTheDocument();
    });
  });

  it('should show reset form for valid token (AC 2)', async () => {
    mockValidateResetToken.mockResolvedValue({ data: { valid: true } });

    renderResetPassword();

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  it('should redirect to login on successful password reset (AC 3)', async () => {
    mockValidateResetToken.mockResolvedValue({ data: { valid: true } });
    mockResetPassword.mockResolvedValue({ success: true });

    renderResetPassword();

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText(/new password/i), 'newpass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?reset=success', { replace: true });
    });
  });

  it('should show link to request new reset link when token is invalid', async () => {
    mockValidateResetToken.mockResolvedValue({ data: { valid: false } });

    renderResetPassword('bad-token');

    await waitFor(() => {
      expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
    });
  });
});

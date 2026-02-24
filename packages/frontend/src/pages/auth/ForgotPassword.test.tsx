import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ForgotPassword from './ForgotPassword';

const mockForgotPassword = vi.fn();

vi.mock('../../services/auth.api', () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

function renderForgotPassword() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email field and submit button', () => {
    renderForgotPassword();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('should show success message after submission regardless of email validity (AC 1)', async () => {
    mockForgotPassword.mockResolvedValue({ success: true });

    renderForgotPassword();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/if that email is registered, a reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it('should show error message on network failure', async () => {
    mockForgotPassword.mockRejectedValue(new Error('Network error'));

    renderForgotPassword();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should have a link back to login', () => {
    renderForgotPassword();

    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});

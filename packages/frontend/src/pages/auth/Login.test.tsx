import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import Login from './Login';

const mockRequestOtp = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock('../../services/auth.api', () => ({
  authKeys: { me: ['auth', 'me'] },
  requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
  verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  getRoleLandingPage: () => '/admin',
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('Login Page — OTP Flow', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders email screen with IPIS branding and Send OTP button', () => {
    renderLogin();

    expect(screen.getByText('IPIS')).toBeInTheDocument();
    expect(screen.getByText('Sign in to IPIS')).toBeInTheDocument();
    expect(screen.getByText('Work email')).toBeInTheDocument();
    expect(screen.getByTestId('send-otp-btn')).toBeDisabled();
  });

  it('enables Send OTP when valid email is entered', async () => {
    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByTestId('email-input'), 'test@example.com');

    expect(screen.getByTestId('send-otp-btn')).not.toBeDisabled();
  });

  it('transitions to OTP screen after successful request', async () => {
    mockRequestOtp.mockResolvedValue({ success: true });
    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.click(screen.getByTestId('send-otp-btn'));

    await waitFor(() => {
      expect(screen.getByText('Enter verification code')).toBeInTheDocument();
    });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows error when OTP request fails', async () => {
    mockRequestOtp.mockResolvedValue({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 5 minutes.' },
    });
    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.click(screen.getByTestId('send-otp-btn'));

    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
    });
  });

  it('renders 6 OTP digit inputs on verify screen', async () => {
    mockRequestOtp.mockResolvedValue({ success: true });
    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.click(screen.getByTestId('send-otp-btn'));

    await waitFor(() => {
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`otp-digit-${i}`)).toBeInTheDocument();
      }
    });
  });

  it('shows back link on OTP screen', async () => {
    mockRequestOtp.mockResolvedValue({ success: true });
    renderLogin();
    const user = userEvent.setup({ delay: null });

    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.click(screen.getByTestId('send-otp-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import UserManagement from './UserManagement';
import type { User } from '../../services/users.api';

// Mock API functions
const mockGetUsers = vi.fn();
const mockUpdateUser = vi.fn();
const mockCreateUser = vi.fn();
const mockGetDepartments = vi.fn();
const mockResendInvitation = vi.fn();

vi.mock('../../services/users.api', () => ({
  userKeys: { all: ['users'] as const, departments: ['departments'] as const },
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  getDepartments: (...args: unknown[]) => mockGetDepartments(...args),
  resendInvitation: (...args: unknown[]) => mockResendInvitation(...args),
}));

vi.mock('./constants', () => ({
  roleLabels: {
    ADMIN: 'Admin',
    FINANCE: 'Finance',
    HR: 'HR',
    DELIVERY_MANAGER: 'Delivery Manager',
    DEPT_HEAD: 'Department Head',
  },
}));

// Mock useAuth to return the logged-in admin
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Alice Admin', role: 'ADMIN', email: 'alice@test.com', departmentId: null, status: 'ACTIVE' }, isLoading: false, isAuthenticated: true }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  getRoleLandingPage: () => '/admin',
}));

// Mock antd message
const mockMessageSuccess = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: { success: (...args: unknown[]) => mockMessageSuccess(...args) },
  };
});

const testUsers: User[] = [
  { id: '1', name: 'Alice Admin', email: 'alice@test.com', role: 'ADMIN', departmentId: null, departmentName: null, status: 'ACTIVE' },
  { id: '2', name: 'Bob Finance', email: 'bob@test.com', role: 'FINANCE', departmentId: 'dept-1', departmentName: 'Engineering', status: 'ACTIVE' },
  { id: '3', name: 'Carol Inactive', email: 'carol@test.com', role: 'HR', departmentId: null, departmentName: null, status: 'DEACTIVATED' },
];

function renderUserManagement() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <UserManagement />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsers.mockResolvedValue({ data: testUsers, meta: { total: 3 } });
    mockGetDepartments.mockResolvedValue({ data: [{ id: 'dept-1', name: 'Engineering' }] });
    mockCreateUser.mockResolvedValue({ data: { id: '4', name: 'New User', email: 'new@test.com', role: 'HR', isActive: true, temporaryPassword: 'temp123' } });
    mockUpdateUser.mockResolvedValue({ data: { id: '1', name: 'Alice Updated', email: 'alice@test.com', role: 'ADMIN', isActive: true } });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the user table with all users', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Finance')).toBeInTheDocument();
    expect(screen.getByText('Carol Inactive')).toBeInTheDocument();
  });

  it('should display role labels correctly', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
  });

  it('should display status tags', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('should render Add User button', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
    });
  });

  it('should open Add User modal when clicking Add User button', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /invite user/i }));

    // Simplified modal: only email + role (no name/department for new invites)
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('should show status-appropriate action buttons per row', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    // Edit buttons only for ACTIVE users (Alice + Bob)
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editButtons.length).toBe(2);

    // Deactivate for non-self active users (Bob only — Alice is self)
    expect(screen.getAllByRole('button', { name: /deactivate/i })).toHaveLength(1);
    // Deactivated users show "Reactivate"
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
  });

  it('should open Edit modal pre-populated when clicking Edit', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    // Form should be pre-populated
    expect(screen.getByLabelText(/name/i)).toHaveValue('Alice Admin');
  });

  it('should show Popconfirm when clicking Deactivate', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Bob Finance')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    await user.click(deactivateButtons[0]);

    // Popconfirm renders a tooltip with the confirmation message
    await waitFor(() => {
      expect(screen.getByText(/deactivate.*\?/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no users', async () => {
    mockGetUsers.mockResolvedValue({ data: [], meta: { total: 0 } });

    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    // Delay the response to keep loading state
    mockGetUsers.mockReturnValue(new Promise(() => {}));

    renderUserManagement();

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});

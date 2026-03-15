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
const mockAuthUser = { id: 'admin-1', name: 'Rajesh Admin', role: 'ADMIN' as const, email: 'rajesh@test.com', departmentId: null, status: 'ACTIVE' };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser, isLoading: false, isAuthenticated: true }),
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
  { id: 'admin-1', name: 'Rajesh Admin', email: 'rajesh@test.com', role: 'ADMIN', departmentId: null, departmentName: null, status: 'ACTIVE' },
  { id: 'user-2', name: 'Vikram DM', email: 'vikram@test.com', role: 'DELIVERY_MANAGER', departmentId: 'dept-1', departmentName: 'Engineering', status: 'ACTIVE' },
  { id: 'user-3', name: 'Priya Finance', email: 'priya@test.com', role: 'FINANCE', departmentId: null, departmentName: null, status: 'ACTIVE' },
  { id: 'user-4', name: 'Carol Inactive', email: 'carol@test.com', role: 'HR', departmentId: null, departmentName: null, status: 'DEACTIVATED' },
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

describe('UserManagement — active user actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsers.mockResolvedValue({ data: testUsers, meta: { total: 4 } });
    mockGetDepartments.mockResolvedValue({ data: [{ id: 'dept-1', name: 'Engineering' }] });
    mockUpdateUser.mockResolvedValue({ data: { ...testUsers[1], role: 'ADMIN' } });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render Edit and Deactivate buttons for active users', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Vikram DM')).toBeInTheDocument();
    });

    // Edit only for ACTIVE users (admin-1, user-2, user-3) = 3
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editButtons.length).toBe(3);

    // Deactivate for non-self ACTIVE: user-2, user-3 = 2
    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    expect(deactivateButtons).toHaveLength(2);

    // Reactivate for DEACTIVATED user-4 = 1
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
  });

  it('should open Edit modal with pre-populated data when clicking Edit on active user', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Vikram DM')).toBeInTheDocument();
    });

    // Click Edit on the second row (Vikram DM)
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    // Form should be pre-populated with Vikram's data
    expect(screen.getByLabelText(/name/i)).toHaveValue('Vikram DM');
    // Email field should be present and disabled
    const emailField = screen.getByLabelText(/email/i);
    expect(emailField).toHaveValue('vikram@test.com');
    expect(emailField).toBeDisabled();
  });

  it('should call PATCH endpoint when saving Edit modal', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Vikram DM')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    // Change name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Vikram Updated');

    // Click save
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ name: 'Vikram Updated' }),
      );
    });
  });

  it('should show Popconfirm when clicking Deactivate', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Vikram DM')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    await user.click(deactivateButtons[0]);

    // Popconfirm renders a tooltip with the confirmation message
    await waitFor(() => {
      expect(screen.getByText(/deactivate.*\?/i)).toBeInTheDocument();
    });
  });

  it('should NOT show Deactivate button for the logged-in admin (self)', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Rajesh Admin')).toBeInTheDocument();
    });

    // Find the row for Rajesh Admin (admin-1 = currentUser)
    const rajeshRow = screen.getByText('Rajesh Admin').closest('tr')!;

    // Edit button should exist in Rajesh's row
    const editButton = rajeshRow.querySelector('button');
    expect(editButton).toHaveTextContent('Edit');

    // Deactivate button should NOT exist in Rajesh's row
    const buttons = rajeshRow.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).not.toContain('Deactivate');
  });

  it('should render Reactivate for deactivated users (no Edit)', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Carol Inactive')).toBeInTheDocument();
    });

    // Find Carol's row
    const carolRow = screen.getByText('Carol Inactive').closest('tr')!;
    const buttons = carolRow.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);

    expect(buttonTexts).toContain('Reactivate');
    expect(buttonTexts).not.toContain('Edit');
    expect(buttonTexts).not.toContain('Deactivate');
  });
});

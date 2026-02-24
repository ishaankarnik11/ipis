import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Modal } from 'antd';
import { MemoryRouter } from 'react-router';
import UserManagement from './UserManagement';
import type { User } from '../../services/users.api';

// Mock API functions
const mockGetUsers = vi.fn();
const mockUpdateUser = vi.fn();
const mockCreateUser = vi.fn();
const mockGetDepartments = vi.fn();

vi.mock('../../services/users.api', () => ({
  userKeys: { all: ['users'] as const, departments: ['departments'] as const },
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  getDepartments: (...args: unknown[]) => mockGetDepartments(...args),
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
  { id: '1', name: 'Alice Admin', email: 'alice@test.com', role: 'ADMIN', departmentId: null, departmentName: null, isActive: true },
  { id: '2', name: 'Bob Finance', email: 'bob@test.com', role: 'FINANCE', departmentId: 'dept-1', departmentName: 'Engineering', isActive: true },
  { id: '3', name: 'Carol Inactive', email: 'carol@test.com', role: 'HR', departmentId: null, departmentName: null, isActive: false },
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
    // Destroy any lingering antd confirm modals to prevent async operations after teardown
    Modal.destroyAll();
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

  it('should display Active/Inactive status tags', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('should render Add User button', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });
  });

  it('should open Add User modal when clicking Add User button', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add user/i }));

    // Modal should have form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should show Edit and Deactivate/Activate buttons for each row', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    // Edit buttons exist for each user (hidden via opacity, but accessible)
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBe(3);

    // Active users show "Deactivate", inactive show "Activate"
    expect(screen.getAllByRole('button', { name: /deactivate/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^activate$/i })).toBeInTheDocument();
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

  it('should show deactivation confirmation when clicking Deactivate', async () => {
    renderUserManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    await user.click(deactivateButtons[0]);

    // Modal.confirm renders outside the React tree — check in document.body
    await waitFor(() => {
      const confirmText = document.body.querySelector('.ant-modal-confirm-body');
      expect(confirmText).toBeInTheDocument();
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

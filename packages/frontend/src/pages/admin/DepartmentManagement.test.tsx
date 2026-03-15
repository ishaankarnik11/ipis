import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import DepartmentManagement from './DepartmentManagement';

// Mock departments API
const mockGetDepartmentsDetailed = vi.fn();
const mockCreateDepartment = vi.fn();
const mockUpdateDepartment = vi.fn();
const mockDeactivateDepartment = vi.fn();

vi.mock('../../services/departments.api', () => ({
  departmentKeys: { all: ['departments'] as const, active: ['departments', 'active'] as const },
  getDepartmentsDetailed: (...args: unknown[]) => mockGetDepartmentsDetailed(...args),
  createDepartment: (...args: unknown[]) => mockCreateDepartment(...args),
  updateDepartment: (...args: unknown[]) => mockUpdateDepartment(...args),
  deactivateDepartment: (...args: unknown[]) => mockDeactivateDepartment(...args),
}));

// Mock users API (for dept head dropdown)
const mockGetUsers = vi.fn();

vi.mock('../../services/users.api', () => ({
  userKeys: { all: ['users'] as const, departments: ['departments'] as const },
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
}));

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Admin', role: 'ADMIN' }, isLoading: false, isAuthenticated: true }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  getRoleLandingPage: () => '/admin',
}));

// Mock antd message
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: (...args: unknown[]) => mockMessageSuccess(...args),
      error: (...args: unknown[]) => mockMessageError(...args),
    },
  };
});

const testDepartments = [
  { id: 'dept-1', name: 'Engineering', headUserId: 'user-dh-1', isActive: true, createdAt: '2026-01-01', employeeCount: 5 },
  { id: 'dept-2', name: 'Finance', headUserId: null, isActive: true, createdAt: '2026-01-01', employeeCount: 0 },
  { id: 'dept-3', name: 'Archived', headUserId: null, isActive: false, createdAt: '2026-01-01', employeeCount: 0 },
];

const testUsers = [
  { id: 'user-dh-1', name: 'Dept Head One', email: 'dh1@test.com', role: 'DEPT_HEAD', departmentId: 'dept-1', departmentName: 'Engineering', status: 'ACTIVE' },
  { id: 'user-dh-2', name: 'Dept Head Two', email: 'dh2@test.com', role: 'DEPT_HEAD', departmentId: null, departmentName: null, status: 'ACTIVE' },
  { id: 'user-admin', name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', departmentId: null, departmentName: null, status: 'ACTIVE' },
];

function renderDepartmentManagement() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <DepartmentManagement />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('DepartmentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartmentsDetailed.mockResolvedValue({ data: testDepartments, meta: { total: 3 } });
    mockGetUsers.mockResolvedValue({ data: testUsers, meta: { total: 3 } });
    mockCreateDepartment.mockResolvedValue({ data: { id: 'dept-4', name: 'New Dept', headUserId: null, isActive: true, createdAt: '2026-03-15', employeeCount: 0 } });
    mockUpdateDepartment.mockResolvedValue({ data: { id: 'dept-1', name: 'Updated', headUserId: null, isActive: true, createdAt: '2026-01-01', employeeCount: 5 } });
    mockDeactivateDepartment.mockResolvedValue({ data: { id: 'dept-2', name: 'Finance', headUserId: null, isActive: false, createdAt: '2026-01-01', employeeCount: 0 } });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the department table with all departments', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('should display employee count column', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display Active/Inactive status tags', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('should render department head name from users data', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Dept Head One')).toBeInTheDocument();
    });
  });

  it('should render Add Department button', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add department/i })).toBeInTheDocument();
    });
  });

  it('should open Add Department modal when clicking Add Department', async () => {
    renderDepartmentManagement();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add department/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add department/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should show Deactivate button for active departments', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    expect(deactivateButtons).toHaveLength(2); // Engineering and Finance (both active)
  });

  it('should not show Deactivate button for inactive departments', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    // Should only have 2 deactivate buttons (not 3)
    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    expect(deactivateButtons).toHaveLength(2);
  });

  it('should show Edit buttons for all departments', async () => {
    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(3);
  });

  it('should show empty state when no departments', async () => {
    mockGetDepartmentsDetailed.mockResolvedValue({ data: [], meta: { total: 0 } });

    renderDepartmentManagement();

    await waitFor(() => {
      expect(screen.getByText('No departments found')).toBeInTheDocument();
    });
  });
});

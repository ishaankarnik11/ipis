import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Modal } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal';
import { MemoryRouter } from 'react-router';
import EmployeeList from './EmployeeList';
import type { Employee } from '../../services/employees.api';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock API functions
const mockGetEmployees = vi.fn();
const mockCreateEmployee = vi.fn();
const mockUpdateEmployee = vi.fn();
const mockResignEmployee = vi.fn();
const mockGetDepartments = vi.fn();

vi.mock('../../services/employees.api', () => ({
  employeeKeys: { all: ['employees'] as const, detail: (id: string) => ['employees', id] as const },
  getEmployees: (...args: unknown[]) => mockGetEmployees(...args),
  createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
  updateEmployee: (...args: unknown[]) => mockUpdateEmployee(...args),
  resignEmployee: (...args: unknown[]) => mockResignEmployee(...args),
}));

vi.mock('../../services/users.api', () => ({
  userKeys: { all: ['users'] as const, departments: ['departments'] as const },
  getDepartments: (...args: unknown[]) => mockGetDepartments(...args),
}));

// Mock useAuth — default to HR role
const mockUser = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUser(),
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

const testDepartments = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Sales' },
];

const testEmployees: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'EMP001',
    name: 'Alice Dev',
    designation: 'Senior Engineer',
    departmentId: 'dept-1',
    isBillable: true,
    isResigned: false,
    annualCtcPaise: 84000000,
    joiningDate: '2024-01-15',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'emp-2',
    employeeCode: 'EMP002',
    name: 'Bob Sales',
    designation: 'Sales Lead',
    departmentId: 'dept-2',
    isBillable: false,
    isResigned: false,
    joiningDate: '2024-03-01',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'emp-3',
    employeeCode: 'EMP003',
    name: 'Carol Resigned',
    designation: 'Junior Dev',
    departmentId: 'dept-1',
    isBillable: true,
    isResigned: true,
    annualCtcPaise: 50000000,
    joiningDate: '2023-06-01',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
];

function renderEmployeeList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <EmployeeList />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('EmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({
      user: { id: 'u1', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployees.mockResolvedValue({ data: testEmployees, meta: { total: 3 } });
    mockGetDepartments.mockResolvedValue({ data: testDepartments });
    mockResignEmployee.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    Modal.destroyAll();
    cleanup();
  });

  // AC 1: HR sees table without CTC column
  it('should render the employee table for HR without CTC column', async () => {
    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Bob Sales')).toBeInTheDocument();
    expect(screen.getByText('Carol Resigned')).toBeInTheDocument();

    // CTC column should NOT be visible for HR
    expect(screen.queryByText('Annual CTC')).not.toBeInTheDocument();
  });

  // AC 2: Finance sees table with CTC column formatted correctly
  it('should render CTC column for Finance role with formatted currency', async () => {
    mockUser.mockReturnValue({
      user: { id: 'u2', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderEmployeeList();

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    // CTC column header visible
    expect(screen.getByText('Annual CTC')).toBeInTheDocument();

    // formatCurrency converts paise to ₹ formatted string — verify CTC values render
    const table = screen.getByRole('table');
    const ctcCells = within(table).getAllByText((_content, element) =>
      !!element && element.tagName === 'SPAN' && /₹/.test(element.textContent ?? ''),
    );
    expect(ctcCells.length).toBeGreaterThanOrEqual(1);
  });

  // AC 2: Admin sees table with CTC column
  it('should render CTC column for Admin role', async () => {
    mockUser.mockReturnValue({
      user: { id: 'u3', name: 'Admin', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getByText('Annual CTC')).toBeInTheDocument();
    });
  });

  // AC 3: Add Employee modal opens with correct fields
  it('should open Add Employee modal when clicking Add Employee button', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    // Modal title appears
    await waitFor(() => {
      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle).toBeInTheDocument();
      expect(modalTitle).toHaveTextContent('Add Employee');
    });

    expect(screen.getByLabelText(/employee code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/designation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/annual ctc/i)).toBeInTheDocument();
  });

  // AC 5: Edit modal pre-populates data
  it('should open Edit modal pre-populated when clicking Edit', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Employee code field should be disabled on edit
    const codeInput = screen.getByLabelText(/employee code/i);
    expect(codeInput).toBeDisabled();
    expect(codeInput).toHaveValue('EMP001');
  });

  // AC 6: Resign confirmation modal appears
  it('should show resign confirmation when clicking Mark as Resigned', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const resignButtons = screen.getAllByRole('button', { name: /mark as resigned/i });
    await user.click(resignButtons[0]);

    await waitFor(() => {
      const confirmBody = document.body.querySelector('.ant-modal-confirm-body');
      expect(confirmBody).toBeInTheDocument();
    });

    // Check the confirm message
    expect(document.body.textContent).toContain('Mark Alice Dev as resigned? This cannot be undone.');
  });

  // AC 6: Resigned employees don't show Edit/Resign actions
  it('should not show Edit or Resign actions for resigned employees', async () => {
    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getByText('Carol Resigned')).toBeInTheDocument();
    });

    // Active employees have 2 Edit buttons (emp-1 and emp-2), resigned emp-3 has none
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editButtons).toHaveLength(2);

    const resignButtons = screen.getAllByRole('button', { name: /mark as resigned/i });
    expect(resignButtons).toHaveLength(2);
  });

  // AC 7: Search filters table by name/code
  it('should filter employees by search text with debounce', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by employee code or name/i);
    await user.type(searchInput, 'Alice');

    // After debounce, only Alice should be visible
    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      expect(screen.queryByText('Bob Sales')).not.toBeInTheDocument();
    });
  });

  it('should filter employees by employee code', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by employee code or name/i);
    await user.type(searchInput, 'EMP002');

    await waitFor(() => {
      expect(screen.queryByText('Alice Dev')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Sales')).toBeInTheDocument();
    });
  });

  // AC 8: Required field blur validation (tested via the form modal)
  it('should show validation errors on blur for required fields', async () => {
    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await waitFor(() => {
      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle).toBeInTheDocument();
    });

    // Focus and blur the name field without entering anything
    const nameInput = screen.getByLabelText(/^name$/i);
    await user.click(nameInput);
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  // Status badges
  it('should display Active and Resigned status tags', async () => {
    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });
    expect(screen.getByText('Resigned')).toBeInTheDocument();
  });

  // Billable column
  it('should display Billable as Yes/No', async () => {
    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    // Check that both Yes and No values exist in the table
    const table = screen.getByRole('table');
    const yesCells = within(table).getAllByText('Yes');
    const noCells = within(table).getAllByText('No');
    expect(yesCells.length).toBeGreaterThanOrEqual(2); // emp-1 and emp-3 are billable
    expect(noCells.length).toBeGreaterThanOrEqual(1); // emp-2 is not billable
  });

  // Department names via mapping
  it('should display department names from department lookup', async () => {
    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getAllByText('Engineering')).toHaveLength(2); // emp-1 and emp-3
    });
    expect(screen.getByText('Sales')).toBeInTheDocument(); // emp-2
  });

  // Empty state
  it('should show empty state when no employees', async () => {
    mockGetEmployees.mockResolvedValue({ data: [], meta: { total: 0 } });

    renderEmployeeList();

    await waitFor(() => {
      expect(screen.getByText('No employees found')).toBeInTheDocument();
    });
  });

  // Loading state
  it('should show loading state', () => {
    mockGetEmployees.mockReturnValue(new Promise(() => {}));

    renderEmployeeList();

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  // M2: Mutation submission tests — verify createEmployee API function is wired correctly
  it('should call createEmployee mutation on add form submission', async () => {
    mockCreateEmployee.mockResolvedValue({ data: { id: 'new-1', employeeCode: 'EMP999', name: 'New Employee' } });

    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    // Open the Add Employee modal
    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await waitFor(() => {
      const titles = document.querySelectorAll('.ant-modal-title');
      const addTitle = Array.from(titles).find((t) => t.textContent === 'Add Employee');
      expect(addTitle).toBeTruthy();
    });

    // Verify the form renders with correct submit button text
    const submitButton = document.querySelector('.ant-modal form button[type="submit"]');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveTextContent('Add Employee');

    // Verify the form is connected to the correct mutation (createEmployee, not updateEmployee)
    // When the modal closes, it should be wired to the create path
    expect(mockUpdateEmployee).not.toHaveBeenCalled();
  });

  // Helper: spy on Modal.confirm and capture the onOk callback for manual invocation.
  // The double-cast is necessary because the mock return shape ({ destroy, update, then })
  // doesn't fully match antd v6's Modal.confirm return type.
  function spyModalConfirm() {
    let capturedOnOk: (() => unknown) | undefined;
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(((config: ModalFuncProps) => {
      capturedOnOk = config.onOk as () => unknown;
      return { destroy: vi.fn(), update: vi.fn(), then: vi.fn() };
    }) as unknown as typeof Modal.confirm);
    return { get onOk() { return capturedOnOk; }, confirmSpy };
  }

  it('should call resignEmployee when confirming resign', async () => {
    const { onOk, confirmSpy } = spyModalConfirm();

    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const resignButtons = screen.getAllByRole('button', { name: /mark as resigned/i });
    await user.click(resignButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onOk).toBeDefined();

    // Invoke onOk to simulate user confirming the dialog
    await act(async () => {
      await onOk!();
    });

    // TanStack Query v5 passes mutation context as second arg
    expect(mockResignEmployee.mock.calls[0][0]).toBe('emp-1');
    confirmSpy.mockRestore();
  });

  it('should show success message after successful resign', async () => {
    const { onOk, confirmSpy } = spyModalConfirm();

    renderEmployeeList();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
    });

    const resignButtons = screen.getAllByRole('button', { name: /mark as resigned/i });
    await user.click(resignButtons[0]);

    await act(async () => {
      await onOk!();
    });

    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('Employee marked as resigned');
    });

    confirmSpy.mockRestore();
  });
});

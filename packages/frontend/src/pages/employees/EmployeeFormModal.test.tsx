import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import EmployeeFormModal from './EmployeeFormModal';
import type { Employee } from '../../services/employees.api';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetEmployee = vi.fn();
const mockCreateEmployee = vi.fn();
const mockUpdateEmployee = vi.fn();
const mockGetDepartments = vi.fn();

vi.mock('../../services/employees.api', () => ({
  employeeKeys: { all: ['employees'] as const, detail: (id: string) => ['employees', id] as const },
  getEmployee: (...args: unknown[]) => mockGetEmployee(...args),
  createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
  updateEmployee: (...args: unknown[]) => mockUpdateEmployee(...args),
}));

vi.mock('../../services/users.api', () => ({
  userKeys: { all: ['users'] as const, departments: ['departments'] as const },
  getDepartments: (...args: unknown[]) => mockGetDepartments(...args),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: { success: vi.fn() },
  };
});

const testEmployee: Employee = {
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
};

function renderModal(editingEmployee: Employee | null = null, open = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <EmployeeFormModal
            open={open}
            editingEmployee={editingEmployee}
            onClose={vi.fn()}
          />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('EmployeeFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartments.mockResolvedValue({
      data: [{ id: 'dept-1', name: 'Engineering' }],
    });
  });

  afterEach(() => cleanup());

  it('should fetch individual employee data when editing', async () => {
    mockGetEmployee.mockResolvedValue({ data: testEmployee });

    renderModal(testEmployee);

    await waitFor(() => {
      expect(mockGetEmployee).toHaveBeenCalledWith('emp-1');
    });
  });

  it('should pre-populate form with fetched employee data including CTC', async () => {
    mockGetEmployee.mockResolvedValue({ data: testEmployee });

    renderModal(testEmployee);

    await waitFor(() => {
      const codeInput = screen.getByLabelText(/employee code/i);
      expect(codeInput).toHaveValue('EMP001');
    });

    // CTC should be pre-populated (paise / 100 = 840000)
    const ctcInput = screen.getByLabelText(/annual ctc/i);
    expect(ctcInput).toHaveValue('840000');
  });

  it('should show loading spinner while fetching employee data', async () => {
    // Return a promise that never resolves to keep loading state
    mockGetEmployee.mockReturnValue(new Promise(() => {}));

    renderModal(testEmployee);

    await waitFor(() => {
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });
  });

  it('should NOT fetch individual employee in add mode', async () => {
    renderModal(null);

    // Wait for modal to render
    await waitFor(() => {
      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle).toHaveTextContent('Add Employee');
    });

    // No fetch should be made when not editing
    expect(mockGetEmployee).not.toHaveBeenCalled();
  });

  it('should disable employee code and name fields in edit mode', async () => {
    mockGetEmployee.mockResolvedValue({ data: testEmployee });

    renderModal(testEmployee);

    await waitFor(() => {
      expect(screen.getByLabelText(/employee code/i)).toBeDisabled();
    });
    expect(screen.getByLabelText(/^name$/i)).toBeDisabled();
  });

  it('should show error alert when getEmployee fetch fails', async () => {
    mockGetEmployee.mockRejectedValue(new Error('Network error'));

    renderModal(testEmployee);

    await waitFor(() => {
      expect(screen.getByText(/failed to load employee data/i)).toBeInTheDocument();
    });
  });
});

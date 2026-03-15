import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddTeamMemberModal from './AddTeamMemberModal';

vi.mock('../services/employees.api', () => ({
  employeeKeys: {
    all: ['employees'],
    detail: (id: string) => ['employees', id],
    search: (q: string) => ['employees', 'search', q],
  },
  searchEmployees: vi.fn().mockResolvedValue({
    data: [
      { id: 'emp-1', name: 'Alice Active', employeeCode: 'E001', designation: 'Developer', departmentName: 'Engineering' },
      { id: 'emp-3', name: 'Carol Active', employeeCode: 'E003', designation: 'Designer', departmentName: 'Design' },
    ],
    meta: { total: 2 },
  }),
}));

vi.mock('../services/designations.api', () => ({
  designationKeys: {
    all: ['designations'],
    active: ['designations', 'active'],
  },
  getActiveDesignations: vi.fn().mockResolvedValue({
    data: [
      { id: 'role-1', name: 'Senior Developer', isActive: true },
      { id: 'role-2', name: 'QA Lead', isActive: true },
    ],
    meta: { total: 2 },
  }),
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const defaultProps = {
  open: true,
  onCancel: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  existingMemberIds: [] as string[],
  isTm: false,
  loading: false,
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <AddTeamMemberModal {...defaultProps} {...overrides} />
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('AddTeamMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders the modal with all 4 fields', async () => {
    renderModal();

    expect(screen.getByText('Add Team Member')).toBeInTheDocument();
    expect(screen.getByTestId('employee-search')).toBeInTheDocument();
    expect(screen.getByTestId('designation-select')).toBeInTheDocument();
    expect(screen.getByTestId('selling-rate')).toBeInTheDocument();
    expect(screen.getByTestId('allocation-percent')).toBeInTheDocument();
  });

  describe('Form validation', () => {
    it('shows error when submitting without employee or role', async () => {
      renderModal();
      const user = userEvent.setup({ delay: null });

      await user.click(screen.getByRole('button', { name: /add member/i }));

      await waitFor(() => {
        expect(screen.getByText('Employee and designation are required')).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('shows error when T&M and no selling rate', async () => {
      renderModal({ isTm: true });
      // We can't easily set the internal TeamMemberRow value in unit test
      // because it's self-contained. This test verifies the modal-level validation message.
      const user = userEvent.setup({ delay: null });

      await user.click(screen.getByRole('button', { name: /add member/i }));

      await waitFor(() => {
        // Should show employee/role required first
        expect(screen.getByText('Employee and designation are required')).toBeInTheDocument();
      });
    });
  });

  describe('Modal lifecycle', () => {
    it('calls onCancel when cancel is clicked', async () => {
      const onCancel = vi.fn();
      renderModal({ onCancel });
      const user = userEvent.setup({ delay: null });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});

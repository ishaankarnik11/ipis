import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import AddTeamMemberModal from './AddTeamMemberModal';
import type { Employee } from '../services/employees.api';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const employees: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'E001',
    name: 'Alice Active',
    designation: 'Developer',
    departmentId: 'dept-1',
    isBillable: true,
    isResigned: false,
    joiningDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'emp-2',
    employeeCode: 'E002',
    name: 'Bob Resigned',
    designation: 'QA',
    departmentId: 'dept-1',
    isBillable: true,
    isResigned: true,
    joiningDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'emp-3',
    employeeCode: 'E003',
    name: 'Carol Active',
    designation: 'Designer',
    departmentId: 'dept-2',
    isBillable: false,
    isResigned: false,
    joiningDate: '2024-06-01',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
];

const defaultProps = {
  open: true,
  onCancel: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  employees,
  existingMemberIds: [] as string[],
  isTm: false,
  loading: false,
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
      <AddTeamMemberModal {...defaultProps} {...overrides} />
    </ConfigProvider>,
  );
}

describe('AddTeamMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  describe('Employee filtering', () => {
    it('excludes resigned employees from the dropdown', async () => {
      renderModal();

      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      await waitFor(() => {
        // Alice Active and Carol Active should be in the dropdown
        expect(screen.getByText(/Alice Active/)).toBeInTheDocument();
        expect(screen.getByText(/Carol Active/)).toBeInTheDocument();
      });

      // Bob Resigned should NOT be in the dropdown
      expect(screen.queryByText(/Bob Resigned/)).not.toBeInTheDocument();
    });

    it('excludes already-assigned employees from the dropdown', async () => {
      renderModal({ existingMemberIds: ['emp-1'] });

      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      await waitFor(() => {
        // Only Carol Active should appear (Alice is already assigned, Bob is resigned)
        expect(screen.getByText(/Carol Active/)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Alice Active/)).not.toBeInTheDocument();
    });
  });

  describe('Conditional T&M fields', () => {
    it('shows billing rate field when isTm is true', () => {
      renderModal({ isTm: true });

      expect(screen.getByText(/Billing Rate/)).toBeInTheDocument();
    });

    it('hides billing rate field when isTm is false', () => {
      renderModal({ isTm: false });

      expect(screen.queryByText(/Billing Rate/)).not.toBeInTheDocument();
    });
  });

  describe('Billing rate conversion', () => {
    it('converts rupees to paise (×100) on submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderModal({ isTm: true, onSubmit });
      const user = userEvent.setup({ delay: null });

      // Select employee
      const select = screen.getByRole('combobox');
      await user.click(select);
      await waitFor(() => {
        expect(screen.getByText(/Alice Active/)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/Alice Active/));

      // Fill role
      const roleInput = screen.getByLabelText(/role on project/i);
      await user.type(roleInput, 'Senior Dev');

      // Fill billing rate (₹5000)
      const billingInput = screen.getByLabelText(/Billing Rate/);
      await user.type(billingInput, '5000');

      // Click OK
      const okBtn = screen.getByRole('button', { name: /add member/i });
      await user.click(okBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          employeeId: 'emp-1',
          role: 'Senior Dev',
          billingRatePaise: 500000,
        });
      });
    });
  });

  describe('Form validation', () => {
    it('requires employee selection', async () => {
      renderModal();
      const user = userEvent.setup({ delay: null });

      const okBtn = screen.getByRole('button', { name: /add member/i });
      await user.click(okBtn);

      await waitFor(() => {
        expect(screen.getByText('Please select an employee')).toBeInTheDocument();
      });

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('requires role field', async () => {
      renderModal();
      const user = userEvent.setup({ delay: null });

      const okBtn = screen.getByRole('button', { name: /add member/i });
      await user.click(okBtn);

      await waitFor(() => {
        expect(screen.getByText('Role is required')).toBeInTheDocument();
      });
    });

    it('requires billing rate for T&M projects', async () => {
      renderModal({ isTm: true });
      const user = userEvent.setup({ delay: null });

      const okBtn = screen.getByRole('button', { name: /add member/i });
      await user.click(okBtn);

      await waitFor(() => {
        expect(screen.getByText('Billing rate is required for T&M projects')).toBeInTheDocument();
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

    it('shows error alert when onSubmit throws', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Duplicate member'));
      renderModal({ onSubmit });
      const user = userEvent.setup({ delay: null });

      // Select employee
      const select = screen.getByRole('combobox');
      await user.click(select);
      await waitFor(() => {
        expect(screen.getByText(/Alice Active/)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/Alice Active/));

      // Fill role
      const roleInput = screen.getByLabelText(/role on project/i);
      await user.type(roleInput, 'Dev');

      // Submit
      await user.click(screen.getByRole('button', { name: /add member/i }));

      await waitFor(() => {
        expect(screen.getByText('Duplicate member')).toBeInTheDocument();
      });
    });
  });
});

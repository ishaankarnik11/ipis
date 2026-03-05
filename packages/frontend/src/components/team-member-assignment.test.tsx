import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMemberRow, { type TeamMemberRowValue } from './TeamMemberRow';
import TeamMemberList from './TeamMemberList';

const mockSearchEmployees = vi.fn().mockResolvedValue({
  data: [
    { id: 'emp-1', name: 'Alice Smith', employeeCode: 'E001', designation: 'Developer', departmentName: 'Engineering' },
    { id: 'emp-2', name: 'Alice Walker', employeeCode: 'E002', designation: 'Manager', departmentName: 'Finance' },
  ],
  meta: { total: 2 },
});

const mockGetActiveProjectRoles = vi.fn().mockResolvedValue({
  data: [
    { id: 'role-1', name: 'Senior Developer', isActive: true },
    { id: 'role-2', name: 'QA Lead', isActive: true },
  ],
  meta: { total: 2 },
});

vi.mock('../services/employees.api', () => ({
  employeeKeys: {
    all: ['employees'],
    detail: (id: string) => ['employees', id],
    search: (q: string) => ['employees', 'search', q],
  },
  searchEmployees: (...args: unknown[]) => mockSearchEmployees(...args),
}));

vi.mock('../services/project-roles.api', () => ({
  projectRoleKeys: {
    all: ['project-roles'],
    active: ['project-roles', 'active'],
  },
  getActiveProjectRoles: (...args: unknown[]) => mockGetActiveProjectRoles(...args),
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        {ui}
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('TeamMemberRow', () => {
  const defaultValue: TeamMemberRowValue = { employeeId: null, roleId: null, sellingRate: null };
  const onChange = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('renders employee search, role dropdown, and selling rate fields', () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.getByTestId('employee-search')).toBeInTheDocument();
    expect(screen.getByTestId('role-select')).toBeInTheDocument();
    expect(screen.getByTestId('selling-rate')).toBeInTheDocument();
  });

  it('renders remove button when onRemove is provided', () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} onRemove={onRemove} engagementModel="FIXED_COST" />,
    );

    const removeBtn = screen.getByLabelText('Remove team member');
    expect(removeBtn).toBeInTheDocument();
  });

  it('does not render remove button when onRemove is not provided', () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.queryByLabelText('Remove team member')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} onRemove={onRemove} engagementModel="FIXED_COST" />,
    );
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByLabelText('Remove team member'));

    expect(onRemove).toHaveBeenCalled();
  });

  it('fetches active roles for the dropdown', async () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    await waitFor(() => {
      expect(mockGetActiveProjectRoles).toHaveBeenCalled();
    });
  });

  it('shows selling rate placeholder based on engagement model', () => {
    const { unmount } = renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="TIME_AND_MATERIALS" />,
    );

    expect(screen.getByPlaceholderText('Rate (required)')).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.getByPlaceholderText('Rate (optional)')).toBeInTheDocument();
  });
});

describe('TeamMemberList', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('renders the Add Member button when list is empty', () => {
    renderWithProviders(
      <TeamMemberList value={[]} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.getByTestId('add-member-btn')).toBeInTheDocument();
    expect(screen.getByText('Add Member')).toBeInTheDocument();
  });

  it('adds a new empty row when Add Member is clicked', async () => {
    renderWithProviders(
      <TeamMemberList value={[]} onChange={onChange} engagementModel="FIXED_COST" />,
    );
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByTestId('add-member-btn'));

    expect(onChange).toHaveBeenCalledWith([{ employeeId: null, roleId: null, sellingRate: null }]);
  });

  it('renders rows for each member', () => {
    const members: TeamMemberRowValue[] = [
      { employeeId: 'emp-1', roleId: 'role-1', sellingRate: 5000 },
      { employeeId: 'emp-2', roleId: 'role-2', sellingRate: null },
    ];
    renderWithProviders(
      <TeamMemberList value={members} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    // Should have 2 remove buttons (one per row)
    const removeBtns = screen.getAllByLabelText('Remove team member');
    expect(removeBtns).toHaveLength(2);
  });

  it('removes a row when remove button is clicked', async () => {
    const members: TeamMemberRowValue[] = [
      { employeeId: 'emp-1', roleId: 'role-1', sellingRate: 5000 },
      { employeeId: 'emp-2', roleId: 'role-2', sellingRate: null },
    ];
    renderWithProviders(
      <TeamMemberList value={members} onChange={onChange} engagementModel="FIXED_COST" />,
    );
    const user = userEvent.setup({ delay: null });

    const removeBtns = screen.getAllByLabelText('Remove team member');
    await user.click(removeBtns[0]!);

    expect(onChange).toHaveBeenCalledWith([
      { employeeId: 'emp-2', roleId: 'role-2', sellingRate: null },
    ]);
  });
});

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

const mockGetActiveDesignations = vi.fn().mockResolvedValue({
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

vi.mock('../services/designations.api', () => ({
  designationKeys: {
    all: ['designations'],
    active: ['designations', 'active'],
  },
  getActiveDesignations: (...args: unknown[]) => mockGetActiveDesignations(...args),
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
  const defaultValue: TeamMemberRowValue = { employeeId: null, designationId: null, sellingRate: null, allocationPercent: null };
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
    expect(screen.getByTestId('designation-select')).toBeInTheDocument();
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

  it('fetches active designations for the dropdown', async () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    await waitFor(() => {
      expect(mockGetActiveDesignations).toHaveBeenCalled();
    });
  });

  it('shows selling rate label based on engagement model', () => {
    const { unmount } = renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="TIME_AND_MATERIALS" />,
    );

    expect(screen.getByText('Selling Rate (required)')).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.getByText('Selling Rate (optional)')).toBeInTheDocument();
  });

  it('renders allocation percent field', () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    expect(screen.getByTestId('allocation-percent')).toBeInTheDocument();
    expect(screen.getByText('Allocation %')).toBeInTheDocument();
  });
});

// ── Story 10.8: Designation Pre-Population ──

describe('TeamMemberRow — designation pre-population (Story 10.8)', () => {
  const defaultValue: TeamMemberRowValue = { employeeId: null, designationId: null, sellingRate: null, allocationPercent: null };
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup matching designation → role data
    mockSearchEmployees.mockResolvedValue({
      data: [
        { id: 'emp-match', name: 'Dev Person', employeeCode: 'E100', designation: 'Senior Developer', departmentName: 'Engineering' },
        { id: 'emp-nomatch', name: 'Unique Role', employeeCode: 'E101', designation: 'Unicorn Wrangler', departmentName: 'Special' },
      ],
      meta: { total: 2 },
    });
    mockGetActiveDesignations.mockResolvedValue({
      data: [
        { id: 'role-1', name: 'Senior Developer', isActive: true },
        { id: 'role-2', name: 'QA Lead', isActive: true },
      ],
      meta: { total: 2 },
    });
  });
  afterEach(() => cleanup());

  it('pre-populates designation when employee designation matches (AC: 4)', async () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    // Wait for roles to load
    await waitFor(() => {
      expect(mockGetActiveDesignations).toHaveBeenCalled();
    });

    // Simulate searching and selecting the matching employee
    const user = userEvent.setup({ delay: null });
    const employeeSearch = screen.getByTestId('employee-search');
    const input = employeeSearch.querySelector('input')!;
    await user.type(input, 'Dev');

    await waitFor(() => {
      expect(mockSearchEmployees).toHaveBeenCalled();
    });

    // Find and click the matching option
    const option = await screen.findByText(/Dev Person.*Senior Developer/);
    await user.click(option);

    // onChange should be called with both employeeId AND designationId pre-populated
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-match',
          designationId: 'role-1', // Matched "Senior Developer" designation to "Senior Developer" role
        }),
      );
    });
  });

  it('leaves designation empty when employee designation does not match (AC: 4 negative)', async () => {
    renderWithProviders(
      <TeamMemberRow value={defaultValue} onChange={onChange} engagementModel="FIXED_COST" />,
    );

    await waitFor(() => {
      expect(mockGetActiveDesignations).toHaveBeenCalled();
    });

    const user = userEvent.setup({ delay: null });
    const employeeSearch = screen.getByTestId('employee-search');
    const input = employeeSearch.querySelector('input')!;
    await user.type(input, 'Unique');

    await waitFor(() => {
      expect(mockSearchEmployees).toHaveBeenCalled();
    });

    const option = await screen.findByText(/Unique Role.*Unicorn Wrangler/);
    await user.click(option);

    // onChange should be called with employeeId but designationId stays null (no match)
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-nomatch',
          designationId: null,
        }),
      );
    });
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

    expect(onChange).toHaveBeenCalledWith([{ employeeId: null, designationId: null, sellingRate: null, allocationPercent: null }]);
  });

  it('renders rows for each member', () => {
    const members: TeamMemberRowValue[] = [
      { employeeId: 'emp-1', designationId: 'role-1', sellingRate: 5000, allocationPercent: null },
      { employeeId: 'emp-2', designationId: 'role-2', sellingRate: null, allocationPercent: null },
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
      { employeeId: 'emp-1', designationId: 'role-1', sellingRate: 5000, allocationPercent: null },
      { employeeId: 'emp-2', designationId: 'role-2', sellingRate: null, allocationPercent: null },
    ];
    renderWithProviders(
      <TeamMemberList value={members} onChange={onChange} engagementModel="FIXED_COST" />,
    );
    const user = userEvent.setup({ delay: null });

    const removeBtns = screen.getAllByLabelText('Remove team member');
    await user.click(removeBtns[0]!);

    expect(onChange).toHaveBeenCalledWith([
      { employeeId: 'emp-2', designationId: 'role-2', sellingRate: null, allocationPercent: null },
    ]);
  });
});

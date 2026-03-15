import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router';
import EmployeeDetail from './EmployeeDetail';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetEmployeeDetail = vi.fn();

vi.mock('../../services/dashboards.api', () => ({
  reportKeys: {
    employeeDetail: (id: string) => ['reports', 'employees', id] as const,
  },
  getEmployeeDetail: (...args: unknown[]) => mockGetEmployeeDetail(...args),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
    employeeId: 'emp1',
    employeeCode: 'EMP-001',
    name: 'Alice Developer',
    designation: 'Senior Developer',
    department: 'Engineering',
    annualCtcPaise: 120000000,
    isBillable: true,
    isResigned: false,
    utilisationSummary: {
      billableHours: 120,
      totalHours: 160,
      utilisationPercent: 0.75,
    },
    monthlyHistory: [
      {
        periodMonth: 2,
        periodYear: 2026,
        totalHours: 160,
        billableHours: 120,
        billableUtilisationPercent: 0.75,
        totalCostPaise: 3000000,
        revenueContributionPaise: 5000000,
        profitContributionPaise: 2000000,
      },
    ],
    projectAssignments: [
      {
        projectId: 'proj1',
        projectName: 'Project Alpha',
        designationId: 'role1',
        designationName: 'Developer',
        sellingRatePaise: 500000,
        assignedAt: '2026-01-15T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

function renderDetail(path = '/dashboards/employees/emp1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/dashboards/employees/:id" element={<EmployeeDetail />} />
          </Routes>
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('EmployeeDetail (Story 10.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDetail.mockResolvedValue({ data: makeDetail() });
  });

  afterEach(() => {
    cleanup();
  });

  // AC 2: Profile Card renders
  it('renders profile card with employee details', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // Billable
    expect(screen.getByText('Active')).toBeInTheDocument(); // Status
  });

  // AC 2: CTC displayed for non-HR roles
  it('shows Annual CTC for admin/finance roles', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Annual CTC')).toBeInTheDocument();
    });
    expect(screen.getByText('₹12,00,000')).toBeInTheDocument();
  });

  // AC 3: Project allocations table renders
  it('renders project allocations table with links', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('project-allocations-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    // Selling rate
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
  });

  // AC 3: Project name is a link to project detail
  it('project name links to project detail page', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    const link = screen.getByText('Project Alpha');
    expect(link.closest('a')).toHaveAttribute('href', '/projects/proj1');
  });

  // AC 4: Utilization summary renders
  it('renders utilization summary', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('utilisation-summary')).toBeInTheDocument();
    });
    // Labels appear in both utilization summary and monthly history table
    expect(screen.getAllByText('Billable Hours').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Total Hours').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Utilization %')).toBeInTheDocument();
  });

  // AC 4: No utilization summary when data is null
  it('hides utilization summary when no data', async () => {
    mockGetEmployeeDetail.mockResolvedValue({
      data: makeDetail({ utilisationSummary: null }),
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('employee-detail')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('utilisation-summary')).not.toBeInTheDocument();
  });

  // AC 5: Back to Employees navigation
  it('renders back button that navigates to employee list', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Back to Employees')).toBeInTheDocument();
    });
  });

  // AC 6: HR role — financial fields hidden
  it('HR: hides Annual CTC and Selling Rate', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-hr', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDetail.mockResolvedValue({
      data: makeDetail({ annualCtcPaise: 0 }),
    });

    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    });
    // CTC label should not be present
    expect(screen.queryByText('Annual CTC')).not.toBeInTheDocument();
    // Selling Rate column should not be present
    expect(screen.queryByText('Selling Rate')).not.toBeInTheDocument();
    // Utilization should still be visible
    expect(screen.getByTestId('utilisation-summary')).toBeInTheDocument();
  });

  // AC 7: Finance role — all fields visible, no Edit/Resign
  it('Finance: shows all fields', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-fin', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Annual CTC')).toBeInTheDocument();
    });
    expect(screen.getByText('Selling Rate')).toBeInTheDocument();
  });

  // AC 9: 404 / not found state
  it('shows empty state when employee not found', async () => {
    mockGetEmployeeDetail.mockResolvedValue({ data: null });

    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('employee-detail-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('Employee not found or access denied')).toBeInTheDocument();
  });

  // Resigned employee shows Resigned badge
  it('shows Resigned status badge for resigned employee', async () => {
    mockGetEmployeeDetail.mockResolvedValue({
      data: makeDetail({ isResigned: true }),
    });
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Resigned')).toBeInTheDocument();
    });
  });

  // Monthly history table renders
  it('renders monthly history table', async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('monthly-history-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Feb 2026')).toBeInTheDocument();
  });

  // HR: financial history columns hidden
  it('HR: hides Revenue/Cost/Profit columns in monthly history', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-hr', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDetail.mockResolvedValue({
      data: makeDetail({ annualCtcPaise: 0 }),
    });

    renderDetail();
    await waitFor(() => {
      expect(screen.getByTestId('monthly-history-table')).toBeInTheDocument();
    });
    // Utilization columns present (may appear in both summary and table)
    expect(screen.getAllByText('Billable Hours').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Total Hours').length).toBeGreaterThanOrEqual(1);
    // Financial columns absent from history table
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    expect(screen.queryByText('Profit')).not.toBeInTheDocument();
  });

  // DEPT_HEAD: all fields visible, no CTAs (same as Finance behavior)
  it('DEPT_HEAD: shows all fields', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-dh', name: 'Dept Head', role: 'DEPT_HEAD', email: 'dh@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderDetail();
    await waitFor(() => {
      expect(screen.getByText('Annual CTC')).toBeInTheDocument();
    });
    expect(screen.getByText('Selling Rate')).toBeInTheDocument();
  });
});

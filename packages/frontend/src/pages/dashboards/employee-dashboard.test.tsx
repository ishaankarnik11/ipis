import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import EmployeeDashboard from './EmployeeDashboard';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock API functions
const mockGetEmployeeDashboard = vi.fn();
const mockResignEmployee = vi.fn();

vi.mock('../../services/dashboards.api', () => ({
  reportKeys: {
    all: ['reports'] as const,
    employees: (filters?: Record<string, unknown>) =>
      ['reports', 'employees', filters ?? {}] as const,
  },
  getEmployeeDashboard: (...args: unknown[]) => mockGetEmployeeDashboard(...args),
}));

vi.mock('../../services/employees.api', () => ({
  employeeKeys: {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
  },
  resignEmployee: (...args: unknown[]) => mockResignEmployee(...args),
}));

vi.mock('../employees/EmployeeFormModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="employee-form-modal">Employee Form Modal</div> : null,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Default useAuth mock
const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'u1', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
  isLoading: false,
  isAuthenticated: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

function makeEmployeeItem(overrides: Partial<{
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
  marginPercent: number;
  profitabilityRank: number;
}> = {}) {
  return {
    employeeId: 'emp1',
    name: 'Test Employee',
    designation: 'Senior Developer',
    department: 'Engineering',
    totalHours: 160,
    billableHours: 120,
    billableUtilisationPercent: 0.75,
    totalCostPaise: 3000000,
    revenueContributionPaise: 5000000,
    profitContributionPaise: 2000000,
    marginPercent: 0.4,
    profitabilityRank: 1,
    ...overrides,
  };
}

function renderDashboard(initialEntries = ['/dashboards/employees']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter initialEntries={initialEntries}>
          <EmployeeDashboard />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('EmployeeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders page title and structure', () => {
    renderDashboard();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByTestId('employee-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('employee-dashboard-table')).toBeInTheDocument();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No employee data available')).toBeInTheDocument();
    });
  });

  // AC: Admin/Finance see all employees
  it('renders all employees returned by API', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [
        makeEmployeeItem({ employeeId: 'emp1', name: 'Alice', profitabilityRank: 1 }),
        makeEmployeeItem({ employeeId: 'emp2', name: 'Bob', profitabilityRank: 2 }),
      ],
      meta: { total: 2 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  // AC: Currency formatting
  it('formats monetary values correctly', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ revenueContributionPaise: 5000000 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('₹50,000')).toBeInTheDocument();
    });
  });

  // AC: Under-utilisation highlight (< 50%) — amber text
  it('highlights under-utilised employees with amber text', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ billableUtilisationPercent: 0.3 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      const underUtil = screen.getByTestId('under-utilisation');
      expect(underUtil).toBeInTheDocument();
      expect(underUtil.style.color).toBe('rgb(212, 136, 6)');
    });
  });

  // AC: No under-utilisation highlight when >= 50%
  it('does not highlight employees with >= 50% utilisation', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ billableUtilisationPercent: 0.75 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Employee')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('under-utilisation')).not.toBeInTheDocument();
  });

  // AC: Loss-row background on negative profitContributionPaise
  it('applies loss-row class for negative profit contribution', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ profitContributionPaise: -500000 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Employee')).toBeInTheDocument();
    });

    const tableBody = screen.getByTestId('employee-dashboard-table').querySelector('tbody');
    const row = tableBody?.querySelector('tr');
    expect(row?.className).toContain('loss-row');
  });

  // AC: Profitability rank ordering (highest revenue first = rank ascending)
  it('displays rank column with correct row ordering', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [
        makeEmployeeItem({ employeeId: 'emp1', name: 'Top Earner', profitabilityRank: 1 }),
        makeEmployeeItem({ employeeId: 'emp2', name: 'Mid Earner', profitabilityRank: 2 }),
        makeEmployeeItem({ employeeId: 'emp3', name: 'Low Earner', profitabilityRank: 3 }),
      ],
      meta: { total: 3 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Top Earner')).toBeInTheDocument();
    });

    // Verify row order: rank 1 should be in the first data row, rank 3 in the last
    const tableBody = screen.getByTestId('employee-dashboard-table').querySelector('tbody');
    const dataRows = tableBody?.querySelectorAll('tr');
    expect(dataRows).toBeDefined();
    expect(dataRows!.length).toBeGreaterThanOrEqual(3);

    // First row → rank #1, Top Earner
    expect(dataRows![0]!.textContent).toContain('Top Earner');
    expect(dataRows![0]!.querySelector('td')!.textContent).toBe('#1');

    // Second row → rank 2, Mid Earner
    expect(dataRows![1]!.textContent).toContain('Mid Earner');

    // Third row → rank 3, Low Earner
    expect(dataRows![2]!.textContent).toContain('Low Earner');
  });

  // AC: Filter params propagated to API
  it('passes department filter from URL to API', async () => {
    renderDashboard(['/dashboards/employees?department=Engineering']);

    await waitFor(() => {
      expect(mockGetEmployeeDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'Engineering' }),
      );
    });
  });

  it('passes designation filter from URL to API', async () => {
    renderDashboard(['/dashboards/employees?designation=Senior%20Developer']);

    await waitFor(() => {
      expect(mockGetEmployeeDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ designation: 'Senior Developer' }),
      );
    });
  });

  // AC: Margin % formatting
  it('formats margin percent correctly', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ marginPercent: 0.4 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });
  });

  // AC9: Click employee name → navigate to detail view [H1 review fix]
  it('navigates to employee detail when name is clicked', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp123', name: 'John Doe' })],
      meta: { total: 1 },
    });

    renderDashboard();
    const nameLink = await screen.findByText('John Doe');
    fireEvent.click(nameLink);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboards/employees/emp123');
  });

  // Story 12.2: Employee name link has proper href for accessibility
  it('employee name link has href attribute for accessibility', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp456', name: 'Jane Smith' })],
      meta: { total: 1 },
    });

    renderDashboard();
    const nameLink = await screen.findByText('Jane Smith');
    expect(nameLink.closest('a')).toHaveAttribute('href', '/dashboards/employees/emp456');
  });

  // AC7: Filter interaction propagates to API [M2 review fix]
  it('calls API with combined filters from URL', async () => {
    renderDashboard(['/dashboards/employees?department=Engineering&designation=Senior%20Developer']);

    await waitFor(() => {
      expect(mockGetEmployeeDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'Engineering', designation: 'Senior Developer' }),
      );
    });
  });

  // Story 10.2 AC3: HR role sees only utilization columns, no financial columns
  it('HR role: hides financial columns and shows utilization columns', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-hr', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ billableUtilisationPercent: 0.75 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Employee')).toBeInTheDocument();
    });

    // Utilization columns present (Designation/Department also appear in filter bar, so use getAllByText)
    expect(screen.getByText('Billable Utilisation')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getAllByText('Designation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Department').length).toBeGreaterThanOrEqual(1);

    // Financial columns absent
    expect(screen.queryByText('Revenue Contribution')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('Profit Contribution')).not.toBeInTheDocument();
    expect(screen.queryByText('Margin %')).not.toBeInTheDocument();
  });

  // Story 10.2 AC8: HR sees under-utilisation amber highlight
  it('HR role: under-utilisation amber highlight still appears', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-hr', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ billableUtilisationPercent: 0.3 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      const underUtil = screen.getByTestId('under-utilisation');
      expect(underUtil).toBeInTheDocument();
      expect(underUtil.style.color).toBe('rgb(212, 136, 6)');
    });
  });

  // Story 10.2: Finance still sees all financial columns (regression check)
  it('Finance role: still sees all financial columns', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem()],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Employee')).toBeInTheDocument();
    });

    expect(screen.getByText('Revenue Contribution')).toBeInTheDocument();
    expect(screen.getByText('Profit Contribution')).toBeInTheDocument();
    expect(screen.getByText('Margin %')).toBeInTheDocument();
  });

  // Story 10.4 AC1: Admin sees Add Employee button and per-row Edit/Resign actions
  it('Admin role: shows Add Employee button and action column', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-admin', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp1', name: 'Alice' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Employee')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Mark as Resigned')).toBeInTheDocument();
  });

  // Story 10.4 AC2: HR sees Add Employee button and action column
  it('HR role: shows Add Employee button and action column', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-hr', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp1', name: 'Alice' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Employee')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Mark as Resigned')).toBeInTheDocument();
  });

  // Story 10.4 AC2: Finance does NOT see Add/Edit/Resign buttons
  it('Finance role: does NOT show Add Employee button or action column', async () => {
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp1', name: 'Alice' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add Employee')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark as Resigned')).not.toBeInTheDocument();
  });

  // Story 10.4 AC2: DEPT_HEAD does NOT see Add/Edit/Resign buttons
  it('DEPT_HEAD role: does NOT show Add Employee button or action column', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-dh', name: 'Dept Head', role: 'DEPT_HEAD', email: 'dh@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({
      data: [makeEmployeeItem({ employeeId: 'emp1', name: 'Alice' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add Employee')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark as Resigned')).not.toBeInTheDocument();
  });

  // Story 10.4 AC9: Add Employee modal opens when button clicked
  it('Admin: clicking Add Employee opens the modal', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-admin', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetEmployeeDashboard.mockResolvedValue({ data: [], meta: { total: 0 } });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Employee'));
    expect(screen.getByTestId('employee-form-modal')).toBeInTheDocument();
  });

  // Story 10.4: Page title is "Employees" not "Employee Dashboard"
  it('page title is "Employees"', () => {
    renderDashboard();
    expect(screen.getByText('Employees')).toBeInTheDocument();
  });
});

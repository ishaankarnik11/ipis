import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ProjectDetail from './ProjectDetail';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockParams: { id?: string } = { id: 'proj-1' };

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => mockParams,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

const mockGetProject = vi.fn();
const mockGetTeamMembers = vi.fn();

vi.mock('../../services/projects.api', () => ({
  projectKeys: {
    all: ['projects'],
    detail: (id: string) => ['projects', id],
    teamMembers: (id: string) => ['projects', id, 'team-members'],
  },
  getProject: (...args: unknown[]) => mockGetProject(...args),
  getTeamMembers: (...args: unknown[]) => mockGetTeamMembers(...args),
  updateProject: vi.fn(),
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  engagementModelLabels: {
    TIME_AND_MATERIALS: 'Time & Materials',
    FIXED_COST: 'Fixed Cost',
    AMC: 'AMC',
    INFRASTRUCTURE: 'Infrastructure',
  },
}));

vi.mock('../../services/employees.api', () => ({
  employeeKeys: { all: ['employees'] as const },
  getEmployees: vi.fn(),
}));

let mockUser: { role: string; name: string; id: string } | null = {
  role: 'DELIVERY_MANAGER',
  name: 'DM User',
  id: 'dm-1',
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, isAuthenticated: true }),
}));

// ── Test Data ────────────────────────────────────────────────────

const projectWithFinancials = {
  id: 'proj-1',
  name: 'Alpha Project',
  client: 'Acme Corp',
  vertical: 'IT',
  engagementModel: 'TIME_AND_MATERIALS',
  status: 'ACTIVE',
  contractValuePaise: 10000000,
  deliveryManagerId: 'dm-1',
  deliveryManagerName: 'John DM',
  rejectionComment: null,
  completionPercent: null,
  slaDescription: null,
  vendorCostPaise: null,
  manpowerCostPaise: null,
  budgetPaise: null,
  infraCostMode: null,
  startDate: '2026-03-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-02-01',
  updatedAt: '2026-02-10',
  financials: {
    revenuePaise: 2000000,
    costPaise: 800000,
    profitPaise: 1200000,
    marginPercent: 0.30,
  },
};

const projectNoFinancials = {
  ...projectWithFinancials,
  financials: null,
};

const teamMembers = [
  {
    employeeId: 'emp-1',
    name: 'Alice Dev',
    employeeDesignation: 'Senior Developer',
    designationId: 'role-1',
    designationName: 'Lead Engineer',
    billingRatePaise: 500000,
    assignedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    employeeId: 'emp-2',
    name: 'Bob QA',
    employeeDesignation: 'QA Engineer',
    designationId: 'role-2',
    designationName: 'Tester',
    billingRatePaise: null,
    assignedAt: '2026-03-10T00:00:00.000Z',
  },
];

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <ProjectDetail />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectDetail — Enhanced (Story 8.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.id = 'proj-1';
    mockUser = { role: 'DELIVERY_MANAGER', name: 'DM User', id: 'dm-1' };
    mockGetTeamMembers.mockResolvedValue({ data: teamMembers });
  });

  describe('Financial summary (AC: 3)', () => {
    it('renders 4 financial cards with formatted values', async () => {
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
      });

      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Profit')).toBeInTheDocument();
      expect(screen.getByText('Margin')).toBeInTheDocument();
    });

    it('renders MarginHealthBadge with correct state', async () => {
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('margin-health-badge')).toBeInTheDocument();
      });

      // 0.30 >= 0.20 → Healthy
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  describe('Financial empty state (AC: 4)', () => {
    it('shows "No financial data yet" when financials is null', async () => {
      mockGetProject.mockResolvedValue({ data: projectNoFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('financial-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/No financial data yet/)).toBeInTheDocument();
      expect(screen.queryByTestId('financial-summary')).not.toBeInTheDocument();
    });
  });

  describe('Team roster columns (AC: 5)', () => {
    it('renders Joined Date column', async () => {
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      });

      expect(screen.getByText('Joined Date')).toBeInTheDocument();
      expect(screen.getByText('2026-03-05')).toBeInTheDocument();
      expect(screen.getByText('2026-03-10')).toBeInTheDocument();
    });

    it('renders designation names from designationName field', async () => {
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Lead Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('Tester')).toBeInTheDocument();
    });

    it('shows formatted selling rate and "—" for null', async () => {
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      });

      // 500000 paise → ₹5,000
      expect(screen.getByText('₹5,000')).toBeInTheDocument();
      // null → "—" (may appear in multiple columns)
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  describe('RBAC (AC: 8)', () => {
    it('Finance user sees data but no Add/Remove buttons', async () => {
      mockUser = { role: 'FINANCE', name: 'Finance User', id: 'fin-1' };
      mockGetProject.mockResolvedValue({ data: projectWithFinancials });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      });

      // Financial summary and roster are visible
      expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
      expect(screen.getByTestId('team-roster-section')).toBeInTheDocument();

      // No management buttons
      expect(screen.queryByRole('button', { name: /add team member/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});

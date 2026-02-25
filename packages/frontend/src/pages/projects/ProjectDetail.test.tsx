import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ProjectDetail from './ProjectDetail';

// antd v6 ResizeObserver mock
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mocks ────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockParams: { id?: string } = { id: 'proj-1' };

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

const mockGetProject = vi.fn();
const mockGetTeamMembers = vi.fn();
const mockUpdateProject = vi.fn();

vi.mock('../../services/projects.api', () => ({
  projectKeys: {
    all: ['projects'],
    detail: (id: string) => ['projects', id],
    teamMembers: (id: string) => ['projects', id, 'team-members'],
  },
  getProject: (...args: unknown[]) => mockGetProject(...args),
  getTeamMembers: (...args: unknown[]) => mockGetTeamMembers(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  engagementModelLabels: {
    TIME_AND_MATERIALS: 'Time & Materials',
    FIXED_COST: 'Fixed Cost',
    AMC: 'AMC',
    INFRASTRUCTURE: 'Infrastructure',
  },
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

const tmProject = {
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
  startDate: '2026-03-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-02-01',
  updatedAt: '2026-02-10',
};

const fixedCostProject = {
  ...tmProject,
  id: 'proj-2',
  name: 'Beta Fixed',
  engagementModel: 'FIXED_COST',
  contractValuePaise: 50000000,
  completionPercent: 0.45,
};

const teamMembers = [
  {
    employeeId: 'emp-1',
    name: 'Alice Dev',
    designation: 'Senior Developer',
    role: 'Developer',
    billingRatePaise: 500000,
    assignedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    employeeId: 'emp-2',
    name: 'Bob QA',
    designation: 'QA Engineer',
    role: 'Tester',
    billingRatePaise: null,
    assignedAt: '2026-03-10T00:00:00.000Z',
  },
];

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.id = 'proj-1';
    mockUser = { role: 'DELIVERY_MANAGER', name: 'DM User', id: 'dm-1' };
    mockGetTeamMembers.mockResolvedValue({ data: teamMembers });
  });

  describe('Project fields display (AC: 3)', () => {
    it('renders all project fields with formatted currency', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // Project name appears in both Title and Breadcrumb
      expect(screen.getAllByText('Alpha Project').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('IT')).toBeInTheDocument();
      expect(screen.getByText('Time & Materials')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('2026-03-01')).toBeInTheDocument();
      expect(screen.getByText('2026-12-31')).toBeInTheDocument();
    });

    it('shows contract value with formatCurrency', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // ₹1,00,000 = 10000000 paise / 100 = ₹100,000 in Indian format
      expect(screen.getByText('₹1,00,000')).toBeInTheDocument();
    });

    it('renders status badge', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Team Roster section (AC: 3)', () => {
    it('shows team roster table with member details', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Team Roster')).toBeInTheDocument();
      });

      expect(screen.getByTestId('team-roster-section')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      });
      expect(screen.getByText('Bob QA')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('QA Engineer')).toBeInTheDocument();
    });

    it('shows empty state when no team members', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      mockGetTeamMembers.mockResolvedValue({ data: [] });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No team members assigned')).toBeInTheDocument();
      });
    });
  });

  describe('% Completion for Fixed Cost (AC: 4)', () => {
    it('shows completion input for Fixed Cost project when user is Finance', async () => {
      mockUser = { role: 'FINANCE', name: 'Finance User', id: 'fin-1' };
      mockParams.id = 'proj-2';
      mockGetProject.mockResolvedValue({ data: fixedCostProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('completion-section')).toBeInTheDocument();
      });

      expect(screen.getByText('% Completion')).toBeInTheDocument();
    });

    it('shows completion input for Fixed Cost project when user is DM', async () => {
      mockUser = { role: 'DELIVERY_MANAGER', name: 'DM User', id: 'dm-1' };
      mockParams.id = 'proj-2';
      mockGetProject.mockResolvedValue({ data: fixedCostProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('completion-section')).toBeInTheDocument();
      });
    });

    it('does NOT show completion input for T&M project (AC: 4)', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('completion-section')).not.toBeInTheDocument();
    });

    it('pre-populates completion value from project data (decimal to percentage)', async () => {
      mockUser = { role: 'FINANCE', name: 'Finance User', id: 'fin-1' };
      mockParams.id = 'proj-2';
      mockGetProject.mockResolvedValue({ data: fixedCostProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('completion-section')).toBeInTheDocument();
      });

      // 0.45 → displayed as 45
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue('45');
    });

    it('calls updateProject with decimal value on Save', async () => {
      mockUser = { role: 'FINANCE', name: 'Finance User', id: 'fin-1' };
      mockParams.id = 'proj-2';
      mockGetProject.mockResolvedValue({ data: fixedCostProject });
      mockUpdateProject.mockResolvedValue({ data: { ...fixedCostProject, completionPercent: 0.75 } });

      const user = userEvent.setup({ delay: null });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('completion-section')).toBeInTheDocument();
      });

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '75');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith('proj-2', { completionPercent: 0.75 });
      });
    });
  });

  describe('Breadcrumb navigation (AC: 5)', () => {
    it('shows breadcrumb with Projects link and project name', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // Breadcrumb: "Projects / Alpha Project"
      const projectsLink = screen.getByRole('link', { name: /projects/i });
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '/projects');
      // Project name appears in breadcrumb
      expect(screen.getAllByText('Alpha Project').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error and loading states', () => {
    it('shows loading spinner while fetching', () => {
      mockGetProject.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(document.querySelector('.ant-spin')).toBeInTheDocument();
    });

    it('shows error alert on fetch failure', async () => {
      mockGetProject.mockRejectedValue(new Error('Network error'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load project/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit & Resubmit button', () => {
    it('shows Edit & Resubmit for REJECTED projects', async () => {
      mockGetProject.mockResolvedValue({
        data: { ...tmProject, status: 'REJECTED', rejectionComment: 'Needs fix' },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit & resubmit/i })).toBeInTheDocument();
      });
    });

    it('does not show Edit & Resubmit for ACTIVE projects', async () => {
      mockGetProject.mockResolvedValue({ data: tmProject });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /edit & resubmit/i })).not.toBeInTheDocument();
    });
  });
});

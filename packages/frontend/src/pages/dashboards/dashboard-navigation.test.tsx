import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import ProjectDashboard from './ProjectDashboard';
import ExecutiveDashboard from './ExecutiveDashboard';
import DepartmentDashboard from './DepartmentDashboard';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock API functions
const mockGetProjectDashboard = vi.fn();
const mockGetExecutiveDashboard = vi.fn();
const mockGetPracticeDashboard = vi.fn();
const mockGetDepartmentDashboard = vi.fn();

vi.mock('../../services/dashboards.api', () => ({
  reportKeys: {
    all: ['reports'] as const,
    projects: (filters?: Record<string, unknown>) =>
      ['reports', 'projects', filters ?? {}] as const,
    executive: ['reports', 'executive'] as const,
    practice: ['reports', 'practice'] as const,
    department: ['reports', 'department'] as const,
  },
  getProjectDashboard: (...args: unknown[]) => mockGetProjectDashboard(...args),
  getExecutiveDashboard: (...args: unknown[]) => mockGetExecutiveDashboard(...args),
  getPracticeDashboard: (...args: unknown[]) => mockGetPracticeDashboard(...args),
  getDepartmentDashboard: (...args: unknown[]) => mockGetDepartmentDashboard(...args),
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
  user: { id: 'u1', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
  isLoading: false,
  isAuthenticated: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

function makeProjectItem(overrides: Partial<{
  projectId: string;
  projectName: string;
  engagementModel: string;
  department: string | null;
  vertical: string;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}> = {}) {
  return {
    projectId: 'proj-1',
    projectName: 'Alpha Project',
    engagementModel: 'TIME_AND_MATERIALS',
    department: 'Delivery',
    vertical: 'IT Services',
    status: 'ACTIVE',
    revenuePaise: 5000000,
    costPaise: 3500000,
    profitPaise: 1500000,
    marginPercent: 0.3,
    ...overrides,
  };
}

function makeDepartmentItem(overrides: Partial<{
  departmentId: string;
  departmentName: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}> = {}) {
  return {
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    revenuePaise: 10000000,
    costPaise: 7000000,
    profitPaise: 3000000,
    marginPercent: 0.3,
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('Dashboard Click-Through Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('ProjectDashboard — project name click navigates to /projects/:id', () => {
    beforeEach(() => {
      mockGetProjectDashboard.mockResolvedValue({
        data: [
          makeProjectItem({ projectId: 'proj-1', projectName: 'Alpha Project' }),
          makeProjectItem({ projectId: 'proj-2', projectName: 'Beta Project' }),
        ],
        meta: { total: 2 },
      });
    });

    it('renders project names as links to project detail page', async () => {
      renderWithProviders(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      });

      const alphaLink = screen.getByText('Alpha Project').closest('a');
      expect(alphaLink).toBeInTheDocument();
      expect(alphaLink).toHaveAttribute('href', '/projects/proj-1');

      const betaLink = screen.getByText('Beta Project').closest('a');
      expect(betaLink).toBeInTheDocument();
      expect(betaLink).toHaveAttribute('href', '/projects/proj-2');
    });

    it('project name link has correct styling (rendered as anchor)', async () => {
      renderWithProviders(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      });

      const link = screen.getByText('Alpha Project').closest('a');
      expect(link).toBeTruthy();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('ExecutiveDashboard — project card click navigates to /projects/:id', () => {
    beforeEach(() => {
      mockGetExecutiveDashboard.mockResolvedValue({
        data: {
          revenuePaise: 50000000,
          costPaise: 35000000,
          profitPaise: 15000000,
          marginPercent: 0.3,
          billableUtilisationPercent: 0.75,
          top5Projects: [
            makeProjectItem({ projectId: 'top-1', projectName: 'Top Project' }),
          ],
          bottom5Projects: [
            makeProjectItem({ projectId: 'bot-1', projectName: 'Bottom Project', profitPaise: -500000, marginPercent: -0.1 }),
          ],
        },
      });
      mockGetPracticeDashboard.mockResolvedValue({ data: [] });
    });

    it('top 5 project card click navigates to /projects/:id', async () => {
      renderWithProviders(<ExecutiveDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Top Project')).toBeInTheDocument();
      });

      const topCards = screen.getAllByTestId('project-card');
      fireEvent.click(topCards[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/top-1');
    });

    it('bottom 5 project card click navigates to /projects/:id', async () => {
      renderWithProviders(<ExecutiveDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Bottom Project')).toBeInTheDocument();
      });

      // Bottom 5 section cards
      const bottom5Section = screen.getByTestId('bottom-5-projects');
      const bottomCard = bottom5Section.querySelector('[data-testid="project-card"]');
      expect(bottomCard).toBeTruthy();
      fireEvent.click(bottomCard!);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/bot-1');
    });
  });

  describe('DepartmentDashboard — row click preserves existing filter navigation', () => {
    beforeEach(() => {
      mockGetDepartmentDashboard.mockResolvedValue({
        data: [makeDepartmentItem({ departmentName: 'Engineering' })],
      });
    });

    it('department row click navigates to project dashboard filtered by department', async () => {
      renderWithProviders(<DepartmentDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });

      // Click the department row
      const row = screen.getByText('Engineering').closest('tr');
      expect(row).toBeTruthy();
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboards/projects?department=Engineering');
    });
  });

  describe('RBAC — navigation works for different roles', () => {
    it('DM sees own projects and can click through', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'dm1', name: 'DM User', role: 'DELIVERY_MANAGER', email: 'dm@test.com' },
        isLoading: false,
        isAuthenticated: true,
      });
      mockGetProjectDashboard.mockResolvedValue({
        data: [makeProjectItem({ projectId: 'dm-proj', projectName: 'DM Project' })],
        meta: { total: 1 },
      });

      renderWithProviders(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText('DM Project')).toBeInTheDocument();
      });

      const link = screen.getByText('DM Project').closest('a');
      expect(link).toHaveAttribute('href', '/projects/dm-proj');
    });

    it('Finance user can click through to projects', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'fin1', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
        isLoading: false,
        isAuthenticated: true,
      });
      mockGetProjectDashboard.mockResolvedValue({
        data: [makeProjectItem({ projectId: 'fin-proj', projectName: 'Finance Project' })],
        meta: { total: 1 },
      });

      renderWithProviders(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Finance Project')).toBeInTheDocument();
      });

      const link = screen.getByText('Finance Project').closest('a');
      expect(link).toHaveAttribute('href', '/projects/fin-proj');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import ProjectDashboard from './ProjectDashboard';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock API functions
const mockGetProjectDashboard = vi.fn();

vi.mock('../../services/dashboards.api', () => ({
  reportKeys: {
    all: ['reports'] as const,
    projects: (filters?: Record<string, unknown>) =>
      ['reports', 'projects', filters ?? {}] as const,
  },
  getProjectDashboard: (...args: unknown[]) => mockGetProjectDashboard(...args),
}));

// Default useAuth mock
const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'u1', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
  isLoading: false,
  isAuthenticated: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <ProjectDashboard />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

function makeDashboardItem(overrides: Partial<{
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
    projectId: 'p1',
    projectName: 'Test Project',
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

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    mockGetProjectDashboard.mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders page title', () => {
    renderDashboard();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders dashboard table and filter bar', async () => {
    renderDashboard();
    expect(screen.getByTestId('project-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-table')).toBeInTheDocument();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No project data available')).toBeInTheDocument();
    });
  });

  it('renders projects with currency formatting', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ revenuePaise: 5000000, costPaise: 3500000, profitPaise: 1500000 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Currency values should be formatted (₹50,000 for 5000000 paise)
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
  });

  it('shows MarginHealthBadge with correct label for healthy margin (25%)', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ marginPercent: 0.25 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
    expect(screen.getByTestId('margin-health-badge')).toBeInTheDocument();
  });

  it('shows MarginHealthBadge with At Risk for 15% margin', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ projectId: 'p2', marginPercent: 0.15 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });
  });

  it('shows MarginHealthBadge with Low for 5% margin', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ projectId: 'p3', marginPercent: 0.05 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('shows AtRiskKPITile for loss project', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ profitPaise: -100000, marginPercent: -0.05 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('at-risk-kpi-tile')).toBeInTheDocument();
    });
  });

  it('renders engagement model labels', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ engagementModel: 'TIME_AND_MATERIALS' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Time & Materials')).toBeInTheDocument();
    });
  });

  it('renders project status badge', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ status: 'ACTIVE' })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('formats margin percent correctly', async () => {
    mockGetProjectDashboard.mockResolvedValue({
      data: [makeDashboardItem({ marginPercent: 0.3 })],
      meta: { total: 1 },
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });
  });
});

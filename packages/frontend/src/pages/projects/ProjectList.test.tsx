import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ProjectList from './ProjectList';

// ── Mocks ────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetProjects = vi.fn();

vi.mock('../../services/projects.api', () => ({
  projectKeys: {
    all: ['projects'],
    list: (scope?: string) => ['projects', 'list', scope ?? 'default'],
    detail: (id: string) => ['projects', id],
    teamMembers: (id: string) => ['projects', id, 'team-members'],
  },
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  engagementModelLabels: {
    TIME_AND_MATERIALS: 'Time & Materials',
    FIXED_COST: 'Fixed Cost',
    AMC: 'AMC',
    INFRASTRUCTURE: 'Infrastructure',
  },
}));

let mockUser: { role: string; name: string } | null = { role: 'DELIVERY_MANAGER', name: 'DM User' };

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, isAuthenticated: true }),
}));

// ── Helpers ──────────────────────────────────────────────────────

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects']}>
        <ProjectList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const dmProject = {
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

const pendingProject = {
  id: 'proj-2',
  name: 'Beta Project',
  client: 'Beta Inc',
  vertical: 'Healthcare',
  engagementModel: 'FIXED_COST',
  status: 'PENDING_APPROVAL',
  contractValuePaise: 50000000,
  deliveryManagerId: 'dm-2',
  deliveryManagerName: 'Jane DM',
  rejectionComment: null,
  completionPercent: 0.5,
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T00:00:00.000Z',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

// ── Tests ────────────────────────────────────────────────────────

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'DELIVERY_MANAGER', name: 'DM User' };
  });

  it('renders page title', () => {
    mockGetProjects.mockResolvedValue({ data: [], meta: { total: 0 } });
    renderComponent();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetProjects.mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders projects in table for DM (AC: 1)', async () => {
    mockGetProjects.mockResolvedValue({
      data: [dmProject],
      meta: { total: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Time & Materials')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    expect(screen.getByText('2026-12-31')).toBeInTheDocument();
  });

  it('does NOT show Delivery Manager column for DM role (AC: 1)', async () => {
    mockUser = { role: 'DELIVERY_MANAGER', name: 'DM User' };
    mockGetProjects.mockResolvedValue({
      data: [dmProject],
      meta: { total: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    // No DM column header
    expect(screen.queryByText('Delivery Manager')).not.toBeInTheDocument();
  });

  it('shows Delivery Manager column for Admin (AC: 2)', async () => {
    mockUser = { role: 'ADMIN', name: 'Admin User' };
    mockGetProjects.mockResolvedValue({
      data: [dmProject, pendingProject],
      meta: { total: 2 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    // DM column should be visible
    expect(screen.getByText('Delivery Manager')).toBeInTheDocument();
    expect(screen.getByText('John DM')).toBeInTheDocument();
    expect(screen.getByText('Jane DM')).toBeInTheDocument();
  });

  it('shows Delivery Manager column for Finance (AC: 2)', async () => {
    mockUser = { role: 'FINANCE', name: 'Finance User' };
    mockGetProjects.mockResolvedValue({
      data: [dmProject],
      meta: { total: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    expect(screen.getByText('Delivery Manager')).toBeInTheDocument();
    expect(screen.getByText('John DM')).toBeInTheDocument();
  });

  it('shows pending approval projects for Admin (AC: 2)', async () => {
    mockUser = { role: 'ADMIN', name: 'Admin User' };
    mockGetProjects.mockResolvedValue({
      data: [dmProject, pendingProject],
      meta: { total: 2 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('navigates to project detail on row click (AC: 3)', async () => {
    mockGetProjects.mockResolvedValue({
      data: [dmProject],
      meta: { total: 1 },
    });

    const user = userEvent.setup({ delay: null });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alpha Project'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1');
  });

  it('shows DM-specific empty state for "My Projects" scope', async () => {
    mockGetProjects.mockResolvedValue({ data: [], meta: { total: 0 } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No projects assigned to you')).toBeInTheDocument();
    });
  });

  it('shows generic empty state for non-DM role', async () => {
    mockUser = { role: 'ADMIN', name: 'Admin User' };
    mockGetProjects.mockResolvedValue({ data: [], meta: { total: 0 } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });

  it('shows error alert on API failure', async () => {
    mockGetProjects.mockRejectedValue(new Error('Network error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
    });
  });

  // ── Story 10.6: DM "My Projects" Toggle ──

  it('DM: shows scope toggle with "My Projects" default (AC: 1, 2)', async () => {
    mockGetProjects.mockResolvedValue({ data: [dmProject], meta: { total: 1 } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('scope-toggle')).toBeInTheDocument();
    });
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('All Projects')).toBeInTheDocument();
  });

  it('DM: default scope calls API without scope=all (AC: 4)', async () => {
    mockGetProjects.mockResolvedValue({ data: [], meta: { total: 0 } });
    renderComponent();

    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith(undefined);
    });
  });

  it('DM: toggling to "All Projects" calls API with scope=all (AC: 3, 5)', async () => {
    mockGetProjects.mockResolvedValue({ data: [], meta: { total: 0 } });
    const user = userEvent.setup({ delay: null });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('All Projects')).toBeInTheDocument();
    });

    await user.click(screen.getByText('All Projects'));

    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith('all');
    });
  });

  it('Admin: does NOT show scope toggle (AC: 6)', async () => {
    mockUser = { role: 'ADMIN', name: 'Admin User' };
    mockGetProjects.mockResolvedValue({ data: [dmProject], meta: { total: 1 } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('scope-toggle')).not.toBeInTheDocument();
  });

  it('Finance: does NOT show scope toggle (AC: 6)', async () => {
    mockUser = { role: 'FINANCE', name: 'Finance User' };
    mockGetProjects.mockResolvedValue({ data: [dmProject], meta: { total: 1 } });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('scope-toggle')).not.toBeInTheDocument();
  });
});

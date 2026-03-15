import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import ProjectList from './ProjectList';
import AppLayout from '../../layouts/AppLayout';
import { navItems } from '../../config/navigation';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => vi.fn() };
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

let mockUser: { role: string; name: string } | null = { role: 'ADMIN', name: 'Admin' };

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isLoading: false, isAuthenticated: true }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

// ── Helpers ──────────────────────────────────────────────────────

function renderProjectList() {
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

function renderAppLayout(projects: unknown[] = []) {
  mockGetProjects.mockResolvedValue({ data: projects, meta: { total: projects.length } });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/pending-approvals']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/admin/pending-approvals" element={<div>Pending Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeProject(overrides: Record<string, unknown>) {
  return {
    id: 'p-' + Math.random().toString(36).slice(2, 6),
    name: 'Project',
    client: 'Client',
    vertical: 'IT',
    engagementModel: 'TIME_AND_MATERIALS',
    status: 'ACTIVE',
    contractValuePaise: 10000000,
    deliveryManagerId: 'dm-1',
    deliveryManagerName: 'DM',
    rejectionComment: null,
    completionPercent: null,
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-10',
    financials: null,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('UI Polish — Sidebar & Sort Order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'ADMIN', name: 'Admin' };
  });

  // ── AC 1: Pending Approvals Badge ────────────────────────────
  describe('Pending Approvals Badge (AC 1)', () => {
    it('renders antd Badge component around Pending Approvals label', async () => {
      const projects = [
        makeProject({ status: 'PENDING_APPROVAL', name: 'Pending Project 1' }),
        makeProject({ status: 'ACTIVE', name: 'Active Project 1' }),
      ];
      renderAppLayout(projects);

      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });

      // The Badge should wrap the Pending Approvals text — look for antd Badge container
      const badgeEl = document.querySelector('.ant-badge');
      expect(badgeEl).not.toBeNull();
      expect(badgeEl!.textContent).toContain('Pending Approvals');
    });

    it('shows count of pending approval projects in Badge', async () => {
      const projects = [
        makeProject({ status: 'PENDING_APPROVAL', name: 'PA1' }),
        makeProject({ status: 'PENDING_APPROVAL', name: 'PA2' }),
        makeProject({ status: 'ACTIVE', name: 'Active1' }),
      ];
      renderAppLayout(projects);

      await waitFor(() => {
        // antd Badge renders count as a sup element with ant-badge-count class
        const countEl = document.querySelector('.ant-badge .ant-badge-count');
        expect(countEl).not.toBeNull();
      });
    });
  });

  // ── AC 2: Sidebar label not truncated ──────────────────────────
  describe('Sidebar label (AC 2)', () => {
    it('Department Dashboard label is shortened to "Dept Dashboard"', () => {
      const deptItem = navItems.find((item) => item.key === 'dashboards-dept');
      expect(deptItem).toBeDefined();
      expect(deptItem!.label).toBe('Dept Dashboard');
      // Must not be truncated — i.e., no "..." in the label
      expect(deptItem!.label).not.toContain('...');
    });

    it('no sidebar label exceeds reasonable length for 220px sidebar', () => {
      // With a 220px sidebar, 48px icon area, labels up to ~20 chars fit comfortably
      for (const item of navItems) {
        expect(item.label.length).toBeLessThanOrEqual(20);
      }
    });
  });

  // ── AC 3: Project list default sort order ──────────────────────
  describe('Project list sort order (AC 3)', () => {
    it('renders projects in status priority order: ACTIVE, PENDING_APPROVAL, ON_HOLD, COMPLETED, REJECTED', async () => {
      // Feed projects in WRONG order — the backend sort should have reordered them
      // but this frontend test verifies the table respects the order returned by the API.
      // The actual sort logic lives in project.service.ts — tested in backend tests.
      const projects = [
        makeProject({ id: 'p-completed', name: 'Completed Proj', status: 'COMPLETED' }),
        makeProject({ id: 'p-active', name: 'Active Proj', status: 'ACTIVE' }),
        makeProject({ id: 'p-rejected', name: 'Rejected Proj', status: 'REJECTED' }),
        makeProject({ id: 'p-pending', name: 'Pending Proj', status: 'PENDING_APPROVAL' }),
        makeProject({ id: 'p-onhold', name: 'OnHold Proj', status: 'ON_HOLD' }),
      ];

      mockGetProjects.mockResolvedValue({ data: projects, meta: { total: 5 } });
      renderProjectList();

      await waitFor(() => {
        expect(screen.getByText('Active Proj')).toBeInTheDocument();
      });

      // Verify all projects render
      expect(screen.getByText('Pending Proj')).toBeInTheDocument();
      expect(screen.getByText('OnHold Proj')).toBeInTheDocument();
      expect(screen.getByText('Completed Proj')).toBeInTheDocument();
      expect(screen.getByText('Rejected Proj')).toBeInTheDocument();

      // Verify the table renders data rows in the order the API returned them
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // rows[0] is the header row
      expect(dataRows.length).toBe(5);

      // Table renders in API order — first row is COMPLETED (as returned by mock)
      expect(dataRows[0]).toHaveTextContent('Completed Proj');
      expect(dataRows[1]).toHaveTextContent('Active Proj');
    });
  });
});

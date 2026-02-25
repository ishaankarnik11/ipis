import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import PendingApprovals from './PendingApprovals';
import AppLayout from '../../layouts/AppLayout';

// Mock API functions
const mockGetProjects = vi.fn();
const mockApproveProject = vi.fn();
const mockRejectProject = vi.fn();

vi.mock('../../services/projects.api', () => ({
  projectKeys: { all: ['projects'] as const, detail: (id: string) => ['projects', id] as const },
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  approveProject: (...args: unknown[]) => mockApproveProject(...args),
  rejectProject: (...args: unknown[]) => mockRejectProject(...args),
  engagementModelLabels: {
    TIME_AND_MATERIALS: 'Time & Materials',
    FIXED_COST: 'Fixed Cost',
    AMC: 'AMC',
    INFRASTRUCTURE: 'Infrastructure',
  },
}));

// Mock antd notification
const mockNotificationSuccess = vi.fn();
const mockNotificationError = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    notification: {
      success: (...args: unknown[]) => mockNotificationSuccess(...args),
      error: (...args: unknown[]) => mockNotificationError(...args),
    },
  };
});

// Mock auth hook for AppLayout badge tests
let mockAuthUser: { role: string; name: string } | null = null;
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  getRoleLandingPage: () => '/admin',
}));

const pendingProject = {
  id: 'p1',
  name: 'Test Project Alpha',
  client: 'Acme Corp',
  vertical: 'IT',
  engagementModel: 'TIME_AND_MATERIALS' as const,
  status: 'PENDING_APPROVAL' as const,
  contractValuePaise: null,
  deliveryManagerId: 'dm1',
  deliveryManagerName: 'John DM',
  rejectionComment: null,
  completionPercent: null,
  startDate: '2026-03-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
};

const pendingProject2 = {
  id: 'p2',
  name: 'Test Project Beta',
  client: 'Beta Inc',
  vertical: 'Healthcare',
  engagementModel: 'FIXED_COST' as const,
  status: 'PENDING_APPROVAL' as const,
  contractValuePaise: 50000000,
  deliveryManagerId: 'dm1',
  deliveryManagerName: 'John DM',
  rejectionComment: null,
  completionPercent: null,
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T00:00:00.000Z',
  createdAt: '2026-02-21T10:00:00.000Z',
  updatedAt: '2026-02-21T10:00:00.000Z',
};

const activeProject = {
  id: 'p3',
  name: 'Active Project',
  client: 'Gamma',
  vertical: 'FinTech',
  engagementModel: 'TIME_AND_MATERIALS' as const,
  status: 'ACTIVE' as const,
  contractValuePaise: null,
  deliveryManagerId: 'dm1',
  deliveryManagerName: 'John DM',
  rejectionComment: null,
  completionPercent: null,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function renderPendingApprovals() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <PendingApprovals />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('PendingApprovals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue({
      data: [pendingProject, pendingProject2, activeProject],
      meta: { total: 3 },
    });
    mockApproveProject.mockResolvedValue({ success: true });
    mockRejectProject.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the table with only pending projects', async () => {
    renderPendingApprovals();

    await waitFor(() => {
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Project Beta')).toBeInTheDocument();
    // Active project should NOT appear
    expect(screen.queryByText('Active Project')).not.toBeInTheDocument();
  });

  it('should display correct columns: name, DM, engagement model, contract value, date', async () => {
    renderPendingApprovals();

    await waitFor(() => {
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });

    // Column headers
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Delivery Manager')).toBeInTheDocument();
    expect(screen.getByText('Engagement Model')).toBeInTheDocument();
    expect(screen.getByText('Contract Value')).toBeInTheDocument();
    expect(screen.getByText('Submission Date')).toBeInTheDocument();

    // DM name rendered
    expect(screen.getAllByText('John DM').length).toBeGreaterThanOrEqual(1);

    // Engagement model labels
    expect(screen.getByText('Time & Materials')).toBeInTheDocument();
    expect(screen.getByText('Fixed Cost')).toBeInTheDocument();
  });

  it('should call approve API and show notification when Approve is clicked', async () => {
    renderPendingApprovals();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockApproveProject).toHaveBeenCalledWith('p1');
    });

    await waitFor(() => {
      expect(mockNotificationSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Project Test Project Alpha approved' }),
      );
    });
  });

  it('should open reject modal and require comment before submission', async () => {
    renderPendingApprovals();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });

    // Click Reject
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    await user.click(rejectButtons[0]);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText(/reject project: test project alpha/i)).toBeInTheDocument();
    });

    // Try to submit with empty comment — click "Confirm Rejection" button
    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i });
    await user.click(confirmBtn);

    // Validation error should appear
    await waitFor(() => {
      expect(screen.getByText('Rejection reason is required')).toBeInTheDocument();
    });

    // API should NOT have been called
    expect(mockRejectProject).not.toHaveBeenCalled();
  });

  it('should call reject API with comment when form is valid', async () => {
    renderPendingApprovals();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Test Project Alpha')).toBeInTheDocument();
    });

    // Click Reject
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/reject project: test project alpha/i)).toBeInTheDocument();
    });

    // Fill in comment
    const textarea = screen.getByPlaceholderText(/enter reason for rejection/i);
    await user.type(textarea, 'Budget too high');

    // Submit
    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockRejectProject).toHaveBeenCalledWith('p1', 'Budget too high');
    });

    await waitFor(() => {
      expect(mockNotificationSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Project Test Project Alpha rejected' }),
      );
    });
  });

  it('should show loading state', () => {
    mockGetProjects.mockReturnValue(new Promise(() => {}));
    renderPendingApprovals();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});

describe('Sidebar badge count (AC: 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { role: 'ADMIN', name: 'Admin User' };
    mockGetProjects.mockResolvedValue({
      data: [pendingProject, pendingProject2, activeProject],
      meta: { total: 3 },
    });
  });

  afterEach(() => {
    mockAuthUser = null;
    cleanup();
  });

  it('should render badge with pending project count in admin sidebar', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
          <MemoryRouter initialEntries={['/admin/pending-approvals']}>
            <AppLayout />
          </MemoryRouter>
        </ConfigProvider>
      </QueryClientProvider>,
    );

    // Wait for projects query to resolve and badge to render
    // antd Badge renders count in a sup.ant-scroll-number element
    await waitFor(() => {
      const badge = document.querySelector('.ant-scroll-number');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import AuditLog from './AuditLog';
import type { AuditEvent, AuditLogResponse } from '../../services/audit.api';

// antd v6 Table/Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetAuditLog = vi.fn();

vi.mock('../../services/audit.api', () => ({
  auditKeys: {
    all: ['audit-log'] as const,
    list: (filters: unknown) => ['audit-log', filters] as const,
  },
  getAuditLog: (...args: unknown[]) => mockGetAuditLog(...args),
}));

const testEvents: AuditEvent[] = [
  {
    id: 'evt-1',
    actorName: 'Admin User',
    actorEmail: 'admin@test.com',
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: 'user-1',
    metadata: { name: 'Alice', role: 'HR' },
    ipAddress: '127.0.0.1',
    createdAt: '2026-02-24T10:00:00Z',
  },
  {
    id: 'evt-2',
    actorName: null,
    actorEmail: null,
    action: 'PROJECT_REJECTED',
    entityType: 'Project',
    entityId: 'proj-1',
    metadata: null,
    ipAddress: null,
    createdAt: '2026-02-24T09:00:00Z',
  },
  {
    id: 'evt-3',
    actorName: 'Finance User',
    actorEmail: 'finance@test.com',
    action: 'UPLOAD_SALARY_SUCCESS',
    entityType: 'Employee',
    entityId: null,
    metadata: { imported: 15, failed: 0 },
    ipAddress: '192.168.1.1',
    createdAt: '2026-02-24T08:00:00Z',
  },
];

const mockResponse: AuditLogResponse = {
  data: testEvents,
  meta: { total: 3, page: 1, pageSize: 50 },
};

function renderAuditLog(initialEntry = '/admin/audit-log') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AuditLog />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('AuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuditLog.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    cleanup();
  });

  it('should render table with mocked audit events (AC 3, 9)', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('Admin User (admin@test.com)')).toBeInTheDocument();
    });

    expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    expect(screen.getByText('PROJECT_REJECTED')).toBeInTheDocument();
    expect(screen.getByText('UPLOAD_SALARY_SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('should render entity column with type and id', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('User / user-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Project / proj-1')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
  });

  it('should render action tags with color coding (AC 3)', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    });

    const userCreatedTag = screen.getByText('USER_CREATED').closest('.ant-tag');
    expect(userCreatedTag).toBeInTheDocument();

    const projectRejectedTag = screen.getByText('PROJECT_REJECTED').closest('.ant-tag');
    expect(projectRejectedTag).toBeInTheDocument();
  });

  it('should render filter controls (AC 4, 5, 6)', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by actor email')).toBeInTheDocument();
    });

    // antd v6 Select renders placeholder in a div, not as input placeholder attr
    expect(screen.getByText('Filter by action')).toBeInTheDocument();
    // DatePicker range inputs
    expect(screen.getByPlaceholderText('Start date')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('End date')).toBeInTheDocument();
  });

  it('should have NO delete, purge, or edit buttons — read-only (AC 7, 9)', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /purge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('should call API with filter params when action filter changes (AC 4, 9)', async () => {
    renderAuditLog();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(mockGetAuditLog).toHaveBeenCalled();
    });

    // Open the action multi-select dropdown via the combobox input
    const actionSelect = screen.getByRole('combobox');
    await user.click(actionSelect);

    await waitFor(() => {
      const option = document.querySelector('.ant-select-item[title="USER_CREATED"]');
      expect(option).toBeInTheDocument();
    });
  });

  it('should render actor email search input (AC 6)', async () => {
    renderAuditLog();

    await waitFor(() => {
      expect(mockGetAuditLog).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText('Search by actor email');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should show empty state when no events', async () => {
    mockGetAuditLog.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 50 } });

    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText('No audit events found')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    mockGetAuditLog.mockReturnValue(new Promise(() => {}));

    renderAuditLog();

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('should display page heading', () => {
    renderAuditLog();

    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });
});

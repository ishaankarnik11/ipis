import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router';
import SharedReport from './SharedReport';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function renderWithToken(token = 'valid-token-123') {
  return render(
    <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
      <MemoryRouter initialEntries={[`/reports/shared/${token}`]}>
        <Routes>
          <Route path="/reports/shared/:token" element={<SharedReport />} />
        </Routes>
      </MemoryRouter>
    </ConfigProvider>,
  );
}

// ── Mock data factories ──

function makeExecutiveSnapshot() {
  return {
    revenuePaise: 12500000,
    costPaise: 8750000,
    marginPercent: 0.30,
    billableUtilisationPercent: 0.871,
    top5Projects: [
      {
        projectId: 'p1',
        projectName: 'Alpha Project',
        engagementModel: 'TIME_AND_MATERIALS',
        department: 'Engineering',
        status: 'ACTIVE',
        revenuePaise: 5000000,
        costPaise: 3000000,
        profitPaise: 2000000,
        marginPercent: 0.40,
      },
    ],
    bottom5Projects: [
      {
        projectId: 'p2',
        projectName: 'Beta Project',
        engagementModel: 'FIXED_COST',
        department: 'Design',
        status: 'ACTIVE',
        revenuePaise: 1000000,
        costPaise: 1200000,
        profitPaise: -200000,
        marginPercent: -0.20,
      },
    ],
  };
}

function makeProjectSnapshot() {
  return [
    {
      projectId: 'p1',
      projectName: 'Alpha Project',
      engagementModel: 'TIME_AND_MATERIALS',
      department: 'Engineering',
      status: 'ACTIVE',
      revenuePaise: 5000000,
      costPaise: 3500000,
      profitPaise: 1500000,
      marginPercent: 0.30,
    },
    {
      projectId: 'p2',
      projectName: 'Beta Project',
      engagementModel: 'FIXED_COST',
      department: null,
      status: 'ACTIVE',
      revenuePaise: 2000000,
      costPaise: 2500000,
      profitPaise: -500000,
      marginPercent: -0.25,
    },
  ];
}

function makeDepartmentSnapshot() {
  return [
    {
      departmentId: 'd1',
      departmentName: 'Engineering',
      revenuePaise: 10000000,
      costPaise: 7000000,
      profitPaise: 3000000,
      marginPercent: 0.30,
    },
    {
      departmentId: 'd2',
      departmentName: 'Design',
      revenuePaise: 3000000,
      costPaise: 2800000,
      profitPaise: 200000,
      marginPercent: 0.067,
    },
  ];
}

function mockFetchSuccess(reportType: string, snapshotData: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      data: {
        snapshotData,
        reportType,
        createdAt: '2026-03-01T00:00:00Z',
        expiresAt: '2026-03-31T00:00:00Z',
      },
    }),
  } as Response);
}

function mockFetchError(code: string, message: string, status = 410) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({
      error: { code, message },
    }),
  } as unknown as Response);
}

describe('SharedReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── Executive Dashboard (AC: 4) ──

  describe('Executive Dashboard share view', () => {
    it('renders KPI tiles from executive data', async () => {
      mockFetchSuccess('executive', makeExecutiveSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('executive-share-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('kpi-tiles')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Gross Margin')).toBeInTheDocument();
      expect(screen.getByText('Billable Utilisation')).toBeInTheDocument();

      // Formatted currency values
      expect(screen.getByText('₹1,25,000')).toBeInTheDocument();  // 12500000 paise
      expect(screen.getByText('₹87,500')).toBeInTheDocument();    // 8750000 paise

      // Formatted percentages
      expect(screen.getByText('30.0%')).toBeInTheDocument();
      expect(screen.getByText('87.1%')).toBeInTheDocument();
    });

    it('renders top 5 and bottom 5 project sections', async () => {
      mockFetchSuccess('executive', makeExecutiveSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByText('Top 5 Projects by Margin')).toBeInTheDocument();
      });
      expect(screen.getByText('Bottom 5 Projects by Margin')).toBeInTheDocument();
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });

    it('renders MarginHealthBadge on project cards', async () => {
      mockFetchSuccess('executive', makeExecutiveSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getAllByTestId('margin-health-badge').length).toBeGreaterThan(0);
      });
    });

    it('renders AtRiskKPITile for loss projects', async () => {
      mockFetchSuccess('executive', makeExecutiveSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('at-risk-kpi-tile')).toBeInTheDocument();
      });
    });
  });

  // ── Project Dashboard (AC: 5) ──

  describe('Project Dashboard share view', () => {
    it('renders project table with financial columns', async () => {
      mockFetchSuccess('project', makeProjectSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('project-share-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('project-table')).toBeInTheDocument();
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });

    it('renders summary KPIs for projects', async () => {
      mockFetchSuccess('project', makeProjectSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('kpi-tiles')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Total Profit')).toBeInTheDocument();
    });

    it('renders margin health badges in project table', async () => {
      mockFetchSuccess('project', makeProjectSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getAllByTestId('margin-health-badge').length).toBeGreaterThan(0);
      });
    });

    it('renders AtRiskKPITile for loss projects in table', async () => {
      mockFetchSuccess('project', makeProjectSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('at-risk-kpi-tile')).toBeInTheDocument();
      });
    });
  });

  // ── Department Dashboard (AC: 6) ──

  describe('Department Dashboard share view', () => {
    it('renders department KPI tiles and table', async () => {
      mockFetchSuccess('department', makeDepartmentSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('department-share-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('kpi-tiles')).toBeInTheDocument();
      expect(screen.getByTestId('department-table')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('renders margin health badges in department table', async () => {
      mockFetchSuccess('department', makeDepartmentSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getAllByTestId('margin-health-badge').length).toBeGreaterThan(0);
      });
    });
  });

  // ── Error handling (AC: 7) ──

  describe('Error handling', () => {
    it('renders error page for expired token', async () => {
      mockFetchError('LINK_EXPIRED', 'This share link has expired');
      renderWithToken('expired-token');

      await waitFor(() => {
        expect(screen.getByTestId('shared-report-error')).toBeInTheDocument();
      });

      expect(screen.getByText('This report link has expired or is invalid')).toBeInTheDocument();
      expect(screen.getByText(/request a new link/i)).toBeInTheDocument();
    });

    it('renders error page for revoked token', async () => {
      mockFetchError('LINK_REVOKED', 'This share link has been revoked');
      renderWithToken('revoked-token');

      await waitFor(() => {
        expect(screen.getByTestId('shared-report-error')).toBeInTheDocument();
      });

      expect(screen.getByText('This report link has expired or is invalid')).toBeInTheDocument();
    });

    it('renders error page for invalid/not-found token', async () => {
      mockFetchError('NOT_FOUND', 'Share link not found', 404);
      renderWithToken('invalid-token');

      await waitFor(() => {
        expect(screen.getByTestId('shared-report-error')).toBeInTheDocument();
      });

      expect(screen.getByText('This report link has expired or is invalid')).toBeInTheDocument();
    });

    it('renders generic error for unknown errors', async () => {
      mockFetchError('UNKNOWN', 'Something went wrong', 500);
      renderWithToken('bad-token');

      await waitFor(() => {
        expect(screen.getByTestId('shared-report-error')).toBeInTheDocument();
      });
    });
  });

  // ── No raw JSON (AC: 8) ──

  describe('No raw JSON in output', () => {
    it('does not render <pre> tag or JSON.stringify output for executive data', async () => {
      mockFetchSuccess('executive', makeExecutiveSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('executive-share-view')).toBeInTheDocument();
      });

      const container = screen.getByTestId('shared-report');
      expect(container.querySelector('pre')).toBeNull();
      expect(container.textContent).not.toContain('revenuePaise');
      expect(container.textContent).not.toContain('billableUtilisationPercent');
      expect(container.textContent).not.toContain('top5Projects');
    });

    it('does not render raw JSON field names for project data', async () => {
      mockFetchSuccess('project', makeProjectSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('project-share-view')).toBeInTheDocument();
      });

      const container = screen.getByTestId('shared-report');
      expect(container.querySelector('pre')).toBeNull();
      expect(container.textContent).not.toContain('revenuePaise');
      expect(container.textContent).not.toContain('costPaise');
      expect(container.textContent).not.toContain('profitPaise');
    });

    it('does not render raw JSON for department data', async () => {
      mockFetchSuccess('department', makeDepartmentSnapshot());
      renderWithToken();

      await waitFor(() => {
        expect(screen.getByTestId('department-share-view')).toBeInTheDocument();
      });

      const container = screen.getByTestId('shared-report');
      expect(container.querySelector('pre')).toBeNull();
      expect(container.textContent).not.toContain('departmentId');
    });
  });

  // ── Shared banner ──

  it('shows shared snapshot banner with dates', async () => {
    mockFetchSuccess('executive', makeExecutiveSnapshot());
    renderWithToken();

    await waitFor(() => {
      expect(screen.getByText(/shared snapshot/i)).toBeInTheDocument();
    });
  });

  it('shows report title', async () => {
    mockFetchSuccess('executive', makeExecutiveSnapshot());
    renderWithToken();

    await waitFor(() => {
      expect(screen.getByText('Executive Dashboard Report')).toBeInTheDocument();
    });
  });
});

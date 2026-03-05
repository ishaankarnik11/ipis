import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import LedgerDrawer from './LedgerDrawer';
import type {
  LedgerData,
  EmployeeLedgerData,
  InfraSimpleLedgerData,
  InfraDetailedLedgerData,
} from '../../services/ledger.api';

// antd uses ResizeObserver internally
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockGetProjectLedger = vi.fn();
const mockGetLatestByType = vi.fn();

vi.mock('../../services/ledger.api', () => ({
  ledgerKeys: {
    all: ['ledger'] as const,
    detail: (projectId: string, period: string) =>
      ['ledger', projectId, period] as const,
  },
  getProjectLedger: (...args: unknown[]) => mockGetProjectLedger(...args),
}));

vi.mock('../../services/uploads.api', () => ({
  uploadKeys: {
    latestByType: ['uploads', 'latestByType'] as const,
  },
  getLatestByType: (...args: unknown[]) => mockGetLatestByType(...args),
}));

// ── Test helpers ────────────────────────────────────────────────────────────

function renderDrawer(
  props: Partial<{
    projectId: string | null;
    projectName: string;
    open: boolean;
    onClose: () => void;
  }> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const defaultProps = {
    projectId: 'p1',
    projectName: 'Alpha Project',
    open: true,
    onClose: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
          <LedgerDrawer {...defaultProps} />
        </ConfigProvider>
      </QueryClientProvider>,
    ),
    onClose: defaultProps.onClose,
  };
}

function makeTmLedgerData(
  overrides: Partial<EmployeeLedgerData> = {},
): EmployeeLedgerData {
  return {
    revenue_paise: 5000000,
    cost_paise: 3500000,
    profit_paise: 1500000,
    margin_percent: 0.3,
    engagement_model: 'TIME_AND_MATERIALS',
    calculated_at: new Date().toISOString(),
    engine_version: '1.0.0',
    recalculation_run_id: 'run-1',
    employees: [
      {
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        designation: 'Senior Developer',
        hours: 160,
        cost_per_hour_paise: 53125,
        contribution_paise: 8500000,
      },
      {
        employeeId: 'emp-2',
        employeeName: 'John Smith',
        designation: 'QA Engineer',
        hours: 120,
        cost_per_hour_paise: 37500,
        contribution_paise: 4500000,
      },
    ],
    ...overrides,
  };
}

function makeInfraSimpleData(
  overrides: Partial<InfraSimpleLedgerData> = {},
): InfraSimpleLedgerData {
  return {
    revenue_paise: 10000000,
    cost_paise: 8000000,
    profit_paise: 2000000,
    margin_percent: 0.2,
    engagement_model: 'INFRASTRUCTURE',
    calculated_at: new Date().toISOString(),
    engine_version: '1.0.0',
    recalculation_run_id: 'run-2',
    infra_cost_mode: 'SIMPLE',
    vendor_cost_paise: 5000000,
    manpower_cost_paise: 3000000,
    ...overrides,
  };
}

function makeInfraDetailedData(
  overrides: Partial<InfraDetailedLedgerData> = {},
): InfraDetailedLedgerData {
  return {
    revenue_paise: 10000000,
    cost_paise: 7500000,
    profit_paise: 2500000,
    margin_percent: 0.25,
    engagement_model: 'INFRASTRUCTURE',
    calculated_at: new Date().toISOString(),
    engine_version: '1.0.0',
    recalculation_run_id: 'run-3',
    infra_cost_mode: 'DETAILED',
    vendor_cost_paise: 5000000,
    employees: [
      {
        employeeId: 'emp-3',
        employeeName: 'Ops Engineer',
        designation: 'DevOps Lead',
        hours: 120,
        cost_per_hour_paise: 62500,
        contribution_paise: 7500000,
      },
    ],
    ...overrides,
  };
}

function setupMocks(data: LedgerData) {
  mockGetLatestByType.mockResolvedValue({
    data: [
      { type: 'BILLING', periodMonth: 2, periodYear: 2026, createdAt: '2026-02-15T10:00:00Z' },
    ],
  });
  mockGetProjectLedger.mockResolvedValue({ data });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('LedgerDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens drawer and shows project name with period in title', async () => {
    setupMocks(makeTmLedgerData());
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText(/Alpha Project/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 2026/)).toBeInTheDocument();
    });
  });

  it('calls API with correct project ID and period', async () => {
    setupMocks(makeTmLedgerData());
    renderDrawer({ projectId: 'proj-123' });

    await waitFor(() => {
      expect(mockGetProjectLedger).toHaveBeenCalledWith('proj-123', '2026-02');
    });
  });

  it('renders derived figures with dotted underline', async () => {
    setupMocks(makeTmLedgerData());
    renderDrawer();

    await waitFor(() => {
      const derivedFigures = screen.getAllByTestId('derived-figure');
      expect(derivedFigures.length).toBeGreaterThanOrEqual(2);
      // Check the style attribute includes dotted border
      const firstDerived = derivedFigures[0];
      const style = firstDerived.getAttribute('style') ?? '';
      expect(style).toContain('dotted');
    });
  });

  it('highlights loss-row on largest contributor for loss project', async () => {
    const lossData = makeTmLedgerData({
      profit_paise: -100000,
      margin_percent: -0.05,
      employees: [
        {
          employeeId: 'emp-1',
          employeeName: 'Jane Doe',
          designation: 'Dev',
          hours: 160,
          cost_per_hour_paise: 53125,
          contribution_paise: 8500000,
        },
        {
          employeeId: 'emp-2',
          employeeName: 'John Smith',
          designation: 'QA',
          hours: 80,
          cost_per_hour_paise: 37500,
          contribution_paise: 3000000,
        },
      ],
    });
    setupMocks(lossData);
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByTestId('employee-breakdown-table')).toBeInTheDocument();
    });

    // The row containing the largest contributor (Jane Doe, 8500000) should have loss-row class
    const table = screen.getByTestId('employee-breakdown-table');
    const rows = table.querySelectorAll('tr.loss-row');
    expect(rows.length).toBe(1);
    expect(within(rows[0] as HTMLElement).getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders metadata footer with engine version and timestamp', async () => {
    setupMocks(makeTmLedgerData({ engine_version: '2.1.0' }));
    renderDrawer();

    await waitFor(() => {
      const footer = screen.getByTestId('ledger-metadata-footer');
      expect(footer).toBeInTheDocument();
      expect(footer.textContent).toContain('Engine v2.1.0');
      expect(footer.textContent).toContain('Calculated:');
    });
  });

  it('uses full width on mobile viewport', async () => {
    // Save original and mock mobile width
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });
    window.dispatchEvent(new Event('resize'));

    setupMocks(makeTmLedgerData());
    renderDrawer();

    await waitFor(() => {
      const wrapper = document.querySelector('.ant-drawer-content-wrapper');
      expect(wrapper).toBeInTheDocument();
      const style = (wrapper as HTMLElement).getAttribute('style') ?? '';
      expect(style).toContain('100%');
    });

    // Restore
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    window.dispatchEvent(new Event('resize'));
  });

  it('closes drawer on close action', async () => {
    setupMocks(makeTmLedgerData());
    const { onClose } = renderDrawer();

    await waitFor(() => {
      expect(screen.getByTestId('ledger-kpi-tiles')).toBeInTheDocument();
    });

    // Click the close button
    const closeBtn = document.querySelector('.ant-drawer-close');
    expect(closeBtn).toBeTruthy();
    await userEvent.click(closeBtn as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders cost summary card for Infra SIMPLE (no employee table)', async () => {
    setupMocks(makeInfraSimpleData());
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByTestId('cost-summary-card')).toBeInTheDocument();
      expect(screen.getByText('Vendor Cost')).toBeInTheDocument();
      expect(screen.getByText('Manpower Cost')).toBeInTheDocument();
    });

    // No employee table should be rendered
    expect(screen.queryByTestId('employee-breakdown-table')).not.toBeInTheDocument();
  });

  it('renders vendor cost line and employee table for Infra DETAILED', async () => {
    setupMocks(makeInfraDetailedData());
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByTestId('vendor-cost-line')).toBeInTheDocument();
      expect(screen.getByTestId('employee-breakdown-table')).toBeInTheDocument();
      expect(screen.getByText('Ops Engineer')).toBeInTheDocument();
    });
  });

  it('shows red border on cost summary card for Infra SIMPLE loss project', async () => {
    setupMocks(
      makeInfraSimpleData({
        profit_paise: -500000,
        margin_percent: -0.05,
      }),
    );
    renderDrawer();

    await waitFor(() => {
      const card = screen.getByTestId('cost-summary-card');
      expect(card).toBeInTheDocument();
      // Check the card's parent (antd Card wraps in div) for red border
      // jsdom converts hex #E05A4B to rgb(224, 90, 75)
      const cardEl = card.closest('.ant-card') as HTMLElement | null;
      expect(cardEl).toBeTruthy();
      expect(cardEl!.style.borderColor).toBe('rgb(224, 90, 75)');
    });
  });

  it('renders KPI tiles with correct formatted values', async () => {
    setupMocks(
      makeTmLedgerData({
        revenue_paise: 5000000,
        cost_paise: 3500000,
        profit_paise: 1500000,
        margin_percent: 0.3,
      }),
    );
    renderDrawer();

    await waitFor(() => {
      const tiles = screen.getByTestId('ledger-kpi-tiles');
      expect(tiles).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Profit')).toBeInTheDocument();
      expect(screen.getByText('Margin %')).toBeInTheDocument();
      // Check formatted values (₹50,000 for 5000000 paise)
      expect(screen.getByText('₹50,000')).toBeInTheDocument();
      expect(screen.getByText('₹35,000')).toBeInTheDocument();
    });
  });
});

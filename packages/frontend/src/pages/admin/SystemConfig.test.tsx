import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import SystemConfig from './SystemConfig';

const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();

vi.mock('../../services/config.api', () => ({
  configKeys: { current: ['config'] as const },
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  updateConfig: (...args: unknown[]) => mockUpdateConfig(...args),
}));

const mockMessageSuccess = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: { success: (...args: unknown[]) => mockMessageSuccess(...args) },
  };
});

const defaultConfig = {
  data: {
    standardMonthlyHours: 160,
    healthyMarginThreshold: 0.2,
    atRiskMarginThreshold: 0.05,
  },
};

function renderSystemConfig() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SystemConfig />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SystemConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue(defaultConfig);
    mockUpdateConfig.mockResolvedValue({ success: true });
  });

  it('should render the System Configuration heading', async () => {
    renderSystemConfig();

    await waitFor(() => {
      expect(screen.getByText('System Configuration')).toBeInTheDocument();
    });
  });

  it('should load and display current config values', async () => {
    renderSystemConfig();

    await waitFor(() => {
      expect(screen.getByLabelText(/standard monthly hours/i)).toHaveValue('160');
    });

    // Formatter shows percentage: 0.2 → "20%", 0.05 → "5%"
    const healthyInput = screen.getByLabelText(/healthy margin threshold/i) as HTMLInputElement;
    expect(healthyInput.value).toBe('20%');
    const atRiskInput = screen.getByLabelText(/at-risk margin threshold/i) as HTMLInputElement;
    expect(atRiskInput.value).toBe('5%');
  });

  it('should render Save button', async () => {
    renderSystemConfig();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  it('should call updateConfig on save', async () => {
    renderSystemConfig();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByLabelText(/standard monthly hours/i)).toHaveValue('160');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });

  it('should show success message after saving', async () => {
    renderSystemConfig();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByLabelText(/standard monthly hours/i)).toHaveValue('160');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    await waitFor(() => {
      expect(mockMessageSuccess).toHaveBeenCalledWith('System configuration updated');
    });
  });

  it('should show loading spinner while fetching config', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));

    renderSystemConfig();

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});

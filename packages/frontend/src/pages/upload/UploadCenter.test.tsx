import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router';
import UploadCenter from './UploadCenter';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock EventSource for useUploadProgress
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  close = vi.fn();
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
}
vi.stubGlobal('EventSource', MockEventSource);

// Mock API functions
const mockUploadTimesheetFile = vi.fn();
const mockUploadBillingFile = vi.fn();
const mockUploadSalaryFile = vi.fn();
const mockGetUploadHistory = vi.fn();
const mockGetLatestByType = vi.fn();
const mockDownloadErrorReport = vi.fn();
const mockDownloadTemplate = vi.fn();

vi.mock('../../services/uploads.api', () => ({
  uploadKeys: {
    history: ['uploads', 'history'] as const,
    latestByType: ['uploads', 'latestByType'] as const,
    progress: (id: string) => ['uploads', 'progress', id] as const,
  },
  uploadTimesheetFile: (...args: unknown[]) => mockUploadTimesheetFile(...args),
  uploadBillingFile: (...args: unknown[]) => mockUploadBillingFile(...args),
  uploadSalaryFile: (...args: unknown[]) => mockUploadSalaryFile(...args),
  getUploadHistory: (...args: unknown[]) => mockGetUploadHistory(...args),
  getLatestByType: (...args: unknown[]) => mockGetLatestByType(...args),
  downloadErrorReport: (...args: unknown[]) => mockDownloadErrorReport(...args),
  downloadTemplate: (...args: unknown[]) => mockDownloadTemplate(...args),
}));

vi.mock('../../services/employees.api', () => ({
  employeeKeys: { all: ['employees'] as const },
}));

// Default useAuth mock — override per test with vi.mocked
const mockUseAuth = vi.fn().mockReturnValue({
  user: { id: 'u1', name: 'HR User', role: 'HR', email: 'hr@test.com' },
  isLoading: false,
  isAuthenticated: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock antd message
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: (...args: unknown[]) => mockMessageSuccess(...args),
      error: (...args: unknown[]) => mockMessageError(...args),
    },
  };
});

// Mock xlsx for UploadConfirmationCard
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

function renderUploadCenter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
        <MemoryRouter>
          <UploadCenter />
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('UploadCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'HR User', role: 'HR', email: 'hr@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    // Default query mocks — individual tests can override before calling renderUploadCenter()
    mockGetUploadHistory.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20 } });
    mockGetLatestByType.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  // AC 1: Page title renders
  it('should render the Upload Center page title', () => {
    renderUploadCenter();
    expect(screen.getByText('Upload Center')).toBeInTheDocument();
  });

  // AC 2: Zone visibility — HR sees salary only
  it('should show salary zone for HR user', () => {
    renderUploadCenter();
    expect(screen.getByTestId('upload-zone-salary')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-zone-timesheet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upload-zone-billing')).not.toBeInTheDocument();
  });

  // AC 2: Zone visibility — Finance sees timesheet + billing
  it('should show timesheet and billing zones for Finance user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', name: 'Finance User', role: 'FINANCE', email: 'fin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    renderUploadCenter();
    expect(screen.getByTestId('upload-zone-timesheet')).toBeInTheDocument();
    expect(screen.getByTestId('upload-zone-billing')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-zone-salary')).not.toBeInTheDocument();
  });

  // AC 2: Zone visibility — Admin sees all
  it('should show all three zones for Admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u3', name: 'Admin User', role: 'ADMIN', email: 'admin@test.com' },
      isLoading: false,
      isAuthenticated: true,
    });
    renderUploadCenter();
    expect(screen.getByTestId('upload-zone-timesheet')).toBeInTheDocument();
    expect(screen.getByTestId('upload-zone-billing')).toBeInTheDocument();
    expect(screen.getByTestId('upload-zone-salary')).toBeInTheDocument();
  });

  // AC 1: Dragger labels
  it('should render salary Dragger with correct label for HR', () => {
    renderUploadCenter();
    expect(screen.getByText('Upload Employee Salary Master (.xlsx)')).toBeInTheDocument();
  });

  // AC 1: Download Template link
  it('should render Download Template link', () => {
    renderUploadCenter();
    expect(screen.getByText('Download Template')).toBeInTheDocument();
  });

  it('should call downloadTemplate when link is clicked', async () => {
    renderUploadCenter();
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText('Download Template'));
    expect(mockDownloadTemplate).toHaveBeenCalled();
  });

  // Salary upload flow — file rejected if not .xlsx
  it('should reject non-xlsx file with error message', async () => {
    renderUploadCenter();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [invalidFile] } });
    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('Please upload an .xlsx file only');
    });
    expect(mockUploadSalaryFile).not.toHaveBeenCalled();
  });

  // Salary upload — success
  it('should show UploadConfirmationCard after salary upload', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        status: 'PARTIAL',
        imported: 8,
        failed: 2,
        uploadEventId: 'evt-1',
        failedRows: [
          { row: 3, employeeCode: 'EMP003', error: 'Duplicate employee code' },
          { row: 5, employeeCode: '', error: 'employee_code is required' },
        ],
      },
    });

    renderUploadCenter();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'employees.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-confirmation-card')).toBeInTheDocument();
    });
  });

  // AC 7: Download Error Report button for partial salary failures
  it('should show Download Error Report button for partial salary failures', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        status: 'PARTIAL',
        imported: 5,
        failed: 1,
        uploadEventId: 'evt-2',
        failedRows: [{ row: 2, employeeCode: 'EMP002', error: 'Invalid department' }],
      },
    });

    renderUploadCenter();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('download-error-report-btn')).toBeInTheDocument();
    });
  });

  // AC 7: Error report download trigger
  it('should call downloadErrorReport when Download Error Report is clicked', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        status: 'PARTIAL',
        imported: 5,
        failed: 1,
        uploadEventId: 'evt-3',
        failedRows: [{ row: 2, employeeCode: 'EMP002', error: 'err' }],
      },
    });

    renderUploadCenter();
    const user = userEvent.setup({ delay: null });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('download-error-report-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('download-error-report-btn'));
    expect(mockDownloadErrorReport).toHaveBeenCalledWith('evt-3');
  });

  // AC 8: Upload History section renders
  it('should render the Upload History section', async () => {
    renderUploadCenter();
    await waitFor(() => {
      expect(screen.getByText('Upload History')).toBeInTheDocument();
    });
  });

  // Salary upload error toast
  it('should show error message on salary upload failure', async () => {
    mockUploadSalaryFile.mockRejectedValue(new Error('Network error'));

    renderUploadCenter();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('Network error');
    });
  });

  // AC 9: DataPeriodIndicator renders
  it('should render DataPeriodIndicator when data is available', async () => {
    mockGetLatestByType.mockResolvedValue({
      data: [{ type: 'SALARY', periodMonth: 2, periodYear: 2026, createdAt: new Date().toISOString() }],
    });

    renderUploadCenter();
    await waitFor(() => {
      expect(screen.getByTestId('data-period-indicator')).toBeInTheDocument();
    });
    expect(screen.getByText(/Data as of.*Feb 2026/)).toBeInTheDocument();
  });
});

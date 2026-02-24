import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup, fireEvent } from '@testing-library/react';
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

// Mock API functions
const mockUploadSalaryFile = vi.fn();
const mockDownloadTemplate = vi.fn();

vi.mock('../../services/uploads.api', () => ({
  uploadKeys: { history: ['uploads', 'history'] as const },
  uploadSalaryFile: (...args: unknown[]) => mockUploadSalaryFile(...args),
  downloadTemplate: (...args: unknown[]) => mockDownloadTemplate(...args),
}));

vi.mock('../../services/employees.api', () => ({
  employeeKeys: { all: ['employees'] as const },
}));

// Mock useAuth — default to HR role
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'HR User', role: 'HR', email: 'hr@test.com' },
    isLoading: false,
    isAuthenticated: true,
  }),
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
  });

  afterEach(() => {
    cleanup();
  });

  // AC 1 / Task 6.2: Upload.Dragger renders with correct label
  it('should render Upload.Dragger with correct label', () => {
    renderUploadCenter();

    expect(screen.getByText('Upload Employee Salary Master (.xlsx)')).toBeInTheDocument();
  });

  // AC 1: Page title renders
  it('should render the Upload Center page title', () => {
    renderUploadCenter();

    expect(screen.getByText('Upload Center')).toBeInTheDocument();
  });

  // AC 1 / Task 6.8: Template download link present
  it('should render the Download Sample Template link', () => {
    renderUploadCenter();

    expect(screen.getByText('Download Sample Template')).toBeInTheDocument();
  });

  it('should call downloadTemplate when link is clicked', async () => {
    renderUploadCenter();
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByText('Download Sample Template'));

    expect(mockDownloadTemplate).toHaveBeenCalled();
  });

  // AC 7 / Task 6.3: Non-xlsx file rejected before upload
  it('should reject non-xlsx file with error message', async () => {
    renderUploadCenter();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.csv', { type: 'text/csv' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('Please upload an .xlsx file only');
    });

    // No API call should be made
    expect(mockUploadSalaryFile).not.toHaveBeenCalled();
  });

  // AC 3, 6 / Task 6.4: Loading state during upload
  it('should show loading state during upload', async () => {
    // Make the upload hang
    mockUploadSalaryFile.mockReturnValue(new Promise(() => {}));

    renderUploadCenter();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'employees.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(document.querySelector('.ant-spin-spinning')).toBeInTheDocument();
    });
  });

  // AC 3 / Task 6.5: UploadConfirmationCard shows correct counts
  it('should show UploadConfirmationCard with correct counts after upload', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        imported: 8,
        failed: 2,
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

    // Verify counts are displayed — scope to confirmation card to avoid ambiguity with history table
    const card = within(screen.getByTestId('upload-confirmation-card'));
    expect(card.getByText('employees.xlsx')).toBeInTheDocument();
    expect(card.getByText('10')).toBeInTheDocument(); // total rows
    expect(card.getByText('8')).toBeInTheDocument();  // imported
    expect(card.getByText('2')).toBeInTheDocument();  // failed
  });

  // AC 4 / Task 6.6: Download Failed Rows button visible when failures exist
  it('should show Download Failed Rows button when there are failures', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        imported: 5,
        failed: 1,
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
      expect(screen.getByRole('button', { name: /download failed rows/i })).toBeInTheDocument();
    });
  });

  // AC 9 / Task 6.7: Download Failed Rows button absent when all succeed
  it('should not show Download Failed Rows button when all rows succeed', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: {
        imported: 10,
        failed: 0,
        failedRows: [],
      },
    });

    renderUploadCenter();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-confirmation-card')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /download failed rows/i })).not.toBeInTheDocument();
  });

  // AC 8: UploadHistoryLog table renders
  it('should render the Upload History section with empty state initially', () => {
    renderUploadCenter();

    expect(screen.getByText('Upload History')).toBeInTheDocument();
    expect(screen.getByText('No upload history yet')).toBeInTheDocument();
  });

  // AC 8 / M4: UploadHistoryLog shows data after successful upload
  it('should show upload history entry after successful upload', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: { imported: 10, failed: 0, failedRows: [] },
    });

    renderUploadCenter();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      // Salary Master and HR User are unique to the history table row
      expect(screen.getByText('Salary Master')).toBeInTheDocument();
      expect(screen.getByText('HR User')).toBeInTheDocument();
    });
  });

  // AC 4 / M1: Clicking Download Failed Rows triggers XLSX generation
  it('should call XLSX functions when clicking Download Failed Rows', async () => {
    const XLSX = await import('xlsx');

    mockUploadSalaryFile.mockResolvedValue({
      data: {
        imported: 5,
        failed: 1,
        failedRows: [{ row: 2, employeeCode: 'EMP002', error: 'Invalid department' }],
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
      expect(screen.getByRole('button', { name: /download failed rows/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /download failed rows/i }));

    await waitFor(() => {
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        { row_number: 2, employee_code: 'EMP002', error: 'Invalid department' },
      ]);
      expect(XLSX.writeFile).toHaveBeenCalled();
    });
  });

  // M2: Upload error shows error toast
  it('should show error message on upload failure', async () => {
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

  // Re-upload button present in confirmation card
  it('should show Re-upload button in confirmation card', async () => {
    mockUploadSalaryFile.mockResolvedValue({
      data: { imported: 5, failed: 1, failedRows: [{ row: 2, employeeCode: 'EMP002', error: 'err' }] },
    });

    renderUploadCenter();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /re-upload corrected file/i })).toBeInTheDocument();
    });
  });
});

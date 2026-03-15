import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ProjectRoleManagement from './ProjectRoleManagement';
import { ApiError } from '../services/api';

const mockGetDesignations = vi.fn();
const mockCreateDesignation = vi.fn();
const mockUpdateDesignation = vi.fn();

vi.mock('../services/designations.api', () => ({
  designationKeys: {
    all: ['designations'] as const,
    active: ['designations', 'active'] as const,
  },
  getDesignations: (...args: unknown[]) => mockGetDesignations(...args),
  createDesignation: (...args: unknown[]) => mockCreateDesignation(...args),
  updateDesignation: (...args: unknown[]) => mockUpdateDesignation(...args),
}));

const sampleDesignations = [
  { id: '1', name: 'Developer', isActive: true, createdAt: '2026-01-01' },
  { id: '2', name: 'Designer', isActive: true, createdAt: '2026-01-02' },
  { id: '3', name: 'Support Engineer', isActive: false, createdAt: '2026-01-03' },
];

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectRoleManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectRoleManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDesignations.mockResolvedValue({
      data: sampleDesignations,
      meta: { total: 3 },
    });
    mockCreateDesignation.mockResolvedValue({
      data: { id: '4', name: 'Data Engineer', isActive: true, createdAt: '2026-03-05' },
    });
    mockUpdateDesignation.mockResolvedValue({
      data: { id: '1', name: 'Developer', isActive: false, createdAt: '2026-01-01' },
    });
  });

  it('renders designation list with correct count', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Support Engineer')).toBeInTheDocument();

    const activeTags = screen.getAllByText('Active');
    const inactiveTags = screen.getAllByText('Inactive');
    expect(activeTags).toHaveLength(2);
    expect(inactiveTags).toHaveLength(1);
  });

  it('adds a new designation successfully', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter designation name');
    await act(async () => {
      await user.type(input, 'Data Engineer');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add designation/i }));
    });

    await waitFor(() => {
      expect(mockCreateDesignation).toHaveBeenCalled();
    });
    expect(mockCreateDesignation.mock.calls[0][0]).toEqual({ name: 'Data Engineer' });
  });

  it('shows duplicate error message on 409 response', async () => {
    mockCreateDesignation.mockRejectedValue(
      new ApiError(409, { code: 'CONFLICT', message: 'A designation with this name already exists' }),
    );

    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter designation name');
    await act(async () => {
      await user.type(input, 'Developer');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add designation/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('A designation with this name already exists')).toBeInTheDocument();
    });
  });

  it('shows validation error when input is empty after typing', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter designation name');

    // Type something then clear it
    await act(async () => {
      await user.type(input, 'x');
    });
    await act(async () => {
      await user.clear(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Designation name is required')).toBeInTheDocument();
    });

    // Add Designation button should be disabled
    expect(screen.getByRole('button', { name: /add designation/i })).toBeDisabled();
  });

  it('disables Add Designation button when input is empty', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add designation/i })).toBeDisabled();
  });

  it('toggles designation to inactive', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    // Find the switches — active designations have checked switches
    const switches = screen.getAllByRole('switch');
    // First switch corresponds to Developer (active), click to deactivate
    await act(async () => {
      await user.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockUpdateDesignation).toHaveBeenCalled();
    });

    // Verify it was called with the right arguments
    const call = mockUpdateDesignation.mock.calls[0];
    expect(call[0]).toBe('1'); // Developer's id
    expect(call[1]).toEqual({ isActive: false });
  });

  it('toggles designation to active (reactivation)', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Support Engineer')).toBeInTheDocument();
    });

    const switches = screen.getAllByRole('switch');
    // Third switch corresponds to Support Engineer (inactive), click to activate
    await act(async () => {
      await user.click(switches[2]);
    });

    await waitFor(() => {
      expect(mockUpdateDesignation).toHaveBeenCalled();
    });

    const call = mockUpdateDesignation.mock.calls[0];
    expect(call[0]).toBe('3'); // Support Engineer's id
    expect(call[1]).toEqual({ isActive: true });
  });
});

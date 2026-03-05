import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ProjectRoleManagement from './ProjectRoleManagement';
import { ApiError } from '../services/api';

const mockGetProjectRoles = vi.fn();
const mockCreateProjectRole = vi.fn();
const mockUpdateProjectRole = vi.fn();

vi.mock('../services/project-roles.api', () => ({
  projectRoleKeys: {
    all: ['project-roles'] as const,
    active: ['project-roles', 'active'] as const,
  },
  getProjectRoles: (...args: unknown[]) => mockGetProjectRoles(...args),
  createProjectRole: (...args: unknown[]) => mockCreateProjectRole(...args),
  updateProjectRole: (...args: unknown[]) => mockUpdateProjectRole(...args),
}));

const sampleRoles = [
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
    mockGetProjectRoles.mockResolvedValue({
      data: sampleRoles,
      meta: { total: 3 },
    });
    mockCreateProjectRole.mockResolvedValue({
      data: { id: '4', name: 'Data Engineer', isActive: true, createdAt: '2026-03-05' },
    });
    mockUpdateProjectRole.mockResolvedValue({
      data: { id: '1', name: 'Developer', isActive: false, createdAt: '2026-01-01' },
    });
  });

  it('renders role list with correct count', async () => {
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

  it('adds a new role successfully', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter role name');
    await act(async () => {
      await user.type(input, 'Data Engineer');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add role/i }));
    });

    await waitFor(() => {
      expect(mockCreateProjectRole).toHaveBeenCalled();
    });
    expect(mockCreateProjectRole.mock.calls[0][0]).toEqual({ name: 'Data Engineer' });
  });

  it('shows duplicate error message on 409 response', async () => {
    mockCreateProjectRole.mockRejectedValue(
      new ApiError(409, { code: 'CONFLICT', message: 'A project role with this name already exists' }),
    );

    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter role name');
    await act(async () => {
      await user.type(input, 'Developer');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add role/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('A role with this name already exists')).toBeInTheDocument();
    });
  });

  it('shows validation error when input is empty after typing', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter role name');

    // Type something then clear it
    await act(async () => {
      await user.type(input, 'x');
    });
    await act(async () => {
      await user.clear(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Role name is required')).toBeInTheDocument();
    });

    // Add Role button should be disabled
    expect(screen.getByRole('button', { name: /add role/i })).toBeDisabled();
  });

  it('disables Add Role button when input is empty', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add role/i })).toBeDisabled();
  });

  it('toggles role to inactive', async () => {
    renderComponent();
    const user = userEvent.setup({ delay: null });

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    // Find the switches — active roles have checked switches
    const switches = screen.getAllByRole('switch');
    // First switch corresponds to Developer (active), click to deactivate
    await act(async () => {
      await user.click(switches[0]);
    });

    await waitFor(() => {
      expect(mockUpdateProjectRole).toHaveBeenCalled();
    });

    // Verify it was called with the right arguments
    const call = mockUpdateProjectRole.mock.calls[0];
    expect(call[0]).toBe('1'); // Developer's id
    expect(call[1]).toEqual({ isActive: false });
  });

  it('toggles role to active (reactivation)', async () => {
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
      expect(mockUpdateProjectRole).toHaveBeenCalled();
    });

    const call = mockUpdateProjectRole.mock.calls[0];
    expect(call[0]).toBe('3'); // Support Engineer's id
    expect(call[1]).toEqual({ isActive: true });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import CreateEditProject from './CreateEditProject';

// antd v6 Select uses ResizeObserver — mock for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mocks ────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockParams: { id?: string } = {};

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockResubmitProject = vi.fn();
const mockGetProject = vi.fn();

vi.mock('../../services/projects.api', () => ({
  projectKeys: {
    all: ['projects'],
    detail: (id: string) => ['projects', id],
  },
  getProject: (...args: unknown[]) => mockGetProject(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  resubmitProject: (...args: unknown[]) => mockResubmitProject(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────

function renderComponent(initialEntry = '/projects/new') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CreateEditProject />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectEngagementModel(optionTitle: string) {
  // antd v6 Select: open dropdown via combobox, then click option by title
  const comboboxes = screen.getAllByRole('combobox');
  // The engagement model select is the first combobox in the form
  const engagementSelect = comboboxes[0];
  fireEvent.mouseDown(engagementSelect);

  await waitFor(() => {
    const option = document.querySelector(`.ant-select-item[title="${optionTitle}"]`);
    expect(option).toBeInTheDocument();
  });

  const option = document.querySelector(`.ant-select-item[title="${optionTitle}"]`)!;
  fireEvent.click(option);
}

// ── Tests ────────────────────────────────────────────────────────

describe('CreateEditProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.id = undefined;
  });

  describe('Engagement model conditional rendering (AC: 1, 2, 3, 4, 5)', () => {
    it('renders common fields and engagement model select', () => {
      renderComponent();

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vertical/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      // Engagement model select exists as a combobox
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    });

    it('shows T&M team member section by default', () => {
      renderComponent();

      // Default engagement model is TIME_AND_MATERIALS
      expect(screen.getByTestId('tm-section')).toBeInTheDocument();
      expect(screen.getByText(/add team member/i)).toBeInTheDocument();
    });

    it('shows Fixed Cost section when Fixed Cost model selected', async () => {
      renderComponent();

      await selectEngagementModel('Fixed Cost');

      await waitFor(() => {
        expect(screen.getByTestId('fixed-cost-section')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('tm-section')).not.toBeInTheDocument();
    });

    it('shows AMC section when AMC model selected', async () => {
      renderComponent();

      await selectEngagementModel('AMC');

      await waitFor(() => {
        expect(screen.getByTestId('amc-section')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('tm-section')).not.toBeInTheDocument();
    });

    it('shows Infrastructure section when Infrastructure model selected', async () => {
      renderComponent();

      await selectEngagementModel('Infrastructure');

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-section')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('tm-section')).not.toBeInTheDocument();
    });

    it('switches sections when changing engagement model (AC: 1)', async () => {
      renderComponent();

      // Start with T&M (default)
      expect(screen.getByTestId('tm-section')).toBeInTheDocument();

      // Switch to Fixed Cost
      await selectEngagementModel('Fixed Cost');

      await waitFor(() => {
        expect(screen.getByTestId('fixed-cost-section')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('tm-section')).not.toBeInTheDocument();
    });
  });

  describe('Submit button loading state (AC: 7)', () => {
    it('shows Create Project button that is not disabled initially', () => {
      renderComponent();

      const submitBtn = screen.getByRole('button', { name: /create project/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Form validation', () => {
    it('shows validation errors when submitting empty form', async () => {
      renderComponent();
      const user = userEvent.setup({ delay: null });

      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument();
      });
    });
  });

  describe('Edit mode (AC: 9)', () => {
    it('shows Edit & Resubmit title in edit mode', async () => {
      mockParams.id = 'test-id-123';
      mockGetProject.mockResolvedValue({
        data: {
          id: 'test-id-123',
          name: 'Test Project',
          client: 'Test Client',
          vertical: 'IT',
          engagementModel: 'FIXED_COST',
          status: 'REJECTED',
          contractValuePaise: 10000000,
          rejectionComment: 'Needs revision',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
          deliveryManagerId: 'dm-1',
          completionPercent: null,
          createdAt: '2026-02-01',
          updatedAt: '2026-02-10',
        },
      });

      renderComponent('/projects/test-id-123/edit');

      // Wait for project data to load
      await waitFor(() => {
        expect(screen.getByText(/edit & resubmit project/i)).toBeInTheDocument();
      });
    });

    it('shows rejection reason alert for rejected project', async () => {
      mockParams.id = 'test-id-456';
      mockGetProject.mockResolvedValue({
        data: {
          id: 'test-id-456',
          name: 'Rejected Project',
          client: 'Client',
          vertical: 'IT',
          engagementModel: 'TIME_AND_MATERIALS',
          status: 'REJECTED',
          contractValuePaise: null,
          rejectionComment: 'Budget too high',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
          deliveryManagerId: 'dm-1',
          completionPercent: null,
          createdAt: '2026-02-01',
          updatedAt: '2026-02-10',
        },
      });

      renderComponent('/projects/test-id-456/edit');

      await waitFor(() => {
        expect(screen.getByText(/budget too high/i)).toBeInTheDocument();
      });
    });
  });
});

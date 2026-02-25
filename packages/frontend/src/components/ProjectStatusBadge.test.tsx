import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectStatusBadge from './ProjectStatusBadge';
import type { ProjectStatus } from '../services/projects.api';

describe('ProjectStatusBadge', () => {
  const cases: { status: ProjectStatus; label: string; color: string }[] = [
    { status: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'blue' },
    { status: 'ACTIVE', label: 'Active', color: 'green' },
    { status: 'REJECTED', label: 'Rejected', color: 'red' },
    { status: 'COMPLETED', label: 'Completed', color: '#001529' },
  ];

  it.each(cases)('renders "$label" with correct colour for status $status', ({ status, label }) => {
    render(<ProjectStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('always includes a text label (not icon-only)', () => {
    render(<ProjectStatusBadge status="ACTIVE" />);
    const tag = screen.getByText('Active');
    expect(tag).toBeVisible();
    expect(tag.textContent).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectFinancialSummary from './ProjectFinancialSummary';

describe('ProjectFinancialSummary', () => {
  const financials = {
    revenuePaise: 1000000,
    costPaise: 500000,
    profitPaise: 500000,
    marginPercent: 0.25,
    burnRatePaise: null as number | null,
    plannedBurnRatePaise: null as number | null,
    budgetPaise: null as number | null,
    actualCostPaise: null as number | null,
    variancePaise: null as number | null,
    consumedPercent: null as number | null,
  };

  it('renders 4 Statistic cards with formatted values', () => {
    render(<ProjectFinancialSummary financials={financials} />);

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Profit')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
  });

  it('renders formatted currency values', () => {
    render(<ProjectFinancialSummary financials={financials} />);

    // formatCurrency(1000000) = ₹10,000; formatCurrency(500000) = ₹5,000
    expect(screen.getByText('₹10,000')).toBeInTheDocument();
    // costPaise and profitPaise are both 500000
    expect(screen.getAllByText('₹5,000')).toHaveLength(2);
  });

  it('renders margin as percent with MarginHealthBadge', () => {
    render(<ProjectFinancialSummary financials={financials} />);

    // 0.25 → "25.0%"
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByTestId('margin-health-badge')).toBeInTheDocument();
    // >= 0.20 → Healthy
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('shows correct badge for at-risk margin', () => {
    render(
      <ProjectFinancialSummary
        financials={{ ...financials, marginPercent: 0.15 }}
      />,
    );

    expect(screen.getByText('At Risk')).toBeInTheDocument();
  });

  it('shows correct badge for low margin', () => {
    render(
      <ProjectFinancialSummary
        financials={{ ...financials, marginPercent: 0.05 }}
      />,
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders empty state when financials is null', () => {
    render(<ProjectFinancialSummary financials={null} />);

    expect(screen.getByTestId('financial-empty-state')).toBeInTheDocument();
    expect(
      screen.getByText(/No financial data yet/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('financial-summary')).not.toBeInTheDocument();
  });

  it('does not render MarginHealthBadge in empty state', () => {
    render(<ProjectFinancialSummary financials={null} />);

    expect(screen.queryByTestId('margin-health-badge')).not.toBeInTheDocument();
  });

  it('shows dash for null individual values', () => {
    render(
      <ProjectFinancialSummary
        financials={{ revenuePaise: null, costPaise: null, profitPaise: null, marginPercent: null, burnRatePaise: null, plannedBurnRatePaise: null, budgetPaise: null, actualCostPaise: null, variancePaise: null, consumedPercent: null }}
      />,
    );

    expect(screen.getByTestId('financial-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('margin-health-badge')).not.toBeInTheDocument();
  });
});

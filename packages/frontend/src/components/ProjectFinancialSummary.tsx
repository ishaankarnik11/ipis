import { Row, Col, Card, Statistic, Alert, Tag, Progress } from 'antd';
import { formatCurrency, formatPercent } from '@ipis/shared';
import type { ProjectFinancials } from '../services/projects.api';
import MarginHealthBadge from './MarginHealthBadge';

interface Props {
  financials: ProjectFinancials | null;
}

function BurnRateIndicator({ actual, planned }: { actual: number; planned: number }) {
  if (planned <= 0) return null;
  const ratio = actual / planned;
  if (ratio <= 0.8) return <Tag color="green">On Track</Tag>;
  if (ratio <= 1.0) return <Tag color="orange">Near Limit</Tag>;
  return <Tag color="red">Over Budget</Tag>;
}

export default function ProjectFinancialSummary({ financials }: Props) {
  if (!financials) {
    return (
      <Alert
        type="info"
        message="No financial data yet — upload timesheet and billing data to generate profitability calculations."
        data-testid="financial-empty-state"
        showIcon
        style={{ marginBottom: 24 }}
      />
    );
  }

  const showPlannedBurn = financials.plannedBurnRatePaise != null && financials.plannedBurnRatePaise > 0;

  return (
    <div data-testid="financial-summary" style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={financials.revenuePaise != null ? formatCurrency(financials.revenuePaise) : '—'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cost"
              value={financials.costPaise != null ? formatCurrency(financials.costPaise) : '—'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Profit"
              value={financials.profitPaise != null ? formatCurrency(financials.profitPaise) : '—'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Margin"
              value={financials.marginPercent != null ? formatPercent(financials.marginPercent) : '—'}
              suffix={financials.marginPercent != null ? <MarginHealthBadge marginPercent={financials.marginPercent} /> : undefined}
            />
          </Card>
        </Col>
      </Row>
      {financials.burnRatePaise != null && financials.burnRatePaise > 0 && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Burn Rate"
                value={`${formatCurrency(financials.burnRatePaise)}/mo`}
                data-testid="burn-rate-actual"
              />
            </Card>
          </Col>
          {showPlannedBurn && (
            <>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Planned Burn Rate"
                    value={`${formatCurrency(financials.plannedBurnRatePaise!)}/mo`}
                    data-testid="burn-rate-planned"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Burn Status"
                    value=" "
                    suffix={
                      <BurnRateIndicator
                        actual={financials.burnRatePaise}
                        planned={financials.plannedBurnRatePaise!}
                      />
                    }
                    data-testid="burn-rate-status"
                  />
                </Card>
              </Col>
            </>
          )}
        </Row>
      )}
      {financials.budgetPaise != null && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Budget"
                value={formatCurrency(financials.budgetPaise)}
                data-testid="budget-value"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Actual Cost (Total)"
                value={formatCurrency(financials.actualCostPaise ?? 0)}
                data-testid="actual-cost-value"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Variance"
                value={financials.variancePaise != null
                  ? `${financials.variancePaise < 0 ? '-' : ''}${formatCurrency(Math.abs(financials.variancePaise))}`
                  : '—'}
                valueStyle={{ color: financials.variancePaise != null && financials.variancePaise < 0 ? '#f5222d' : '#52c41a' }}
                data-testid="variance-value"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card data-testid="consumed-percent-card">
              <Statistic
                title="% Consumed"
                value={financials.consumedPercent != null ? `${financials.consumedPercent.toFixed(1)}%` : '—'}
                valueStyle={{
                  color: financials.consumedPercent != null
                    ? financials.consumedPercent > 100 ? '#f5222d' : financials.consumedPercent >= 80 ? '#fa8c16' : '#52c41a'
                    : undefined,
                }}
              />
              {financials.consumedPercent != null && (
                <Progress
                  percent={Math.min(financials.consumedPercent, 100)}
                  strokeColor={financials.consumedPercent > 100 ? '#f5222d' : financials.consumedPercent >= 80 ? '#fa8c16' : '#52c41a'}
                  showInfo={false}
                  size="small"
                  data-testid="budget-progress-bar"
                />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

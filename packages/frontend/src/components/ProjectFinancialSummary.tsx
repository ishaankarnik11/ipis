import { Row, Col, Card, Statistic, Alert } from 'antd';
import { formatCurrency, formatPercent } from '@ipis/shared';
import type { ProjectFinancials } from '../services/projects.api';
import MarginHealthBadge from './MarginHealthBadge';

interface Props {
  financials: ProjectFinancials | null;
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
    </div>
  );
}

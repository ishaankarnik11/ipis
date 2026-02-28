import { Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { formatCurrency } from '@ipis/shared';

interface AtRiskKPITileProps {
  deficitPaise: number;
}

export default function AtRiskKPITile({ deficitPaise }: AtRiskKPITileProps) {
  return (
    <Tag color="red" data-testid="at-risk-kpi-tile">
      <WarningOutlined /> Deficit: {formatCurrency(Math.abs(deficitPaise))}
    </Tag>
  );
}

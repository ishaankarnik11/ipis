import { Tag } from 'antd';

type MarginHealth = 'healthy' | 'at-risk' | 'low';

const healthConfig: Record<MarginHealth, { color: string; label: string }> = {
  healthy: { color: 'green', label: 'Healthy' },
  'at-risk': { color: 'orange', label: 'At Risk' },
  low: { color: 'red', label: 'Low' },
};

function getHealth(marginPercent: number): MarginHealth {
  if (marginPercent >= 0.20) return 'healthy';
  if (marginPercent >= 0.10) return 'at-risk';
  return 'low';
}

interface MarginHealthBadgeProps {
  marginPercent: number;
}

export default function MarginHealthBadge({ marginPercent }: MarginHealthBadgeProps) {
  const health = getHealth(marginPercent);
  const config = healthConfig[health];
  return (
    <Tag color={config.color} data-testid="margin-health-badge">
      {config.label}
    </Tag>
  );
}

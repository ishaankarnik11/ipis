import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { uploadKeys, getLatestByType } from '../services/uploads.api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function DataPeriodIndicator() {
  const { data } = useQuery({
    queryKey: [...uploadKeys.latestByType],
    queryFn: getLatestByType,
    staleTime: 60_000,
  });

  if (!data?.data?.length) return null;

  const latest = data.data.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
  );

  const monthName = MONTH_NAMES[latest.periodMonth - 1];
  const updatedAt = new Date(latest.createdAt);

  return (
    <Typography.Text type="secondary" data-testid="data-period-indicator">
      Data as of: {monthName} {latest.periodYear} &middot; Updated {formatRelativeTime(updatedAt)}
    </Typography.Text>
  );
}

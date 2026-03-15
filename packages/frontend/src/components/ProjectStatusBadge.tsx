import { Tag } from 'antd';
import type { ProjectStatus } from '../services/projects.api';

const statusConfig: Record<ProjectStatus, { color: string; label: string }> = {
  PENDING_APPROVAL: { color: 'blue', label: 'Pending Approval' },
  ACTIVE: { color: 'green', label: 'Active' },
  ON_HOLD: { color: 'orange', label: 'On Hold' },
  REJECTED: { color: 'red', label: 'Rejected' },
  COMPLETED: { color: '#001529', label: 'Completed' },
  CANCELLED: { color: 'default', label: 'Cancelled' },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export default function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}

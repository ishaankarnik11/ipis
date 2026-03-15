import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Table, Empty, Button, Space, Tooltip, Typography, Alert, Segmented } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { projectKeys, getProjects, engagementModelLabels } from '../../services/projects.api';
import type { Project } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import { useAuth } from '../../hooks/useAuth';

export default function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDM = user?.role === 'DELIVERY_MANAGER';

  const [scope, setScope] = useState<string>(isDM ? 'mine' : 'all');

  const { data, isLoading, error } = useQuery({
    queryKey: projectKeys.list(scope),
    queryFn: () => getProjects(scope === 'all' ? 'all' : undefined),
  });

  const projects = data?.data ?? [];
  const showDMColumn = user?.role === 'ADMIN' || user?.role === 'FINANCE' || user?.role === 'DEPT_HEAD' || (isDM && scope === 'all');

  const columns: ColumnsType<Project> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    {
      title: 'Engagement Model',
      dataIndex: 'engagementModel',
      key: 'engagementModel',
      render: (model: string) => engagementModelLabels[model] ?? model,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Project['status'], record: Project) => (
        <Space direction="vertical" size={0}>
          <ProjectStatusBadge status={status} />
          {status === 'REJECTED' && record.rejectionComment && (
            <Tooltip title={record.rejectionComment}>
              <Typography.Link style={{ fontSize: 12 }}>View Rejection Reason</Typography.Link>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Revenue',
      key: 'revenue',
      align: 'right',
      render: (_: unknown, record: Project) =>
        record.financials?.revenuePaise != null ? formatCurrency(record.financials.revenuePaise) : '—',
    },
    {
      title: 'Cost',
      key: 'cost',
      align: 'right',
      render: (_: unknown, record: Project) =>
        record.financials?.costPaise != null ? formatCurrency(record.financials.costPaise) : '—',
    },
    {
      title: 'Profit',
      key: 'profit',
      align: 'right',
      render: (_: unknown, record: Project) =>
        record.financials?.profitPaise != null ? formatCurrency(record.financials.profitPaise) : '—',
    },
    {
      title: 'Margin',
      key: 'margin',
      align: 'right',
      render: (_: unknown, record: Project) =>
        record.financials?.marginPercent != null ? (
          <Space size={4}>
            {formatPercent(record.financials.marginPercent)}
            <MarginHealthBadge marginPercent={record.financials.marginPercent} />
          </Space>
        ) : (
          '—'
        ),
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (d: string) => d?.slice(0, 10) },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (d: string) => d?.slice(0, 10) },
  ];

  if (showDMColumn) {
    columns.splice(3, 0, {
      title: 'Delivery Manager',
      dataIndex: 'deliveryManagerName',
      key: 'deliveryManager',
    });
  }

  if (error) {
    return <Alert type="error" title="Failed to load projects" showIcon />;
  }

  const emptyDescription = isDM && scope === 'mine'
    ? 'No projects assigned to you'
    : user?.role === 'DEPT_HEAD'
      ? 'No projects found for your department'
      : 'No projects found';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>Projects</h2>
          {isDM && (
            <Segmented
              data-testid="scope-toggle"
              value={scope}
              options={[
                { label: 'My Projects', value: 'mine' },
                { label: 'All Projects', value: 'all' },
              ]}
              onChange={(val) => setScope(val as string)}
            />
          )}
        </Space>
        {isDM && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
            Create Project
          </Button>
        )}
      </div>

      <Table<Project>
        size="small"
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description={emptyDescription} /> }}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/projects/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}

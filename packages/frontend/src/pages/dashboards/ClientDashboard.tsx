import { Typography, Table, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getClientDashboard,
  getClientProjects,
  type ClientDashboardItem,
  type ClientProjectItem,
} from '../../services/dashboards.api';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import { engagementModelLabels } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import type { ProjectStatus } from '../../services/projects.api';

const { Title } = Typography;

const columns: ColumnsType<ClientDashboardItem> = [
  {
    title: 'Client',
    dataIndex: 'clientName',
    key: 'clientName',
    sorter: (a, b) => a.clientName.localeCompare(b.clientName),
  },
  {
    title: 'Revenue',
    dataIndex: 'totalRevenuePaise',
    key: 'totalRevenuePaise',
    align: 'right',
    sorter: (a, b) => a.totalRevenuePaise - b.totalRevenuePaise,
    render: (val: number) => formatCurrency(val),
  },
  {
    title: 'Cost',
    dataIndex: 'totalCostPaise',
    key: 'totalCostPaise',
    align: 'right',
    sorter: (a, b) => a.totalCostPaise - b.totalCostPaise,
    render: (val: number) => formatCurrency(val),
  },
  {
    title: 'Profit',
    dataIndex: 'profitPaise',
    key: 'profitPaise',
    align: 'right',
    sorter: (a, b) => a.profitPaise - b.profitPaise,
    render: (val: number) => formatCurrency(val),
  },
  {
    title: 'Margin %',
    dataIndex: 'marginPercent',
    key: 'marginPercent',
    align: 'right',
    defaultSortOrder: 'descend',
    sorter: (a, b) => (a.marginPercent ?? -Infinity) - (b.marginPercent ?? -Infinity),
    render: (val: number | null) => val === null ? (
      <span style={{ color: '#999' }}>N/A</span>
    ) : (
      <Space>
        <span>{formatPercent(val)}</span>
        <MarginHealthBadge marginPercent={val} />
      </Space>
    ),
  },
  {
    title: 'Active Projects',
    dataIndex: 'activeProjectCount',
    key: 'activeProjectCount',
    align: 'center',
    sorter: (a, b) => a.activeProjectCount - b.activeProjectCount,
  },
];

const projectColumns: ColumnsType<ClientProjectItem> = [
  {
    title: 'Project',
    dataIndex: 'projectName',
    key: 'projectName',
    render: (name: string, record) => (
      <Link to={`/projects/${record.projectId}`}>{name}</Link>
    ),
  },
  {
    title: 'Model',
    dataIndex: 'engagementModel',
    key: 'engagementModel',
    render: (model: string) => engagementModelLabels[model] ?? model,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: ProjectStatus) => <ProjectStatusBadge status={status} />,
  },
  {
    title: 'Revenue',
    dataIndex: 'revenuePaise',
    key: 'revenuePaise',
    align: 'right',
    render: (val: number) => formatCurrency(val),
  },
  {
    title: 'Cost',
    dataIndex: 'costPaise',
    key: 'costPaise',
    align: 'right',
    render: (val: number) => formatCurrency(val),
  },
  {
    title: 'Margin %',
    dataIndex: 'marginPercent',
    key: 'marginPercent',
    align: 'right',
    render: (val: number) => (
      <Space>
        <span>{formatPercent(val)}</span>
        <MarginHealthBadge marginPercent={val} />
      </Space>
    ),
  },
];

function ClientProjectsExpand({ clientName }: { clientName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: reportKeys.clientProjects(clientName),
    queryFn: () => getClientProjects(clientName),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <Table<ClientProjectItem>
      size="small"
      columns={projectColumns}
      dataSource={data?.data ?? []}
      rowKey="projectId"
      loading={isLoading}
      pagination={false}
      locale={{ emptyText: <Empty description="No projects for this client" /> }}
    />
  );
}

export default function ClientDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: reportKeys.clients,
    queryFn: getClientDashboard,
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];

  return (
    <div data-testid="client-dashboard">
      <Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>Client Dashboard</Title>

      <Table<ClientDashboardItem>
        data-testid="client-table"
        rowKey="clientName"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        pagination={false}
        expandable={{
          expandedRowRender: (record) => (
            <ClientProjectsExpand clientName={record.clientName} />
          ),
        }}
        locale={{ emptyText: <Empty description="No client data available" /> }}
      />
    </div>
  );
}

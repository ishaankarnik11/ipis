import { useNavigate } from 'react-router';
import { Typography, Table, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getDepartmentDashboard,
  type DepartmentDashboardItem,
} from '../../services/dashboards.api';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import DataPeriodIndicator from '../../components/DataPeriodIndicator';

const { Title } = Typography;

export default function DepartmentDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.department,
    queryFn: getDepartmentDashboard,
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];

  const columns: ColumnsType<DepartmentDashboardItem> = [
    {
      title: 'Department',
      dataIndex: 'departmentName',
      key: 'departmentName',
      sorter: (a, b) => a.departmentName.localeCompare(b.departmentName),
    },
    {
      title: 'Revenue',
      dataIndex: 'revenuePaise',
      key: 'revenuePaise',
      align: 'right',
      sorter: (a, b) => a.revenuePaise - b.revenuePaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Cost',
      dataIndex: 'costPaise',
      key: 'costPaise',
      align: 'right',
      sorter: (a, b) => a.costPaise - b.costPaise,
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
      sorter: (a, b) => a.marginPercent - b.marginPercent,
      render: (val: number) => (
        <Space>
          <span>{formatPercent(val)}</span>
          <MarginHealthBadge marginPercent={val} />
        </Space>
      ),
    },
  ];

  return (
    <div data-testid="department-dashboard">
      <Space style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Department Dashboard</Title>
        <DataPeriodIndicator />
      </Space>

      <Table<DepartmentDashboardItem>
        data-testid="department-table"
        rowKey="departmentId"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/dashboards/projects?department=${record.departmentName}`),
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No department data available" /> }}
      />
    </div>
  );
}

import { useParams, useNavigate } from 'react-router';
import { Typography, Table, Button, Empty, Spin, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getEmployeeDetail,
  type EmployeeMonthlyHistory,
  type EmployeeProjectAssignment,
} from '../../services/dashboards.api';

const { Title, Text } = Typography;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.employeeDetail(id!),
    queryFn: () => getEmployeeDetail(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const detail = data?.data ?? null;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div data-testid="employee-detail-empty">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboards/employees')} style={{ marginBottom: 16 }}>
          Back to Employee Dashboard
        </Button>
        <Empty description="Employee not found or access denied" />
      </div>
    );
  }

  const historyColumns: ColumnsType<EmployeeMonthlyHistory> = [
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => `${MONTH_NAMES[record.periodMonth - 1]} ${record.periodYear}`,
    },
    {
      title: 'Billable Hours',
      dataIndex: 'billableHours',
      key: 'billableHours',
      align: 'right',
      className: 'tabular-nums',
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'right',
      className: 'tabular-nums',
    },
    {
      title: 'Utilisation %',
      dataIndex: 'billableUtilisationPercent',
      key: 'billableUtilisationPercent',
      align: 'right',
      className: 'tabular-nums',
      render: (val: number) => formatPercent(val),
    },
    {
      title: 'Revenue',
      dataIndex: 'revenueContributionPaise',
      key: 'revenueContributionPaise',
      align: 'right',
      className: 'tabular-nums',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Cost',
      dataIndex: 'totalCostPaise',
      key: 'totalCostPaise',
      align: 'right',
      className: 'tabular-nums',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Profit',
      key: 'profit',
      align: 'right',
      className: 'tabular-nums',
      // Derived client-side: revenue - cost. Matches server-side profitContributionPaise computation.
      render: (_, record) => formatCurrency(record.revenueContributionPaise - record.totalCostPaise),
    },
  ];

  const assignmentColumns: ColumnsType<EmployeeProjectAssignment> = [
    {
      title: 'Project Name',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
  ];

  return (
    <div data-testid="employee-detail">
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboards/employees')} style={{ marginBottom: 16 }}>
        Back to Employee Dashboard
      </Button>

      <Title level={3}>{detail.name}</Title>
      <Space style={{ marginBottom: 24 }}>
        <Text type="secondary">{detail.designation}</Text>
        <Text type="secondary">|</Text>
        <Text type="secondary">{detail.department}</Text>
      </Space>

      <style>{`.tabular-nums { font-feature-settings: 'tnum'; }`}</style>

      <Title level={4} style={{ marginTop: 24 }}>Month-by-Month History</Title>
      <Table<EmployeeMonthlyHistory>
        data-testid="monthly-history-table"
        rowKey={(record) => `${record.periodYear}-${record.periodMonth}`}
        columns={historyColumns}
        dataSource={detail.monthlyHistory}
        size="small"
        pagination={false}
        locale={{ emptyText: <Empty description="No monthly history available" /> }}
      />

      <Title level={4} style={{ marginTop: 24 }}>Project Assignments</Title>
      <Table<EmployeeProjectAssignment>
        data-testid="project-assignments-table"
        rowKey="projectId"
        columns={assignmentColumns}
        dataSource={detail.projectAssignments}
        size="small"
        pagination={false}
        locale={{ emptyText: <Empty description="No project assignments" /> }}
      />
    </div>
  );
}

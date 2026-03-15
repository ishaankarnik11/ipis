import { useParams, useNavigate, Link } from 'react-router';
import { Typography, Table, Button, Empty, Spin, Card, Descriptions, Tag, Statistic, Row, Col } from 'antd';
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
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isHR = role === 'HR';
  const showFinancials = !isHR;

  const { data, isLoading, isError } = useQuery({
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

  if (!detail || isError) {
    return (
      <div data-testid="employee-detail-empty">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboards/employees')} style={{ marginBottom: 16 }}>
          Back to Employees
        </Button>
        <Empty description="Employee not found or access denied" />
      </div>
    );
  }

  // ── Profile Card ──
  const profileItems = [
    { key: 'code', label: 'Employee Code', children: detail.employeeCode },
    { key: 'department', label: 'Department', children: detail.department },
    { key: 'designation', label: 'Designation', children: detail.designation },
    ...((showFinancials || isHR) && detail.annualCtcPaise
      ? [{ key: 'ctc', label: 'Annual CTC', children: formatCurrency(detail.annualCtcPaise) }]
      : []),
    {
      key: 'billable',
      label: 'Billable',
      children: detail.isBillable
        ? <Tag color="green">Yes</Tag>
        : <Tag color="default">No</Tag>,
    },
    {
      key: 'status',
      label: 'Status',
      children: detail.isResigned
        ? <Tag color="red">Resigned</Tag>
        : <Tag color="blue">Active</Tag>,
    },
  ];

  // ── Project Allocations columns ──
  const financialAllocationKeys = new Set(['sellingRatePaise']);

  const allAllocationColumns: ColumnsType<EmployeeProjectAssignment> = [
    {
      title: 'Project Name',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (name: string, record) => (
        <Link to={`/projects/${record.projectId}`}>{name}</Link>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designationName',
      key: 'designationName',
    },
    {
      title: 'Selling Rate',
      dataIndex: 'sellingRatePaise',
      key: 'sellingRatePaise',
      align: 'right',
      className: 'tabular-nums',
      render: (val: number | null) => val != null ? formatCurrency(val) : '—',
    },
    {
      title: 'Joined Date',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (val: string) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
  ];

  const allocationColumns = isHR
    ? allAllocationColumns.filter((col) => !financialAllocationKeys.has(col.key as string))
    : allAllocationColumns;

  // ── Monthly History columns ──
  const financialHistoryKeys = new Set(['revenueContributionPaise', 'totalCostPaise', 'profit']);

  const allHistoryColumns: ColumnsType<EmployeeMonthlyHistory> = [
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
      render: (_, record) => formatCurrency(record.revenueContributionPaise - record.totalCostPaise),
    },
  ];

  const historyColumns = isHR
    ? allHistoryColumns.filter((col) => !financialHistoryKeys.has(col.key as string))
    : allHistoryColumns;

  return (
    <div data-testid="employee-detail">
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboards/employees')} style={{ marginBottom: 16 }}>
        Back to Employees
      </Button>

      <style>{`.tabular-nums { font-feature-settings: 'tnum'; }`}</style>

      {/* Profile Card (AC: 2) */}
      <Card title={detail.name} data-testid="profile-card" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          {profileItems.map((item) => (
            <Descriptions.Item key={item.key} label={item.label}>
              {item.children}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>

      {/* Utilization Summary (AC: 4) */}
      {detail.utilisationSummary && (
        <>
          <Title level={4}>Utilization Summary</Title>
          <Card data-testid="utilisation-summary" style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="Billable Hours" value={detail.utilisationSummary.billableHours} precision={1} />
              </Col>
              <Col span={8}>
                <Statistic title="Total Hours" value={detail.utilisationSummary.totalHours} precision={1} />
              </Col>
              <Col span={8}>
                <Statistic title="Utilization %" value={detail.utilisationSummary.utilisationPercent * 100} precision={1} suffix="%" />
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Project Allocations (AC: 3) */}
      <Title level={4}>Project Allocations</Title>
      <Table<EmployeeProjectAssignment>
        data-testid="project-allocations-table"
        rowKey="projectId"
        columns={allocationColumns}
        dataSource={detail.projectAssignments}
        size="small"
        pagination={false}
        style={{ marginBottom: 24 }}
        locale={{ emptyText: <Empty description="No project allocations" /> }}
      />

      {/* Month-by-Month History */}
      <Title level={4}>Month-by-Month History</Title>
      <Table<EmployeeMonthlyHistory>
        data-testid="monthly-history-table"
        rowKey={(record) => `${record.periodYear}-${record.periodMonth}`}
        columns={historyColumns}
        dataSource={detail.monthlyHistory}
        size="small"
        pagination={false}
        locale={{ emptyText: <Empty description="No monthly history available" /> }}
      />
    </div>
  );
}

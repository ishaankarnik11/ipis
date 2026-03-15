import { Drawer, Table, Typography, Empty, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getDepartmentDrilldown,
  type DepartmentDrilldownEmployee,
  type DepartmentDrilldownProject,
} from '../services/dashboards.api';

const { Title } = Typography;

interface Props {
  open: boolean;
  departmentId: string | null;
  onClose: () => void;
}

const employeeColumns: ColumnsType<DepartmentDrilldownEmployee> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (name: string, record) => (
      <Link to={`/dashboards/employees/${record.employeeId}`}>{name}</Link>
    ),
  },
  {
    title: 'Designation',
    dataIndex: 'designation',
    key: 'designation',
  },
  {
    title: 'Utilisation %',
    dataIndex: 'billableUtilisationPercent',
    key: 'billableUtilisationPercent',
    align: 'right',
    sorter: (a, b) => a.billableUtilisationPercent - b.billableUtilisationPercent,
    render: (val: number) => (
      <span style={{ color: val < 0.5 ? '#d48806' : undefined }}>
        {formatPercent(val)}
      </span>
    ),
  },
  {
    title: 'Revenue Contribution',
    dataIndex: 'revenueContributionPaise',
    key: 'revenueContributionPaise',
    align: 'right',
    sorter: (a, b) => a.revenueContributionPaise - b.revenueContributionPaise,
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
];

const projectColumns: ColumnsType<DepartmentDrilldownProject> = [
  {
    title: 'Project Name',
    dataIndex: 'projectName',
    key: 'projectName',
    render: (name: string, record) => (
      <Link to={`/projects/${record.projectId}`}>{name}</Link>
    ),
  },
  {
    title: 'Employees',
    dataIndex: 'employeeCount',
    key: 'employeeCount',
    align: 'center',
    sorter: (a, b) => a.employeeCount - b.employeeCount,
  },
  {
    title: 'Revenue Contribution',
    dataIndex: 'revenueContributionPaise',
    key: 'revenueContributionPaise',
    align: 'right',
    sorter: (a, b) => a.revenueContributionPaise - b.revenueContributionPaise,
    render: (val: number) => formatCurrency(val),
  },
];

export default function DepartmentDrilldownDrawer({ open, departmentId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: reportKeys.departmentDrilldown(departmentId ?? ''),
    queryFn: () => getDepartmentDrilldown(departmentId!),
    enabled: open && !!departmentId,
  });

  const drilldown = data?.data;
  const title = drilldown ? `${drilldown.departmentName} — Department Drill-Down` : 'Department Drill-Down';

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      size="large"
      data-testid="department-drilldown-drawer"
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginTop: 0 }}>Employees</Title>
          <Table<DepartmentDrilldownEmployee>
            size="small"
            columns={employeeColumns}
            dataSource={drilldown?.employees ?? []}
            rowKey="employeeId"
            loading={isLoading}
            pagination={false}
            locale={{ emptyText: <Empty description="No employees in this department" /> }}
            data-testid="drilldown-employees-table"
          />
        </div>

        <div>
          <Title level={5} style={{ marginTop: 0 }}>Projects</Title>
          <Table<DepartmentDrilldownProject>
            size="small"
            columns={projectColumns}
            dataSource={drilldown?.projects ?? []}
            rowKey="projectId"
            loading={isLoading}
            pagination={false}
            locale={{ emptyText: <Empty description="No project assignments for this department" /> }}
            data-testid="drilldown-projects-table"
          />
        </div>
      </Space>
    </Drawer>
  );
}

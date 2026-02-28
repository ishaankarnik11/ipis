import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Typography, Table, Select, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getProjectDashboard,
  type ProjectDashboardItem,
  type DashboardFilters,
} from '../../services/dashboards.api';
import { engagementModelLabels } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import AtRiskKPITile from '../../components/AtRiskKPITile';
import type { ProjectStatus } from '../../services/projects.api';

const { Title } = Typography;

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const modelOptions = [
  { label: 'Time & Materials', value: 'TIME_AND_MATERIALS' },
  { label: 'Fixed Cost', value: 'FIXED_COST' },
  { label: 'AMC', value: 'AMC' },
  { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
];

export default function ProjectDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: DashboardFilters = {
    department: searchParams.get('department') || undefined,
    vertical: searchParams.get('vertical') || undefined,
    engagement_model: searchParams.get('engagement_model') || undefined,
    status: searchParams.get('status') || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.projects(filters),
    queryFn: () => getProjectDashboard(filters),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];

  // Derive unique filter options from data
  const departmentOptions = useMemo(() => {
    const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))] as string[];
    return departments.sort().map((d) => ({ label: d, value: d }));
  }, [rows]);

  const verticalOptions = useMemo(() => {
    const verticals = [...new Set(rows.map((r) => r.vertical).filter(Boolean))];
    return verticals.sort().map((v) => ({ label: v, value: v }));
  }, [rows]);

  function updateFilter(key: string, value: string | undefined) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  // Client-side filtering from full dataset
  const filteredRows = useMemo(() => {
    let result = rows;
    if (filters.department) {
      result = result.filter((r) => r.department === filters.department);
    }
    if (filters.vertical) {
      result = result.filter((r) => r.vertical === filters.vertical);
    }
    if (filters.engagement_model) {
      result = result.filter((r) => r.engagementModel === filters.engagement_model);
    }
    if (filters.status) {
      result = result.filter((r) => r.status === filters.status);
    }
    return result;
  }, [rows, filters.department, filters.vertical, filters.engagement_model, filters.status]);

  const columns: ColumnsType<ProjectDashboardItem> = [
    {
      title: 'Project Name',
      dataIndex: 'projectName',
      key: 'projectName',
      sorter: (a, b) => a.projectName.localeCompare(b.projectName),
    },
    {
      title: 'Model',
      dataIndex: 'engagementModel',
      key: 'engagementModel',
      render: (model: string) => engagementModelLabels[model] ?? model,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (dept: string | null) => dept ?? '—',
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
      render: (val: number, record) => (
        <Space orientation="vertical" size={2}>
          <span>{formatCurrency(val)}</span>
          {record.profitPaise < 0 && <AtRiskKPITile deficitPaise={record.profitPaise} />}
        </Space>
      ),
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
    <div data-testid="project-dashboard">
      <Title level={3}>Project Dashboard</Title>

      <div data-testid="filter-bar" style={{ marginBottom: 16 }}>
        <Space wrap>
          <div data-testid="filter-department">
            <Select
              placeholder="Department"
              allowClear
              style={{ width: 180 }}
              options={departmentOptions}
              value={filters.department}
              onChange={(val) => updateFilter('department', val)}
            />
          </div>
          <div data-testid="filter-vertical">
            <Select
              placeholder="Vertical"
              allowClear
              style={{ width: 180 }}
              options={verticalOptions}
              value={filters.vertical}
              onChange={(val) => updateFilter('vertical', val)}
            />
          </div>
          <div data-testid="filter-engagement-model">
            <Select
              placeholder="Engagement Model"
              allowClear
              style={{ width: 200 }}
              options={modelOptions}
              value={filters.engagement_model}
              onChange={(val) => updateFilter('engagement_model', val)}
            />
          </div>
          <div data-testid="filter-status">
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 180 }}
              options={statusOptions}
              value={filters.status}
              onChange={(val) => updateFilter('status', val)}
            />
          </div>
        </Space>
      </div>

      <style>{`.loss-row { background-color: #FFF2F0 !important; }`}</style>

      <Table<ProjectDashboardItem>
        data-testid="dashboard-table"
        rowKey="projectId"
        columns={columns}
        dataSource={filteredRows}
        loading={isLoading}
        pagination={false}
        rowClassName={(record) => (record.profitPaise < 0 ? 'loss-row' : '')}
        locale={{ emptyText: <Empty description="No project data available" /> }}
      />
    </div>
  );
}

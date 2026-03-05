import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Typography, Table, Select, Space, Empty, Button, message } from 'antd';
import { FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getEmployeeDashboard,
  type EmployeeDashboardItem,
  type EmployeeDashboardFilters,
} from '../../services/dashboards.api';
import { exportPdf } from '../../services/reports.api';
import { shareReport } from '../../services/share.api';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export default function EmployeeDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN';

  const filters: EmployeeDashboardFilters = {
    department: searchParams.get('department') || undefined,
    designation: searchParams.get('designation') || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.employees(filters),
    queryFn: () => getEmployeeDashboard(filters),
    staleTime: 2 * 60 * 1000,
  });

  const rows = data?.data ?? [];

  const departmentOptions = useMemo(() => {
    const depts = [...new Set(rows.map((r) => r.department).filter(Boolean))];
    return depts.sort().map((d) => ({ label: d, value: d }));
  }, [rows]);

  const designationOptions = useMemo(() => {
    const desigs = [...new Set(rows.map((r) => r.designation).filter(Boolean))];
    return desigs.sort().map((d) => ({ label: d, value: d }));
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

  const columns: ColumnsType<EmployeeDashboardItem> = [
    {
      title: '#',
      dataIndex: 'profitabilityRank',
      key: 'profitabilityRank',
      width: 60,
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.profitabilityRank - b.profitabilityRank,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <a onClick={() => navigate(`/dashboards/employees/${record.employeeId}`)}>{name}</a>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Billable Utilisation',
      dataIndex: 'billableUtilisationPercent',
      key: 'billableUtilisationPercent',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.billableUtilisationPercent - b.billableUtilisationPercent,
      render: (val: number) => (
        <span
          data-testid={val < 0.5 ? 'under-utilisation' : undefined}
          style={{ color: val < 0.5 ? '#d48806' : undefined }}
        >
          {formatPercent(val)}
        </span>
      ),
    },
    {
      title: 'Revenue Contribution',
      dataIndex: 'revenueContributionPaise',
      key: 'revenueContributionPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.revenueContributionPaise - b.revenueContributionPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Cost',
      dataIndex: 'totalCostPaise',
      key: 'totalCostPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.totalCostPaise - b.totalCostPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Profit Contribution',
      dataIndex: 'profitContributionPaise',
      key: 'profitContributionPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.profitContributionPaise - b.profitContributionPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Margin %',
      dataIndex: 'marginPercent',
      key: 'marginPercent',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.marginPercent - b.marginPercent,
      render: (val: number) => formatPercent(val),
    },
  ];

  return (
    <div data-testid="employee-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Employee Dashboard</Title>
        <Space>
          {canShare && (
            <Button
              icon={<ShareAltOutlined />}
              loading={sharing}
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                try {
                  const now = new Date();
                  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
                  await shareReport({ reportType: 'employee', entityId: NIL_UUID, period });
                } catch {
                  message.error('Failed to create share link');
                } finally {
                  setSharing(false);
                }
              }}
            >
              Share Link
            </Button>
          )}
          <Button
            icon={<FilePdfOutlined />}
            loading={exporting}
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const now = new Date();
                const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                await exportPdf({ reportType: 'employee', entityId: NIL_UUID, period });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

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
          <div data-testid="filter-designation">
            <Select
              placeholder="Designation"
              allowClear
              style={{ width: 200 }}
              options={designationOptions}
              value={filters.designation}
              onChange={(val) => updateFilter('designation', val)}
            />
          </div>
        </Space>
      </div>

      <style>{`
        .loss-row { background-color: #FFF2F0 !important; }
        .tabular-nums { font-feature-settings: 'tnum'; }
      `}</style>

      <Table<EmployeeDashboardItem>
        data-testid="employee-dashboard-table"
        rowKey="employeeId"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        size="small"
        pagination={false}
        rowClassName={(record) => (record.profitContributionPaise < 0 ? 'loss-row' : '')}
        locale={{ emptyText: <Empty description="No employee data available" /> }}
      />
    </div>
  );
}

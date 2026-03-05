import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Typography, Table, Space, Empty, Button, message } from 'antd';
import { FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons';
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
import { exportPdf } from '../../services/reports.api';
import { shareReport } from '../../services/share.api';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export default function DepartmentDashboard() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Department Dashboard</Title>
          <DataPeriodIndicator />
        </Space>
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
                  await shareReport({ reportType: 'department', entityId: NIL_UUID, period });
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
                await exportPdf({ reportType: 'department', entityId: NIL_UUID, period });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

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

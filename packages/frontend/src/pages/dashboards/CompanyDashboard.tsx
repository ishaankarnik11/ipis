import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Typography, Card, Row, Col, Statistic, Table, Space, Empty, Spin, Button, message } from 'antd';
import { FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getCompanyDashboard,
  type DepartmentDashboardItem,
} from '../../services/dashboards.api';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import DataPeriodIndicator from '../../components/DataPeriodIndicator';
import { exportPdf } from '../../services/reports.api';
import { shareReport } from '../../services/share.api';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.company,
    queryFn: getCompanyDashboard,
    staleTime: 2 * 60 * 1000,
  });

  const company = data?.data ?? null;

  if (isLoading) {
    return (
      <div data-testid="company-dashboard" style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!company) {
    return (
      <div data-testid="company-dashboard">
        <Space style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Company Dashboard</Title>
          <DataPeriodIndicator />
        </Space>
        <Empty description="No company data available for the current period" />
      </div>
    );
  }

  const deptColumns: ColumnsType<DepartmentDashboardItem> = [
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
      title: 'Profit',
      dataIndex: 'profitPaise',
      key: 'profitPaise',
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

  return (
    <div data-testid="company-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Company Dashboard</Title>
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
                  await shareReport({ reportType: 'company', entityId: NIL_UUID, period });
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
                await exportPdf({ reportType: 'company', entityId: NIL_UUID, period });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {/* Company KPI Tiles */}
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="company-kpi-tiles">
        <Col span={6}>
          <Card>
            <Statistic title="Company Revenue" value={formatCurrency(company.revenuePaise)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Company Cost" value={formatCurrency(company.costPaise)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Company Profit" value={formatCurrency(company.profitPaise)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Company Margin" value={formatPercent(company.marginPercent)} />
          </Card>
        </Col>
      </Row>

      {/* Department Breakdown */}
      <Title level={4}>Department Breakdown</Title>
      <Table<DepartmentDashboardItem>
        data-testid="department-breakdown-table"
        rowKey="departmentId"
        columns={deptColumns}
        dataSource={company.departments}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/dashboards/projects?department=${record.departmentName}`),
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No department data" /> }}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Card, Row, Col, Statistic, Space, Spin, Table, Typography, Result, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency, formatPercent } from '@ipis/shared';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import AtRiskKPITile from '../../components/AtRiskKPITile';

const { Title, Text } = Typography;

interface SharedReportData {
  snapshotData: unknown;
  reportType: string;
  createdAt: string;
  expiresAt: string;
}

type ErrorState = { code: string; message: string } | null;

// ── Type guards for snapshot data ──

interface ExecutiveSnapshot {
  revenuePaise: number;
  costPaise: number;
  marginPercent: number;
  billableUtilisationPercent: number;
  top5Projects: ProjectRow[];
  bottom5Projects: ProjectRow[];
}

interface CompanySnapshot {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  departments: DepartmentRow[];
}

interface ProjectRow {
  projectId: string;
  projectName: string;
  engagementModel: string;
  department: string | null;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

interface DepartmentRow {
  departmentId: string;
  departmentName: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

interface EmployeeRow {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
  marginPercent: number;
  profitabilityRank: number;
}

function isExecutiveSnapshot(data: unknown): data is ExecutiveSnapshot {
  return !!data && typeof data === 'object' && 'top5Projects' in data && 'billableUtilisationPercent' in data;
}

function isCompanySnapshot(data: unknown): data is CompanySnapshot {
  return !!data && typeof data === 'object' && 'departments' in data && 'profitPaise' in data && !('top5Projects' in data);
}

// ── Main Component ──

export default function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/v1/reports/shared/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Failed to load report' } }));
          throw body.error;
        }
        return res.json();
      })
      .then((body) => setData(body.data))
      .catch((err) => setError({ code: err?.code ?? 'UNKNOWN', message: err?.message ?? 'Failed to load report' }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div data-testid="shared-report-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    const isExpired = error.code === 'LINK_EXPIRED';
    const isRevoked = error.code === 'LINK_REVOKED';
    const isNotFound = error.code === 'NOT_FOUND';

    if (isExpired || isRevoked || isNotFound) {
      return (
        <div data-testid="shared-report-error" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Result
            status="warning"
            title="This report link has expired or is invalid"
            subTitle={
              isExpired
                ? 'This shared report link has expired. Please request a new link from the report owner.'
                : isRevoked
                  ? 'This shared report link has been revoked by an administrator.'
                  : 'The report link you followed is invalid. Please check the URL or request a new link.'
            }
          />
        </div>
      );
    }

    return (
      <div data-testid="shared-report-error" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Result status="error" title="This report link has expired or is invalid" subTitle={error.message} />
      </div>
    );
  }

  if (!data) return null;

  const createdDate = new Date(data.createdAt).toLocaleDateString();
  const expiresDate = new Date(data.expiresAt).toLocaleDateString();

  return (
    <div data-testid="shared-report" style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Alert
        type="info"
        showIcon
        banner
        message={`This is a shared snapshot · Generated ${createdDate} · Expires ${expiresDate}`}
        style={{ marginBottom: 24 }}
      />

      <Title level={3} style={{ marginBottom: 16 }}>
        {formatReportTitle(data.reportType)} Report
      </Title>

      <SnapshotRenderer reportType={data.reportType} snapshotData={data.snapshotData} />
    </div>
  );
}

function formatReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    project: 'Project Dashboard',
    executive: 'Executive Dashboard',
    company: 'Company Dashboard',
    department: 'Department Dashboard',
    employee: 'Employee Dashboard',
    'employee-detail': 'Employee Detail',
  };
  return titles[reportType] ?? 'Report';
}

// ── Snapshot Router ──

function SnapshotRenderer({ reportType, snapshotData }: { reportType: string; snapshotData: unknown }) {
  if (!snapshotData) {
    return <Text type="secondary">No data available in this snapshot.</Text>;
  }

  switch (reportType) {
    case 'executive':
      if (isExecutiveSnapshot(snapshotData)) {
        return <ExecutiveShareView data={snapshotData} />;
      }
      break;
    case 'company':
      if (isCompanySnapshot(snapshotData)) {
        return <CompanyShareView data={snapshotData} />;
      }
      break;
    case 'project':
      if (Array.isArray(snapshotData)) {
        return <ProjectShareView data={snapshotData as ProjectRow[]} />;
      }
      break;
    case 'department':
      if (Array.isArray(snapshotData)) {
        return <DepartmentShareView data={snapshotData as DepartmentRow[]} />;
      }
      break;
    case 'employee':
    case 'employee-detail':
      if (Array.isArray(snapshotData)) {
        return <EmployeeShareView data={snapshotData as EmployeeRow[]} />;
      }
      break;
  }

  // Fallback for unknown types — still render something reasonable
  if (Array.isArray(snapshotData) && snapshotData.length > 0) {
    return <FallbackArrayTable data={snapshotData as Record<string, unknown>[]} />;
  }

  return <Text type="secondary">Unable to render snapshot data.</Text>;
}

// ── Executive Dashboard Share View (AC: 4) ──

function ExecutiveShareView({ data }: { data: ExecutiveSnapshot }) {
  return (
    <div data-testid="executive-share-view">
      {/* KPI Tiles */}
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="kpi-tiles">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Revenue" value={formatCurrency(data.revenuePaise)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Total Cost" value={formatCurrency(data.costPaise)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Gross Margin" value={formatPercent(data.marginPercent)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Billable Utilisation" value={formatPercent(data.billableUtilisationPercent)} />
          </Card>
        </Col>
      </Row>

      {/* Top 5 Projects */}
      <Title level={4}>Top 5 Projects by Margin</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} data-testid="top-5-projects">
        {data.top5Projects.map((project, idx) => (
          <Col key={project.projectId ?? idx} xs={24} sm={12} md={8} lg={6} xl={4}>
            <Card size="small">
              <Text strong>{project.projectName}</Text>
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">{formatCurrency(project.revenuePaise)} revenue</Text>
                  <Space>
                    <Text>{formatPercent(project.marginPercent)}</Text>
                    <MarginHealthBadge marginPercent={project.marginPercent} />
                  </Space>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bottom 5 Projects */}
      <Title level={4}>Bottom 5 Projects by Margin</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} data-testid="bottom-5-projects">
        {data.bottom5Projects.map((project, idx) => (
          <Col key={project.projectId ?? idx} xs={24} sm={12} md={8} lg={6} xl={4}>
            <Card size="small">
              <Text strong>{project.projectName}</Text>
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">{formatCurrency(project.revenuePaise)} revenue</Text>
                  <Space>
                    <Text>{formatPercent(project.marginPercent)}</Text>
                    <MarginHealthBadge marginPercent={project.marginPercent} />
                  </Space>
                  {project.profitPaise < 0 && <AtRiskKPITile deficitPaise={project.profitPaise} />}
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

// ── Company Dashboard Share View ──

function CompanyShareView({ data }: { data: CompanySnapshot }) {
  const deptColumns: ColumnsType<DepartmentRow> = [
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Revenue', dataIndex: 'revenuePaise', key: 'revenuePaise', align: 'right', render: (val: number) => formatCurrency(val) },
    { title: 'Cost', dataIndex: 'costPaise', key: 'costPaise', align: 'right', render: (val: number) => formatCurrency(val) },
    { title: 'Profit', dataIndex: 'profitPaise', key: 'profitPaise', align: 'right', render: (val: number) => formatCurrency(val) },
    {
      title: 'Margin %', dataIndex: 'marginPercent', key: 'marginPercent', align: 'right',
      render: (val: number) => (
        <Space>
          <span>{formatPercent(val)}</span>
          <MarginHealthBadge marginPercent={val} />
        </Space>
      ),
    },
  ];

  return (
    <div data-testid="company-share-view">
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="kpi-tiles">
        <Col xs={12} sm={6}>
          <Card><Statistic title="Company Revenue" value={formatCurrency(data.revenuePaise)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Company Cost" value={formatCurrency(data.costPaise)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Company Profit" value={formatCurrency(data.profitPaise)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Company Margin" value={formatPercent(data.marginPercent)} /></Card>
        </Col>
      </Row>

      <Title level={4}>Department Breakdown</Title>
      <Table<DepartmentRow>
        data-testid="department-breakdown-table"
        rowKey={(_, index) => String(index)}
        columns={deptColumns}
        dataSource={data.departments}
        pagination={false}
        locale={{ emptyText: <Empty description="No department data" /> }}
      />
    </div>
  );
}

// ── Project Dashboard Share View (AC: 5) ──

function ProjectShareView({ data }: { data: ProjectRow[] }) {
  if (data.length === 0) {
    return <Empty description="No project data in this snapshot." />;
  }

  const columns: ColumnsType<ProjectRow> = [
    { title: 'Project', dataIndex: 'projectName', key: 'projectName' },
    { title: 'Model', dataIndex: 'engagementModel', key: 'engagementModel' },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v: string | null) => v ?? '\u2014' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Revenue', dataIndex: 'revenuePaise', key: 'revenuePaise', align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'Cost', dataIndex: 'costPaise', key: 'costPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: 'Profit', dataIndex: 'profitPaise', key: 'profitPaise', align: 'right',
      render: (v: number, record: ProjectRow) => (
        <Space>
          <span>{formatCurrency(v)}</span>
          {record.profitPaise < 0 && <AtRiskKPITile deficitPaise={record.profitPaise} />}
        </Space>
      ),
    },
    {
      title: 'Margin %', dataIndex: 'marginPercent', key: 'marginPercent', align: 'right',
      render: (v: number) => (
        <Space>
          <span>{formatPercent(v)}</span>
          <MarginHealthBadge marginPercent={v} />
        </Space>
      ),
    },
  ];

  // Summary KPIs
  const totalRevenue = data.reduce((sum, r) => sum + r.revenuePaise, 0);
  const totalCost = data.reduce((sum, r) => sum + r.costPaise, 0);
  const totalProfit = data.reduce((sum, r) => sum + r.profitPaise, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  return (
    <div data-testid="project-share-view">
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="kpi-tiles">
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Revenue" value={formatCurrency(totalRevenue)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Cost" value={formatCurrency(totalCost)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Profit" value={formatCurrency(totalProfit)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Avg Margin" value={formatPercent(avgMargin)} /></Card>
        </Col>
      </Row>

      <style>{`.loss-row { background-color: #FFF2F0 !important; }`}</style>

      <Table<ProjectRow>
        data-testid="project-table"
        rowKey={(_, index) => String(index)}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: true }}
        rowClassName={(record) => (record.profitPaise < 0 ? 'loss-row' : '')}
      />
    </div>
  );
}

// ── Department Dashboard Share View (AC: 6) ──

function DepartmentShareView({ data }: { data: DepartmentRow[] }) {
  if (data.length === 0) {
    return <Empty description="No department data in this snapshot." />;
  }

  // Summary KPIs
  const totalRevenue = data.reduce((sum, r) => sum + r.revenuePaise, 0);
  const totalCost = data.reduce((sum, r) => sum + r.costPaise, 0);
  const totalProfit = data.reduce((sum, r) => sum + r.profitPaise, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  const columns: ColumnsType<DepartmentRow> = [
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Revenue', dataIndex: 'revenuePaise', key: 'revenuePaise', align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'Cost', dataIndex: 'costPaise', key: 'costPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'Profit', dataIndex: 'profitPaise', key: 'profitPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: 'Margin %', dataIndex: 'marginPercent', key: 'marginPercent', align: 'right',
      render: (v: number) => (
        <Space>
          <span>{formatPercent(v)}</span>
          <MarginHealthBadge marginPercent={v} />
        </Space>
      ),
    },
  ];

  return (
    <div data-testid="department-share-view">
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="kpi-tiles">
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Revenue" value={formatCurrency(totalRevenue)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Cost" value={formatCurrency(totalCost)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Total Profit" value={formatCurrency(totalProfit)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Avg Margin" value={formatPercent(avgMargin)} /></Card>
        </Col>
      </Row>

      <Table<DepartmentRow>
        data-testid="department-table"
        rowKey={(_, index) => String(index)}
        columns={columns}
        dataSource={data}
        pagination={false}
      />
    </div>
  );
}

// ── Employee Dashboard Share View ──

function EmployeeShareView({ data }: { data: EmployeeRow[] }) {
  if (data.length === 0) {
    return <Empty description="No employee data in this snapshot." />;
  }

  const columns: ColumnsType<EmployeeRow> = [
    { title: 'Rank', dataIndex: 'profitabilityRank', key: 'profitabilityRank', width: 60 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Billable Util %', dataIndex: 'billableUtilisationPercent', key: 'billableUtilisationPercent', align: 'right', render: (v: number) => formatPercent(v) },
    { title: 'Revenue', dataIndex: 'revenueContributionPaise', key: 'revenueContributionPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'Cost', dataIndex: 'totalCostPaise', key: 'totalCostPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    { title: 'Profit', dataIndex: 'profitContributionPaise', key: 'profitContributionPaise', align: 'right', render: (v: number) => formatCurrency(v) },
    {
      title: 'Margin %', dataIndex: 'marginPercent', key: 'marginPercent', align: 'right',
      render: (v: number) => (
        <Space>
          <span>{formatPercent(v)}</span>
          <MarginHealthBadge marginPercent={v} />
        </Space>
      ),
    },
  ];

  return (
    <div data-testid="employee-share-view">
      <Table<EmployeeRow>
        data-testid="employee-table"
        rowKey={(_, index) => String(index)}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: true }}
      />
    </div>
  );
}

// ── Fallback for unknown array types ──

function FallbackArrayTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <Empty description="No data in this snapshot." />;
  const keys = Object.keys(data[0]);
  const columns = keys.map((key) => ({
    title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    dataIndex: key,
    key,
    render: (v: unknown) => {
      if (v === null || v === undefined) return '\u2014';
      if (typeof v === 'number' && key.toLowerCase().includes('paise')) return formatCurrency(v);
      if (typeof v === 'number' && key.toLowerCase().includes('percent')) return formatPercent(v);
      return String(v);
    },
  }));

  return (
    <Table
      rowKey={(_, index) => String(index)}
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: true }}
    />
  );
}

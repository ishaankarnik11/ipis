import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Card, Spin, Table, Typography, Result } from 'antd';
import { formatCurrency, formatPercent } from '@ipis/shared';

const { Title, Text } = Typography;

interface SharedReportData {
  snapshotData: unknown;
  reportType: string;
  createdAt: string;
  expiresAt: string;
}

type ErrorState = { code: string; message: string } | null;

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    const isExpired = error.code === 'LINK_EXPIRED';
    const isRevoked = error.code === 'LINK_REVOKED';

    if (isExpired || isRevoked) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Result
            status="warning"
            title={isExpired ? 'Link Expired' : 'Link Revoked'}
            subTitle={isExpired
              ? 'This shared report link has expired. Please request a new link from the report owner.'
              : 'This shared report link has been revoked by an administrator.'}
          />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Result status="error" title="Error" subTitle={error.message} />
      </div>
    );
  }

  if (!data) return null;

  const createdDate = new Date(data.createdAt).toLocaleDateString();
  const expiresDate = new Date(data.expiresAt).toLocaleDateString();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Alert
        type="info"
        showIcon
        banner
        message={`This is a shared snapshot \u00b7 Generated ${createdDate} \u00b7 Expires ${expiresDate}`}
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

function SnapshotRenderer({ reportType, snapshotData }: { reportType: string; snapshotData: unknown }) {
  if (!snapshotData) {
    return <Text type="secondary">No data available in this snapshot.</Text>;
  }

  // For array-type data (project, department, employee dashboards)
  if (Array.isArray(snapshotData)) {
    return <ArraySnapshotTable data={snapshotData} reportType={reportType} />;
  }

  // For object-type data (executive, company dashboards)
  if (typeof snapshotData === 'object') {
    return (
      <Card>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
          {JSON.stringify(snapshotData, null, 2)}
        </pre>
      </Card>
    );
  }

  return <Text type="secondary">Unable to render snapshot data.</Text>;
}

function ArraySnapshotTable({ data, reportType }: { data: Record<string, unknown>[]; reportType: string }) {
  if (data.length === 0) {
    return <Text type="secondary">No records in this snapshot.</Text>;
  }

  // Build columns from the first record's keys
  const columns = getColumnsForType(reportType, data);

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

function getColumnsForType(reportType: string, data: Record<string, unknown>[]) {
  // Known column configurations for common report types
  if (reportType === 'project' && data[0] && 'projectName' in data[0]) {
    return [
      { title: 'Project', dataIndex: 'projectName', key: 'projectName' },
      { title: 'Model', dataIndex: 'engagementModel', key: 'engagementModel' },
      { title: 'Department', dataIndex: 'department', key: 'department', render: (v: unknown) => (v as string) ?? '—' },
      { title: 'Status', dataIndex: 'status', key: 'status' },
      { title: 'Revenue', dataIndex: 'revenuePaise', key: 'revenuePaise', align: 'right' as const, render: (v: unknown) => formatCurrency(v as number) },
      { title: 'Cost', dataIndex: 'costPaise', key: 'costPaise', align: 'right' as const, render: (v: unknown) => formatCurrency(v as number) },
      { title: 'Profit', dataIndex: 'profitPaise', key: 'profitPaise', align: 'right' as const, render: (v: unknown) => formatCurrency(v as number) },
      { title: 'Margin %', dataIndex: 'marginPercent', key: 'marginPercent', align: 'right' as const, render: (v: unknown) => formatPercent(v as number) },
    ];
  }

  // Fallback: auto-generate columns from keys
  const keys = Object.keys(data[0]);
  return keys.map((key) => ({
    title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    dataIndex: key,
    key,
    render: (v: unknown) => {
      if (v === null || v === undefined) return '—';
      if (typeof v === 'number' && key.toLowerCase().includes('paise')) return formatCurrency(v);
      if (typeof v === 'number' && key.toLowerCase().includes('percent')) return formatPercent(v);
      return String(v);
    },
  }));
}

import { useState, useEffect } from 'react';
import {
  Drawer,
  Spin,
  Alert,
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tooltip,
  Typography,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  ledgerKeys,
  getProjectLedger,
  type LedgerData,
  type LedgerEmployee,
  type InfraSimpleLedgerData,
  type InfraDetailedLedgerData,
} from '../../services/ledger.api';
import { uploadKeys, getLatestByType } from '../../services/uploads.api';

const { Text } = Typography;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── Type guards ─────────────────────────────────────────────────────────────

function isInfraSimple(data: LedgerData): data is InfraSimpleLedgerData {
  return (
    data.engagement_model === 'INFRASTRUCTURE' &&
    'infra_cost_mode' in data &&
    data.infra_cost_mode === 'SIMPLE'
  );
}

function isInfraDetailed(data: LedgerData): data is InfraDetailedLedgerData {
  return (
    data.engagement_model === 'INFRASTRUCTURE' &&
    'infra_cost_mode' in data &&
    data.infra_cost_mode === 'DETAILED'
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function useDrawerWidth() {
  const [width, setWidth] = useState<number | string>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 480,
  );
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => setWidth(window.innerWidth < 768 ? '100%' : 480),
        150,
      );
    };
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handler);
    };
  }, []);
  return width;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DerivedFigure({ value, formula }: { value: string; formula: string }) {
  return (
    <Tooltip title={formula}>
      <span
        className="tnum"
        style={{ borderBottom: '1px dotted currentColor', cursor: 'help' }}
        data-testid="derived-figure"
      >
        {value}
      </span>
    </Tooltip>
  );
}

function KpiTiles({ data }: { data: LedgerData }) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }} data-testid="ledger-kpi-tiles">
      <Col span={12}>
        <Card size="small">
          <Statistic title="Revenue" value={formatCurrency(data.revenue_paise)} />
        </Card>
      </Col>
      <Col span={12}>
        <Card size="small">
          <Statistic title="Cost" value={formatCurrency(data.cost_paise)} />
        </Card>
      </Col>
      <Col span={12}>
        <Card size="small">
          <Statistic
            title="Profit"
            value=" "
            formatter={() => (
              <DerivedFigure
                value={formatCurrency(data.profit_paise)}
                formula="Revenue − Cost"
              />
            )}
            styles={data.profit_paise < 0 ? { content: { color: '#E05A4B' } } : undefined}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card size="small">
          <Statistic
            title="Margin %"
            value=" "
            formatter={() => (
              <DerivedFigure
                value={formatPercent(data.margin_percent)}
                formula="Profit ÷ Revenue × 100"
              />
            )}
          />
        </Card>
      </Col>
    </Row>
  );
}

function EmployeeTable({
  employees,
  isLossProject,
}: {
  employees: LedgerEmployee[];
  isLossProject: boolean;
}) {
  const largestContributorId =
    isLossProject && employees.length > 0
      ? employees.reduce((max, emp) =>
          emp.contribution_paise > max.contribution_paise ? emp : max,
        ).employeeId
      : null;

  const columns: ColumnsType<LedgerEmployee> = [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      align: 'right',
    },
    {
      title: 'Cost/Hour (₹)',
      dataIndex: 'cost_per_hour_paise',
      key: 'costPerHour',
      align: 'right',
      render: (val: number) => (
        <DerivedFigure
          value={formatCurrency(val)}
          formula="Annual CTC + ₹1,80,000 overhead ÷ 12 ÷ standard monthly hours"
        />
      ),
    },
    {
      title: 'Contribution (₹)',
      dataIndex: 'contribution_paise',
      key: 'contribution',
      align: 'right',
      render: (val: number) => <span className="tnum">{formatCurrency(val)}</span>,
    },
  ];

  return (
    <Table<LedgerEmployee>
      data-testid="employee-breakdown-table"
      rowKey="employeeId"
      columns={columns}
      dataSource={employees}
      size="small"
      pagination={false}
      rowClassName={(record) =>
        isLossProject && record.employeeId === largestContributorId
          ? 'loss-row'
          : ''
      }
    />
  );
}

function CostBreakdown({ data }: { data: LedgerData }) {
  if (isInfraSimple(data)) {
    const isLoss = data.profit_paise < 0;
    return (
      <Card
        data-testid="cost-summary-card"
        size="small"
        title="Cost Summary"
        style={isLoss ? { borderColor: '#E05A4B', borderWidth: 2 } : undefined}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text>Vendor Cost</Text>
          <Text className="tnum">{formatCurrency(data.vendor_cost_paise)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>Manpower Cost</Text>
          <Text className="tnum">{formatCurrency(data.manpower_cost_paise)}</Text>
        </div>
      </Card>
    );
  }

  if (isInfraDetailed(data)) {
    return (
      <>
        <div data-testid="vendor-cost-line" style={{ marginBottom: 12 }}>
          <Text strong>Vendor Cost: </Text>
          <Text className="tnum">{formatCurrency(data.vendor_cost_paise)}</Text>
        </div>
        <EmployeeTable
          employees={data.employees}
          isLossProject={data.profit_paise < 0}
        />
      </>
    );
  }

  // Remaining: EmployeeLedgerData (T&M, Fixed Cost, AMC)
  return (
    <EmployeeTable
      employees={data.employees}
      isLossProject={data.profit_paise < 0}
    />
  );
}

function MetadataFooter({ data }: { data: LedgerData }) {
  return (
    <>
      <Divider />
      <div data-testid="ledger-metadata-footer" style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Calculated: {formatRelativeTime(new Date(data.calculated_at))} · Engine
          v{data.engine_version}
        </Text>
      </div>
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface LedgerDrawerProps {
  projectId: string | null;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

export default function LedgerDrawer({
  projectId,
  projectName,
  open,
  onClose,
}: LedgerDrawerProps) {
  const drawerWidth = useDrawerWidth();

  // Derive period from latest upload data (same source as DataPeriodIndicator)
  const { data: uploadData } = useQuery({
    queryKey: [...uploadKeys.latestByType],
    queryFn: getLatestByType,
    staleTime: 60_000,
  });

  const latestUpload =
    uploadData?.data?.length
      ? uploadData.data.reduce((a, b) =>
          new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
        )
      : null;

  const period = latestUpload
    ? `${latestUpload.periodYear}-${String(latestUpload.periodMonth).padStart(2, '0')}`
    : null;

  const periodLabel = latestUpload
    ? `${MONTH_NAMES[latestUpload.periodMonth - 1]} ${latestUpload.periodYear}`
    : '';

  // Fetch ledger data
  const {
    data: ledgerResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ledgerKeys.detail(projectId ?? '', period ?? ''),
    queryFn: () => getProjectLedger(projectId!, period!),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId && open && !!period,
  });

  const ledgerData = ledgerResponse?.data ?? null;

  return (
    <>
      <style>{`
        .tnum { font-feature-settings: 'tnum'; }
        .ledger-drawer .loss-row { background-color: #FFF2F0 !important; }
      `}</style>
      <Drawer
        data-testid="ledger-drawer"
        className="ledger-drawer"
        title={`${projectName}${periodLabel ? ` — ${periodLabel}` : ''}`}
        placement="right"
        open={open}
        onClose={onClose}
        destroyOnClose={false}
        styles={{ wrapper: { width: drawerWidth } }}
      >
        {isLoading && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            message="Failed to load ledger data"
            description={
              error instanceof Error ? error.message : 'An unexpected error occurred'
            }
            data-testid="ledger-error"
          />
        )}

        {ledgerData && !isLoading && (
          <>
            <KpiTiles data={ledgerData} />
            <CostBreakdown data={ledgerData} />
            <MetadataFooter data={ledgerData} />
          </>
        )}
      </Drawer>
    </>
  );
}

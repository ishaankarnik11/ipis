import { useState, useMemo } from 'react';
import { Typography, Table, Space, Empty, Button, message, DatePicker, Tooltip } from 'antd';
import { FilePdfOutlined, ShareAltOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  reportKeys,
  getDepartmentDashboard,
  getDepartmentComparison,
  type DepartmentDashboardItem,
  type DepartmentComparisonItem,
  type DepartmentMonthData,
} from '../../services/dashboards.api';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import DataPeriodIndicator from '../../components/DataPeriodIndicator';
import DepartmentDrilldownDrawer from '../../components/DepartmentDrilldownDrawer';
import { exportPdf } from '../../services/reports.api';
import { createShareUrl } from '../../services/share.api';
import ShareLinkModal from '../../components/ShareLinkModal';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function TrendIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  if (current === previous) return null;
  const improved = current > previous;
  return improved ? (
    <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 12 }} />
  ) : (
    <ArrowDownOutlined style={{ color: '#f5222d', fontSize: 12 }} />
  );
}

function generateMonthRange(start: Dayjs, end: Dayjs): string[] {
  const months: string[] = [];
  let current = start.startOf('month');
  const endMonth = end.startOf('month');
  while (current.isBefore(endMonth) || current.isSame(endMonth)) {
    months.push(current.format('YYYY-MM'));
    current = current.add(1, 'month');
  }
  return months.slice(0, 12); // Cap at 12
}

export default function DepartmentDashboard() {
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; expiresAt: string } | null>(null);
  const [monthRange, setMonthRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [drilldownDeptId, setDrilldownDeptId] = useState<string | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN' || user?.role === 'DEPT_HEAD';

  const selectedMonths = useMemo(() => {
    if (!monthRange || !monthRange[0] || !monthRange[1]) return null;
    return generateMonthRange(monthRange[0], monthRange[1]);
  }, [monthRange]);

  const isComparison = selectedMonths && selectedMonths.length > 1;

  // Single-month query (default view)
  const singleQuery = useQuery({
    queryKey: reportKeys.department,
    queryFn: getDepartmentDashboard,
    staleTime: 2 * 60 * 1000,
    enabled: !isComparison,
  });

  // Multi-month comparison query
  const comparisonQuery = useQuery({
    queryKey: reportKeys.departmentComparison(selectedMonths ?? []),
    queryFn: () => getDepartmentComparison(selectedMonths!),
    staleTime: 2 * 60 * 1000,
    enabled: !!isComparison,
  });

  const singleRows = singleQuery.data?.data ?? [];
  const comparisonRows = comparisonQuery.data?.data ?? [];

  // Single-month columns (existing)
  const singleColumns: ColumnsType<DepartmentDashboardItem> = [
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
      sorter: (a, b) => (a.marginPercent ?? -Infinity) - (b.marginPercent ?? -Infinity),
      render: (val: number | null) =>
        val == null ? (
          <span style={{ color: '#999' }}>N/A</span>
        ) : (
          <Space>
            <span>{formatPercent(val)}</span>
            <MarginHealthBadge marginPercent={val} />
          </Space>
        ),
    },
  ];

  // Comparison columns
  const comparisonColumns: ColumnsType<DepartmentComparisonItem> = useMemo(() => {
    if (!selectedMonths) return [];

    const cols: ColumnsType<DepartmentComparisonItem> = [
      {
        title: 'Department',
        dataIndex: 'departmentName',
        key: 'departmentName',
        fixed: 'left',
        width: 160,
      },
    ];

    selectedMonths.forEach((monthStr, idx) => {
      const [yearStr, monthNumStr] = monthStr.split('-');
      const year = parseInt(yearStr!, 10);
      const monthNum = parseInt(monthNumStr!, 10);
      const label = `${MONTH_NAMES[monthNum - 1]} ${year}`;

      const getMonthData = (record: DepartmentComparisonItem): DepartmentMonthData | undefined =>
        record.months.find((m) => m.periodMonth === monthNum && m.periodYear === year);

      const getPrevMonthData = (record: DepartmentComparisonItem): DepartmentMonthData | undefined => {
        if (idx === 0) return undefined;
        const prevStr = selectedMonths[idx - 1]!;
        const [pY, pM] = prevStr.split('-');
        return record.months.find((m) => m.periodMonth === parseInt(pM!, 10) && m.periodYear === parseInt(pY!, 10));
      };

      const hasData = (md: DepartmentMonthData | undefined) =>
        md && (md.revenuePaise !== 0 || md.costPaise !== 0 || md.marginPercent !== null);

      cols.push({
        title: label,
        children: [
          {
            title: 'Revenue',
            key: `revenue-${monthStr}`,
            align: 'right',
            width: 120,
            render: (_: unknown, record: DepartmentComparisonItem) => {
              const md = getMonthData(record);
              if (!hasData(md)) return <Tooltip title="No data available for this period"><span style={{ color: '#999' }}>—</span></Tooltip>;
              const prev = getPrevMonthData(record);
              return (
                <Space size={4}>
                  <span>{formatCurrency(md!.revenuePaise)}</span>
                  {prev && hasData(prev) && <TrendIndicator current={md!.revenuePaise} previous={prev.revenuePaise} />}
                </Space>
              );
            },
          },
          {
            title: 'Cost',
            key: `cost-${monthStr}`,
            align: 'right',
            width: 120,
            render: (_: unknown, record: DepartmentComparisonItem) => {
              const md = getMonthData(record);
              if (!hasData(md)) return <Tooltip title="No data available for this period"><span style={{ color: '#999' }}>—</span></Tooltip>;
              return <span>{formatCurrency(md!.costPaise)}</span>;
            },
          },
          {
            title: 'Margin %',
            key: `margin-${monthStr}`,
            align: 'right',
            width: 100,
            render: (_: unknown, record: DepartmentComparisonItem) => {
              const md = getMonthData(record);
              if (!hasData(md) || md!.marginPercent == null) return <Tooltip title="No data available for this period"><span style={{ color: '#999' }}>—</span></Tooltip>;
              const prev = getPrevMonthData(record);
              return (
                <Space size={4}>
                  <span>{formatPercent(md!.marginPercent!)}</span>
                  {prev && hasData(prev) && prev.marginPercent != null && (
                    <TrendIndicator current={md!.marginPercent!} previous={prev.marginPercent} />
                  )}
                </Space>
              );
            },
          },
        ],
      });
    });

    return cols;
  }, [selectedMonths]);

  return (
    <div data-testid="department-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Department Dashboard</Title>
          {!isComparison && <DataPeriodIndicator />}
        </Space>
        <Space>
          <RangePicker
            picker="month"
            placeholder={['Start Month', 'End Month']}
            value={monthRange}
            onChange={(dates) => setMonthRange(dates)}
            data-testid="month-range-picker"
            allowClear
          />
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
                  const result = await createShareUrl({ reportType: 'department', entityId: NIL_UUID, period });
                  setShareData(result);
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
                const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
                await exportPdf({ reportType: 'department', entityId: NIL_UUID, period });
              } catch {
                message.error('Failed to export PDF');
              } finally {
                setExporting(false);
              }
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {isComparison ? (
        <Table<DepartmentComparisonItem>
          data-testid="department-comparison-table"
          rowKey="departmentId"
          columns={comparisonColumns}
          dataSource={comparisonRows}
          loading={comparisonQuery.isLoading}
          pagination={false}
          bordered
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="No department data available" /> }}
        />
      ) : (
        <Table<DepartmentDashboardItem>
          data-testid="department-table"
          rowKey="departmentId"
          columns={singleColumns}
          dataSource={singleRows}
          loading={singleQuery.isLoading}
          pagination={false}
          onRow={(record) => ({
            onClick: () => {
              setDrilldownDeptId(record.departmentId);
              setDrilldownOpen(true);
            },
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <Empty description="No department data available" /> }}
        />
      )}

      <DepartmentDrilldownDrawer
        open={drilldownOpen}
        departmentId={drilldownDeptId}
        onClose={() => {
          setDrilldownOpen(false);
          setDrilldownDeptId(null);
        }}
      />
      <ShareLinkModal open={!!shareData} shareUrl={shareData?.url ?? ''} expiresAt={shareData?.expiresAt} onClose={() => setShareData(null)} />
    </div>
  );
}

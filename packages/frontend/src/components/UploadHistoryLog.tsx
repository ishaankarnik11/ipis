import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Empty, Segmented, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { uploadKeys, getUploadHistory } from '../services/uploads.api';
import type { UploadHistoryEntry } from '../services/uploads.api';
import UploadDetailDrawer from './UploadDetailDrawer';
import { useAuth } from '../hooks/useAuth';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'green',
  PARTIAL: 'orange',
  FAILED: 'red',
};

const TYPE_LABELS: Record<string, string> = {
  TIMESHEET: 'Timesheet',
  BILLING: 'Billing',
  SALARY: 'Salary',
};

const baseColumns: ColumnsType<UploadHistoryEntry> = [
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (type: string) => TYPE_LABELS[type] ?? type,
  },
  {
    title: 'Period',
    key: 'period',
    render: (_: unknown, record: UploadHistoryEntry) =>
      `${MONTH_NAMES[record.periodMonth - 1]} ${record.periodYear}`,
  },
  {
    title: 'Rows Imported',
    dataIndex: 'rowCount',
    key: 'rowCount',
    align: 'right',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
    ),
  },
  {
    title: 'Uploaded By',
    dataIndex: 'uploaderName',
    key: 'uploaderName',
  },
  {
    title: 'Uploaded At',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (date: string) => new Date(date).toLocaleString(),
  },
];

const viewColumn: ColumnsType<UploadHistoryEntry>[0] = {
  title: '',
  key: 'view',
  width: 60,
  align: 'center',
  render: () => (
    <Button type="link" size="small" icon={<EyeOutlined />} aria-label="View details">
      View
    </Button>
  ),
};

export default function UploadHistoryLog() {
  const [page, setPage] = useState(1);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [viewMode, setViewMode] = useState<'mine' | 'all'>(isAdmin ? 'all' : 'mine');
  const mine = viewMode === 'mine';

  const { data, isLoading } = useQuery({
    queryKey: [...uploadKeys.history, page, viewMode],
    queryFn: () => getUploadHistory(page, 20, mine),
  });

  const handleRowClick = (record: UploadHistoryEntry) => {
    setSelectedUploadId(record.id);
    setDrawerOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Upload History</h3>
        <Segmented
          options={[
            { label: 'My Uploads', value: 'mine' },
            { label: 'All Uploads', value: 'all' },
          ]}
          value={viewMode}
          onChange={(val) => { setViewMode(val as 'mine' | 'all'); setPage(1); }}
          size="small"
        />
      </div>
      <Table<UploadHistoryEntry>
        size="small"
        columns={[...baseColumns, viewColumn]}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No upload history yet" /> }}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.meta?.total ?? 0,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />
      <UploadDetailDrawer
        open={drawerOpen}
        uploadEventId={selectedUploadId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUploadId(null);
        }}
      />
    </div>
  );
}

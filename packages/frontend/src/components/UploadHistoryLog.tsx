import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { uploadKeys, getUploadHistory } from '../services/uploads.api';
import type { UploadHistoryEntry } from '../services/uploads.api';

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

const columns: ColumnsType<UploadHistoryEntry> = [
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

export default function UploadHistoryLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: [...uploadKeys.history, page],
    queryFn: () => getUploadHistory(page, 20),
  });

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Upload History</h3>
      <Table<UploadHistoryEntry>
        size="small"
        columns={columns}
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
      />
    </div>
  );
}

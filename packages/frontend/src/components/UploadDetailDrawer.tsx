import { useState } from 'react';
import { Drawer, Table, Tag, Segmented, Button, Empty, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import {
  uploadKeys,
  getUploadRecords,
  downloadUploadRecords,
  type UploadRecordRow,
} from '../services/uploads.api';
import { formatCurrency } from '@ipis/shared';

interface Props {
  open: boolean;
  uploadEventId: string | null;
  onClose: () => void;
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
];

export default function UploadDetailDrawer({ open, uploadEventId, onClose }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: uploadKeys.records(uploadEventId ?? '', statusFilter),
    queryFn: () => getUploadRecords(uploadEventId!, statusFilter),
    enabled: open && !!uploadEventId,
  });

  const records = data?.data ?? [];
  const uploadType = data?.meta?.uploadType ?? '';

  const handleDownload = async () => {
    if (!uploadEventId) return;
    setDownloading(true);
    try {
      await downloadUploadRecords(uploadEventId, statusFilter);
    } catch {
      message.error('Failed to download records');
    } finally {
      setDownloading(false);
    }
  };

  // Dynamic columns based on upload type
  const baseColumns: ColumnsType<UploadRecordRow> = [
    {
      title: 'Row #',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 70,
      sorter: (a, b) => a.rowNumber - b.rowNumber,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? 'Success' : 'Failed'}
        </Tag>
      ),
    },
  ];

  // Add data columns based on upload type
  const dataColumns: ColumnsType<UploadRecordRow> = [];

  if (uploadType === 'TIMESHEET') {
    dataColumns.push(
      { title: 'Employee Code', dataIndex: 'employeeCode', key: 'employeeCode' },
      { title: 'Employee Name', dataIndex: 'employeeName', key: 'employeeName' },
      { title: 'Project', dataIndex: 'projectName', key: 'projectName' },
      { title: 'Hours', dataIndex: 'hours', key: 'hours', align: 'right' },
      { title: 'Period Month', dataIndex: 'periodMonth', key: 'periodMonth' },
      { title: 'Period Year', dataIndex: 'periodYear', key: 'periodYear' },
    );
  } else if (uploadType === 'BILLING') {
    dataColumns.push(
      { title: 'Project', dataIndex: 'projectName', key: 'projectName' },
      { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
      { title: 'Invoice Amount', dataIndex: 'invoiceAmountPaise', key: 'invoiceAmountPaise', align: 'right', render: (val: number) => formatCurrency(val) },
      { title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', render: (val: string) => val ? val.slice(0, 10) : '—' },
      { title: 'Type', dataIndex: 'projectType', key: 'projectType', render: (val: string) => ({ TIME_AND_MATERIALS: 'Time & Materials', FIXED_COST: 'Fixed Cost', AMC: 'AMC', INFRASTRUCTURE: 'Infrastructure' }[val] ?? val) },
      { title: 'Vertical', dataIndex: 'vertical', key: 'vertical' },
    );
  } else if (uploadType === 'SALARY') {
    dataColumns.push(
      { title: 'Employee Code', dataIndex: 'employeeCode', key: 'employeeCode' },
    );
  }

  // Add reason column when showing failed rows
  const showReasonColumn = statusFilter !== 'success';
  if (showReasonColumn) {
    dataColumns.push({
      title: 'Error Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string | undefined) => reason ?? '—',
    });
  }

  const columns = [...baseColumns, ...dataColumns];

  const title = uploadType === 'TIMESHEET' ? 'Timesheet Upload Records'
    : uploadType === 'BILLING' ? 'Revenue Upload Records'
    : uploadType === 'SALARY' ? 'Employee Master Upload Records'
    : 'Upload Records';

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      size="large"
      data-testid="upload-detail-drawer"
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            loading={downloading}
            disabled={records.length === 0}
            onClick={handleDownload}
            data-testid="download-records-btn"
          >
            Download
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as string)}
          data-testid="record-status-filter"
        />
      </div>

      <Table<UploadRecordRow>
        size="small"
        columns={columns}
        dataSource={records}
        rowKey={(record) => `${record.rowNumber}-${record.status}`}
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
        locale={{ emptyText: <Empty description={`No ${statusFilter === 'all' ? '' : statusFilter} records`} /> }}
        data-testid="upload-records-table"
      />
    </Drawer>
  );
}

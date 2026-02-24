import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, Tag, Select, DatePicker, Input, Space, Empty, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { auditKeys, getAuditLog } from '../../services/audit.api';
import type { AuditEvent } from '../../services/audit.api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const ACTION_OPTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'PROJECT_CREATED',
  'PROJECT_APPROVED',
  'PROJECT_REJECTED',
  'UPLOAD_TIMESHEET_SUCCESS',
  'UPLOAD_TIMESHEET_REJECTED',
  'UPLOAD_BILLING_SUCCESS',
  'UPLOAD_SALARY_SUCCESS',
  'UPLOAD_SALARY_PARTIAL',
  'RECALCULATION_TRIGGERED',
  'SHARE_LINK_CREATED',
  'SHARE_LINK_REVOKED',
  'PDF_EXPORTED',
  'SETTINGS_UPDATED',
];

const actionColorMap: Record<string, string> = {
  USER_CREATED: 'green',
  USER_UPDATED: 'blue',
  USER_DEACTIVATED: 'red',
  PROJECT_CREATED: 'green',
  PROJECT_APPROVED: 'green',
  PROJECT_REJECTED: 'red',
  UPLOAD_TIMESHEET_SUCCESS: 'green',
  UPLOAD_TIMESHEET_REJECTED: 'red',
  UPLOAD_BILLING_SUCCESS: 'green',
  UPLOAD_SALARY_SUCCESS: 'green',
  UPLOAD_SALARY_PARTIAL: 'orange',
  RECALCULATION_TRIGGERED: 'purple',
  SHARE_LINK_CREATED: 'blue',
  SHARE_LINK_REVOKED: 'red',
  PDF_EXPORTED: 'blue',
  SETTINGS_UPDATED: 'blue',
};

export default function AuditLog() {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(debounceTimer.current), []);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const actions = searchParams.get('actions')?.split(',').filter(Boolean) ?? [];
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const actorEmail = searchParams.get('actorEmail') || undefined;

  const filters = useMemo(
    () => ({ page, pageSize, actions: actions.length > 0 ? actions : undefined, startDate, endDate, actorEmail }),
    [page, pageSize, actions.join(','), startDate, endDate, actorEmail],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => getAuditLog(filters),
    placeholderData: keepPreviousData,
  });

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleActionsChange = (values: string[]) => {
    updateParams({ actions: values.length > 0 ? values.join(',') : undefined });
  };

  const handleDateChange = (_: unknown, dates: [string, string]) => {
    updateParams({ startDate: dates[0] || undefined, endDate: dates[1] || undefined });
  };

  const handleActorSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateParams({ actorEmail: value || undefined });
    }, 300);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      next.set('pageSize', String(newPageSize));
      return next;
    });
  };

  const columns: ColumnsType<AuditEvent> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Actor',
      key: 'actor',
      width: 200,
      render: (_, record) =>
        record.actorName ? `${record.actorName} (${record.actorEmail})` : 'System',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (action: string) => (
        <Tag color={actionColorMap[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 200,
      render: (_, record) =>
        record.entityId ? `${record.entityType} / ${record.entityId}` : record.entityType,
    },
  ];

  const expandedRowRender = (record: AuditEvent) => (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
      {record.metadata ? JSON.stringify(record.metadata, null, 2) : 'No metadata'}
    </pre>
  );

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Audit Log</h2>

      <Space wrap style={{ marginBottom: 16, width: '100%' }}>
        <Select
          mode="multiple"
          placeholder="Filter by action"
          style={{ minWidth: 250 }}
          value={actions}
          onChange={handleActionsChange}
          options={ACTION_OPTIONS.map((a) => ({ label: a, value: a }))}
          allowClear
        />

        <RangePicker
          value={
            startDate && endDate
              ? [dayjs(startDate), dayjs(endDate)]
              : undefined
          }
          onChange={handleDateChange}
        />

        <Input
          placeholder="Search by actor email"
          defaultValue={actorEmail}
          onChange={handleActorSearch}
          style={{ width: 220 }}
          allowClear
        />
      </Space>

      {isError && (
        <Alert
          type="error"
          title="Failed to load audit log"
          description="An error occurred while fetching audit events. Please try again."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<AuditEvent>
        columns={columns}
        dataSource={data?.data ?? []}
        rowKey="id"
        loading={isLoading}
        expandable={{ expandedRowRender }}
        locale={{ emptyText: <Empty description="No audit events found" /> }}
        pagination={{
          current: page,
          pageSize,
          total: data?.meta.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          onChange: handlePageChange,
        }}
      />
    </div>
  );
}

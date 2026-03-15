import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Typography, Table, Select, Space, Empty, Button, Modal, message, Input } from 'antd';
import { FilePdfOutlined, ShareAltOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getEmployeeDashboard,
  type EmployeeDashboardItem,
  type EmployeeDashboardFilters,
} from '../../services/dashboards.api';
import { employeeKeys, resignEmployee } from '../../services/employees.api';
import type { Employee } from '../../services/employees.api';
import { exportPdf } from '../../services/reports.api';
import { createShareUrl } from '../../services/share.api';
import ShareLinkModal from '../../components/ShareLinkModal';
import { useAuth } from '../../hooks/useAuth';
import EmployeeFormModal from '../employees/EmployeeFormModal';

const { Title } = Typography;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export default function EmployeeDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; expiresAt: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN';
  const isHR = user?.role === 'HR';
  const canCrud = user?.role === 'ADMIN' || user?.role === 'HR';

  const filters: EmployeeDashboardFilters = {
    department: searchParams.get('department') || undefined,
    designation: searchParams.get('designation') || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.employees(filters),
    queryFn: () => getEmployeeDashboard(filters),
    staleTime: 2 * 60 * 1000,
  });

  const allRows = data?.data ?? [];
  const [searchText, setSearchText] = useState('');

  const rows = useMemo(() => {
    if (!searchText.trim()) return allRows;
    const query = searchText.toLowerCase();
    return allRows.filter((r) => r.name.toLowerCase().includes(query));
  }, [allRows, searchText]);

  const departmentOptions = useMemo(() => {
    const depts = [...new Set(allRows.map((r) => r.department).filter(Boolean))];
    return depts.sort().map((d) => ({ label: d, value: d }));
  }, [allRows]);

  const designationOptions = useMemo(() => {
    const desigs = [...new Set(allRows.map((r) => r.designation).filter(Boolean))];
    return desigs.sort().map((d) => ({ label: d, value: d }));
  }, [allRows]);

  function updateFilter(key: string, value: string | undefined) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  const resignMutation = useMutation({
    mutationFn: resignEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      message.success('Employee marked as resigned');
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to resign employee');
    },
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const openEditModal = (record: EmployeeDashboardItem) => {
    // Build a minimal Employee object from dashboard data for the modal
    setEditingEmployee({
      id: record.employeeId,
      employeeCode: '',
      name: record.name,
      designation: record.designation,
      departmentId: '',
      isBillable: true,
      isResigned: false,
      annualCtcPaise: undefined,
      joiningDate: null,
      createdAt: '',
      updatedAt: '',
    } as Employee);
    setModalOpen(true);
  };

  const confirmResign = (record: EmployeeDashboardItem) => {
    Modal.confirm({
      title: `Mark ${record.name} as resigned? This cannot be undone.`,
      okText: 'Yes',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => resignMutation.mutateAsync(record.employeeId),
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmployee(null);
  };

  const financialColumnKeys = new Set(['profitabilityRank', 'revenueContributionPaise', 'totalCostPaise', 'profitContributionPaise', 'marginPercent']);

  // Compute top 5 / bottom 5 thresholds for rank highlighting
  const totalBillableCount = useMemo(() => {
    return rows.filter((r) => r.profitabilityRank > 0).length;
  }, [rows]);

  const allColumns: ColumnsType<EmployeeDashboardItem> = [
    {
      title: 'Rank',
      dataIndex: 'profitabilityRank',
      key: 'profitabilityRank',
      width: 70,
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.profitabilityRank - b.profitabilityRank,
      render: (rank: number) => {
        if (rank === 0) return <span style={{ color: '#999' }}>—</span>;
        const isTop5 = rank <= 5;
        const isBottom5 = totalBillableCount > 5 && rank > totalBillableCount - 5;
        const color = isTop5 ? '#52c41a' : isBottom5 ? '#ff4d4f' : undefined;
        const fontWeight = (isTop5 || isBottom5) ? 700 : undefined;
        return <span style={{ color, fontWeight }}>#{rank}</span>;
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <a
          href={`/dashboards/employees/${record.employeeId}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/dashboards/employees/${record.employeeId}`);
          }}
        >
          {name}
        </a>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Billable Utilisation',
      dataIndex: 'billableUtilisationPercent',
      key: 'billableUtilisationPercent',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.billableUtilisationPercent - b.billableUtilisationPercent,
      render: (val: number) => (
        <span
          data-testid={val < 0.5 ? 'under-utilisation' : undefined}
          style={{ color: val < 0.5 ? '#d48806' : undefined }}
        >
          {formatPercent(val)}
        </span>
      ),
    },
    {
      title: 'Revenue Contribution',
      dataIndex: 'revenueContributionPaise',
      key: 'revenueContributionPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.revenueContributionPaise - b.revenueContributionPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Cost',
      dataIndex: 'totalCostPaise',
      key: 'totalCostPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.totalCostPaise - b.totalCostPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Profit Contribution',
      dataIndex: 'profitContributionPaise',
      key: 'profitContributionPaise',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.profitContributionPaise - b.profitContributionPaise,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Margin %',
      dataIndex: 'marginPercent',
      key: 'marginPercent',
      align: 'right',
      className: 'tabular-nums',
      sorter: (a, b) => a.marginPercent - b.marginPercent,
      render: (val: number) => formatPercent(val),
    },
  ];

  // Add actions column for ADMIN and HR
  if (canCrud) {
    allColumns.push({
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space className="row-actions">
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => confirmResign(record)}>
            Mark as Resigned
          </Button>
        </Space>
      ),
    });
  }

  const columns = isHR
    ? allColumns.filter((col) => !financialColumnKeys.has(col.key as string))
    : allColumns;

  return (
    <div data-testid="employee-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Employees</Title>
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
                  const result = await createShareUrl({ reportType: 'employee', entityId: NIL_UUID, period });
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
          {canCrud && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              Add Employee
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
                await exportPdf({ reportType: 'employee', entityId: NIL_UUID, period });
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

      <div data-testid="filter-bar" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search by name"
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            data-testid="employee-search"
          />
          <div data-testid="filter-department">
            <Select
              placeholder="Department"
              allowClear
              style={{ width: 180 }}
              options={departmentOptions}
              value={filters.department}
              onChange={(val) => updateFilter('department', val)}
            />
          </div>
          <div data-testid="filter-designation">
            <Select
              placeholder="Designation"
              allowClear
              style={{ width: 200 }}
              options={designationOptions}
              value={filters.designation}
              onChange={(val) => updateFilter('designation', val)}
            />
          </div>
        </Space>
      </div>

      <style>{`
        .loss-row { background-color: #FFF2F0 !important; }
        .tabular-nums { font-feature-settings: 'tnum'; }
      `}</style>

      <Table<EmployeeDashboardItem>
        className="employee-dashboard-table"
        data-testid="employee-dashboard-table"
        rowKey="employeeId"
        columns={columns}
        dataSource={rows}
        loading={isLoading}
        size="small"
        pagination={false}
        rowClassName={(record) => (!isHR && record.profitContributionPaise < 0 ? 'loss-row' : '')}
        locale={{ emptyText: <Empty description="No employee data available" /> }}
      />

      {canCrud && (
        <EmployeeFormModal
          open={modalOpen}
          editingEmployee={editingEmployee}
          onClose={closeModal}
        />
      )}
      <ShareLinkModal open={!!shareData} shareUrl={shareData?.url ?? ''} expiresAt={shareData?.expiresAt} onClose={() => setShareData(null)} />
    </div>
  );
}

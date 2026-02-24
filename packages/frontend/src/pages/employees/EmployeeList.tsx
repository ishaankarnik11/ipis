import { useState, useRef, useEffect, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Empty, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { employeeKeys, getEmployees, resignEmployee } from '../../services/employees.api';
import type { Employee } from '../../services/employees.api';
import { userKeys, getDepartments } from '../../services/users.api';
import type { Department } from '../../services/users.api';
import { useAuth } from '../../hooks/useAuth';
import EmployeeFormModal from './EmployeeFormModal';

export default function EmployeeList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const { data, isLoading } = useQuery({
    queryKey: employeeKeys.all,
    queryFn: getEmployees,
  });

  const { data: deptData } = useQuery({
    queryKey: userKeys.departments,
    queryFn: getDepartments,
  });

  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    const departments: Department[] = deptData?.data ?? [];
    for (const d of departments) {
      map.set(d.id, d.name);
    }
    return map;
  }, [deptData]);

  const resignMutation = useMutation({
    mutationFn: resignEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
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

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  const confirmResign = (employee: Employee) => {
    Modal.confirm({
      title: `Mark ${employee.name} as resigned? This cannot be undone.`,
      okText: 'Yes',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => resignMutation.mutateAsync(employee.id),
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const employees = data?.data ?? [];
  const showCtc = user?.role === 'FINANCE' || user?.role === 'ADMIN';

  const filteredEmployees = useMemo(() => {
    if (!debouncedSearch) return employees;
    const term = debouncedSearch.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.employeeCode.toLowerCase().includes(term) ||
        emp.name.toLowerCase().includes(term),
    );
  }, [employees, debouncedSearch]);

  const columns: ColumnsType<Employee> = [
    { title: 'Employee Code', dataIndex: 'employeeCode', key: 'employeeCode' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    {
      title: 'Department',
      dataIndex: 'departmentId',
      key: 'department',
      render: (departmentId: string) => deptMap.get(departmentId) ?? departmentId,
    },
    {
      title: 'Billable',
      dataIndex: 'isBillable',
      key: 'billable',
      render: (billable: boolean) => (billable ? 'Yes' : 'No'),
    },
    {
      title: 'Status',
      dataIndex: 'isResigned',
      key: 'status',
      render: (isResigned: boolean) => (
        <Tag color={isResigned ? 'red' : 'green'}>{isResigned ? 'Resigned' : 'Active'}</Tag>
      ),
    },
  ];

  if (showCtc) {
    columns.splice(5, 0, {
      title: 'Annual CTC',
      dataIndex: 'annualCtcPaise',
      key: 'annualCtc',
      align: 'right',
      render: (paise: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(paise)}
        </span>
      ),
    });
  }

  columns.push({
    title: 'Actions',
    key: 'actions',
    render: (_, record) =>
      record.isResigned ? null : (
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Employees</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add Employee
        </Button>
      </div>

      <Input
        placeholder="Search by Employee Code or Name"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={handleSearchChange}
        style={{ marginBottom: 16, maxWidth: 360 }}
        allowClear
      />

      <style>{`
        .employee-table .ant-table-row .row-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .employee-table .ant-table-row:hover .row-actions {
          opacity: 1;
        }
      `}</style>

      <Table<Employee>
        className="employee-table"
        size="small"
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No employees found" /> }}
        pagination={false}
      />

      <EmployeeFormModal
        open={modalOpen}
        editingEmployee={editingEmployee}
        onClose={closeModal}
      />
    </div>
  );
}

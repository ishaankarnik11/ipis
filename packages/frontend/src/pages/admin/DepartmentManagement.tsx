import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Space, Popconfirm, Empty, Modal, Form, Input, Select, Alert, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  departmentKeys,
  getDepartmentsDetailed,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
} from '../../services/departments.api';
import type { DepartmentDetail } from '../../services/departments.api';
import { userKeys, getUsers } from '../../services/users.api';
import type { User } from '../../services/users.api';

export default function DepartmentManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDetail | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: departmentKeys.all,
    queryFn: getDepartmentsDetailed,
  });

  const { data: usersData } = useQuery({
    queryKey: userKeys.all,
    queryFn: getUsers,
  });

  const deptHeadUsers = (usersData?.data ?? []).filter(
    (u: User) => u.role === 'DEPT_HEAD' && u.status === 'ACTIVE',
  );

  const deptHeadMap = new Map(deptHeadUsers.map((u: User) => [u.id, u.name]));

  const deactivateMutation = useMutation({
    mutationFn: deactivateDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.departments });
      message.success('Department deactivated successfully');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to deactivate department');
    },
  });

  const openAddModal = () => {
    setEditingDept(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: DepartmentDetail) => {
    setEditingDept(dept);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDept(null);
  };

  const departments = data?.data ?? [];

  const columns: ColumnsType<DepartmentDetail> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Department Head',
      dataIndex: 'headUserId',
      key: 'head',
      render: (headUserId: string | null) => headUserId ? deptHeadMap.get(headUserId) ?? '—' : '—',
    },
    { title: 'Employees', dataIndex: 'employeeCount', key: 'employeeCount', width: 100 },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space className="row-actions">
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          {record.isActive && (
            <Popconfirm
              title={
                record.employeeCount > 0
                  ? `This department has ${record.employeeCount} active employee${record.employeeCount === 1 ? '' : 's'}. Reassign them first.`
                  : `Are you sure you want to deactivate "${record.name}"?`
              }
              onConfirm={() => deactivateMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true, disabled: record.employeeCount > 0 }}
            >
              <Button size="small" danger>
                Deactivate
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Department Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add Department
        </Button>
      </div>

      <Table<DepartmentDetail>
        className="department-table"
        columns={columns}
        dataSource={departments}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No departments found" /> }}
        pagination={false}
      />

      <DepartmentFormModal
        open={modalOpen}
        editingDept={editingDept}
        deptHeadUsers={deptHeadUsers}
        onClose={closeModal}
      />
    </div>
  );
}

interface DepartmentFormModalProps {
  open: boolean;
  editingDept: DepartmentDetail | null;
  deptHeadUsers: User[];
  onClose: () => void;
}

function DepartmentFormModal({ open, editingDept, deptHeadUsers, onClose }: DepartmentFormModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!editingDept;

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.departments });
      message.success(`Department "${variables.name}" created successfully`);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateDepartment>[1] }) =>
      updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.departments });
      message.success('Department updated successfully');
      onClose();
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const resetMutations = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
  }, [createMutation.reset, updateMutation.reset]);

  useEffect(() => {
    if (open) {
      if (editingDept) {
        form.setFieldsValue({
          name: editingDept.name,
          headUserId: editingDept.headUserId,
        });
      } else {
        form.resetFields();
      }
      resetMutations();
    }
  }, [open, editingDept, form, resetMutations]);

  const handleSubmit = (values: { name: string; headUserId?: string | null }) => {
    if (isEditing) {
      updateMutation.mutate({
        id: editingDept.id,
        data: { name: values.name, headUserId: values.headUserId ?? null },
      });
    } else {
      createMutation.mutate({
        name: values.name,
        headUserId: values.headUserId ?? null,
      });
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Department' : 'Add Department'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {mutation.isError && (
        <Alert
          type="error"
          message={
            mutation.error instanceof Error
              ? mutation.error.message
              : 'An error occurred'
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        validateTrigger="onBlur"
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Department name is required' }]}
        >
          <Input placeholder="Enter department name" />
        </Form.Item>

        <Form.Item label="Department Head" name="headUserId">
          <Select
            placeholder="Select department head"
            allowClear
            options={deptHeadUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            block
          >
            {isEditing ? 'Save Changes' : 'Create Department'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

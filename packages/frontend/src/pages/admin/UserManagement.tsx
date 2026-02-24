import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { userKeys, getUsers, updateUser } from '../../services/users.api';
import type { User } from '../../services/users.api';
import UserFormModal from './UserFormModal';
import { roleLabels } from './constants';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: userKeys.all,
    queryFn: getUsers,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all] });
      message.success('User status updated successfully');
    },
  });

  const openAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const confirmToggleActive = (user: User) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    Modal.confirm({
      title: `Are you sure you want to ${action} ${user.name}?`,
      okText: 'Yes',
      cancelText: 'No',
      okButtonProps: { danger: user.isActive },
      onOk: () => toggleActiveMutation.mutateAsync({ id: user.id, isActive: !user.isActive }),
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const users = data?.data ?? [];

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => roleLabels[role],
    },
    { title: 'Department', dataIndex: 'departmentName', key: 'department' },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space className="row-actions">
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button
            size="small"
            danger={record.isActive}
            onClick={() => confirmToggleActive(record)}
          >
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>User Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Add User
        </Button>
      </div>

      <style>{`
        .user-table .ant-table-row .row-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .user-table .ant-table-row:hover .row-actions {
          opacity: 1;
        }
      `}</style>

      <Table<User>
        className="user-table"
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No users found" /> }}
        pagination={false}
      />

      <UserFormModal
        open={modalOpen}
        editingUser={editingUser}
        onClose={closeModal}
      />
    </div>
  );
}

import { useState } from 'react';
import { Table, Button, Tag, Space, Popconfirm, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { userKeys, getUsers, updateUser, resendInvitation } from '../../services/users.api';
import type { User } from '../../services/users.api';
import { useAuth } from '../../hooks/useAuth';
import UserFormModal from './UserFormModal';
import { roleLabels } from './constants';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: userKeys.all,
    queryFn: getUsers,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'DEACTIVATED' | 'INVITED' }) =>
      updateUser(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all] });
      message.success('User status updated successfully');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to update user status');
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

  const resendMutation = useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all] });
      message.success('Invitation resent');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to resend invitation');
    },
  });

  const handleDeactivate = (user: User) => {
    toggleActiveMutation.mutate({ id: user.id, status: 'DEACTIVATED' });
  };

  const handleReactivate = (user: User) => {
    if (user.name) {
      toggleActiveMutation.mutate({ id: user.id, status: 'ACTIVE' });
    } else {
      // User never completed profile — re-invite
      toggleActiveMutation.mutate({ id: user.id, status: 'INVITED' });
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const users = data?.data ?? [];

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string | null) => name ?? <span style={{ color: '#999', fontStyle: 'italic' }}>Pending setup</span> },
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
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'ACTIVE' ? 'green' : status === 'INVITED' ? 'blue' : 'red';
        const label = status === 'ACTIVE' ? 'Active' : status === 'INVITED' ? 'Invited' : 'Deactivated';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isSelf = currentUser?.id === record.id;

        return (
          <Space className="row-actions">
            {record.status === 'INVITED' && (
              <Button size="small" onClick={() => resendMutation.mutate(record.id)}>
                Resend Invitation
              </Button>
            )}
            {record.status === 'ACTIVE' && (
              <Button size="small" onClick={() => openEditModal(record)}>
                Edit
              </Button>
            )}
            {(record.status === 'ACTIVE' || record.status === 'INVITED') && !isSelf && (
              <Popconfirm
                title={`Deactivate ${record.name ?? record.email}? They will no longer be able to log in.`}
                onConfirm={() => handleDeactivate(record)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger>
                  Deactivate
                </Button>
              </Popconfirm>
            )}
            {record.status === 'DEACTIVATED' && (
              <Button size="small" onClick={() => handleReactivate(record)}>
                Reactivate
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>User Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Invite User
        </Button>
      </div>

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

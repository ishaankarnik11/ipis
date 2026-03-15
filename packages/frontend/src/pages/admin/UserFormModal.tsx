import { useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, Button, Alert, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@ipis/shared';
import { userKeys, createUser, updateUser, getDepartments } from '../../services/users.api';
import type { User } from '../../services/users.api';
import { roleLabels } from './constants';

const roleOptions = (Object.entries(roleLabels) as [UserRole, string][]).map(([value, label]) => ({
  value,
  label,
}));

interface UserFormModalProps {
  open: boolean;
  editingUser: User | null;
  onClose: () => void;
}

export default function UserFormModal({ open, editingUser, onClose }: UserFormModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!editingUser;

  // Only fetch departments when editing (for department dropdown)
  const { data: deptData } = useQuery({
    queryKey: userKeys.departments,
    queryFn: getDepartments,
    enabled: open && isEditing,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all] });
      message.success(`Invitation sent to ${variables.email}`);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...userKeys.all] });
      message.success('User updated successfully');
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
      if (editingUser) {
        form.setFieldsValue({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          departmentId: editingUser.departmentId,
        });
      } else {
        form.resetFields();
      }
      resetMutations();
    }
  }, [open, editingUser, form, resetMutations]);

  const handleSubmit = async (values: {
    name?: string;
    email: string;
    role: UserRole;
    departmentId?: string | null;
  }) => {
    if (isEditing) {
      updateMutation.mutate({
        id: editingUser.id,
        data: { name: values.name, role: values.role, departmentId: values.departmentId ?? null },
      });
    } else {
      createMutation.mutate({
        email: values.email,
        role: values.role,
      });
    }
  };

  const departments = deptData?.data ?? [];

  return (
    <Modal
      title={isEditing ? 'Edit User' : 'Invite User'}
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
        {isEditing && (
          <Form.Item
            label="Name"
            name="name"
          >
            <Input placeholder="Enter name" />
          </Form.Item>
        )}

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="Enter email" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Select placeholder="Select role" options={roleOptions} />
        </Form.Item>

        {isEditing && (
          <Form.Item label="Department" name="departmentId">
            <Select
              placeholder="Select department"
              allowClear
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            block
          >
            {isEditing ? 'Save Changes' : 'Send Invitation'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

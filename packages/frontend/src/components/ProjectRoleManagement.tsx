import { useState } from 'react';
import { List, Tag, Switch, Input, Button, Alert, Spin, Card } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectRoleKeys,
  getProjectRoles,
  createProjectRole,
  updateProjectRole,
} from '../services/project-roles.api';
import type { ProjectRole } from '../services/project-roles.api';
import { ApiError } from '../services/api';

export default function ProjectRoleManagement() {
  const queryClient = useQueryClient();
  const [newRoleName, setNewRoleName] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: projectRoleKeys.all,
    queryFn: getProjectRoles,
  });

  const createMutation = useMutation({
    mutationFn: createProjectRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...projectRoleKeys.all] });
      setNewRoleName('');
      setTouched(false);
      setError(null);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 409) {
        setError('A role with this name already exists');
      } else {
        setError('Failed to create role');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateProjectRole(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...projectRoleKeys.all] });
    },
  });

  const handleAddRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    setError(null);
    createMutation.mutate({ name: trimmed });
  };

  const handleToggle = (role: ProjectRole) => {
    updateMutation.mutate({ id: role.id, isActive: !role.isActive });
  };

  const roles = data?.data ?? [];
  const isInputEmpty = newRoleName.trim().length === 0;

  if (isLoading) {
    return (
      <Card title="Project Roles" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Project Roles" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="Enter role name"
          value={newRoleName}
          onChange={(e) => {
            setNewRoleName(e.target.value);
            setTouched(true);
            if (error) setError(null);
          }}
          onPressEnter={handleAddRole}
          style={{ maxWidth: 300 }}
          status={touched && isInputEmpty ? 'error' : undefined}
        />
        <Button
          type="primary"
          onClick={handleAddRole}
          loading={createMutation.isPending}
          disabled={isInputEmpty}
        >
          Add Role
        </Button>
      </div>

      {touched && isInputEmpty && (
        <Alert
          message="Role name is required"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <List
        dataSource={roles}
        renderItem={(role: ProjectRole) => (
          <List.Item
            actions={[
              <Switch
                key="toggle"
                checked={role.isActive}
                onChange={() => handleToggle(role)}
                loading={updateMutation.isPending && updateMutation.variables?.id === role.id}
              />,
            ]}
          >
            <List.Item.Meta
              title={role.name}
              description={
                <Tag color={role.isActive ? 'green' : 'default'}>
                  {role.isActive ? 'Active' : 'Inactive'}
                </Tag>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

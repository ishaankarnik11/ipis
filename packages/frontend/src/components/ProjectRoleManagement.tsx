import { useState } from 'react';
import { List, Tag, Switch, Input, Button, Alert, Spin, Card } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  designationKeys,
  getDesignations,
  createDesignation,
  updateDesignation,
} from '../services/designations.api';
import type { Designation } from '../services/designations.api';
import { ApiError } from '../services/api';

export default function ProjectRoleManagement() {
  const queryClient = useQueryClient();
  const [newDesignationName, setNewDesignationName] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: designationKeys.all,
    queryFn: getDesignations,
  });

  const createMutation = useMutation({
    mutationFn: createDesignation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...designationKeys.all] });
      setNewDesignationName('');
      setTouched(false);
      setError(null);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 409) {
        setError('A designation with this name already exists');
      } else {
        setError('Failed to create designation');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateDesignation(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...designationKeys.all] });
    },
  });

  const handleAddDesignation = () => {
    const trimmed = newDesignationName.trim();
    if (!trimmed) return;
    setError(null);
    createMutation.mutate({ name: trimmed });
  };

  const handleToggle = (designation: Designation) => {
    updateMutation.mutate({ id: designation.id, isActive: !designation.isActive });
  };

  const designations = data?.data ?? [];
  const isInputEmpty = newDesignationName.trim().length === 0;

  if (isLoading) {
    return (
      <Card title="Designations" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Designations" style={{ marginTop: 24 }}>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
        Designations define the available designations when assigning employees to projects.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="Enter designation name"
          value={newDesignationName}
          onChange={(e) => {
            setNewDesignationName(e.target.value);
            setTouched(true);
            if (error) setError(null);
          }}
          onPressEnter={handleAddDesignation}
          style={{ maxWidth: 300 }}
          status={touched && isInputEmpty ? 'error' : undefined}
        />
        <Button
          type="primary"
          onClick={handleAddDesignation}
          loading={createMutation.isPending}
          disabled={isInputEmpty}
        >
          Add Designation
        </Button>
      </div>

      {touched && isInputEmpty && (
        <Alert
          message="Designation name is required"
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
        dataSource={designations}
        renderItem={(designation: Designation) => (
          <List.Item
            actions={[
              <Switch
                key="toggle"
                checked={designation.isActive}
                onChange={() => handleToggle(designation)}
                loading={updateMutation.isPending && updateMutation.variables?.id === designation.id}
              />,
            ]}
          >
            <List.Item.Meta
              title={designation.name}
              description={
                <Tag color={designation.isActive ? 'green' : 'default'}>
                  {designation.isActive ? 'Active' : 'Inactive'}
                </Tag>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

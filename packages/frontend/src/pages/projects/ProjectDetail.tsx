import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Button, Alert, Spin, Descriptions, Breadcrumb, Table, InputNumber, Popconfirm, message } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatCurrency } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { projectKeys, getProject, getTeamMembers, addTeamMember, removeTeamMember, updateProject, engagementModelLabels } from '../../services/projects.api';
import type { TeamMember } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import AddTeamMemberModal from '../../components/AddTeamMemberModal';
import ProjectFinancialSummary from '../../components/ProjectFinancialSummary';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { ApiError } from '../../services/api';

const { Title } = Typography;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: projectKeys.teamMembers(id!),
    queryFn: () => getTeamMembers(id!),
    enabled: !!id,
  });

  const project = data?.data;
  const teamMembers = teamData?.data ?? [];

  const canManageTeam =
    project?.status === 'ACTIVE' &&
    (user?.role === 'ADMIN' || (user?.role === 'DELIVERY_MANAGER' && user?.id === project?.deliveryManagerId));

  const addMutation = useMutation({
    mutationFn: (data: { employeeId: string; roleId: string; billingRatePaise?: number }) =>
      addTeamMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.teamMembers(id!) });
      message.success('Team member added');
      setAddModalOpen(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (employeeId: string) => removeTeamMember(id!, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.teamMembers(id!) });
      message.success('Team member removed');
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : 'Failed to remove team member');
    },
  });

  const handleAddSubmit = async (data: { employeeId: string; roleId: string; billingRatePaise?: number }) => {
    try {
      await addMutation.mutateAsync(data);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.error.message);
      }
      throw err;
    }
  };

  const isFixedCost = project?.engagementModel === 'FIXED_COST';
  const isTm = project?.engagementModel === 'TIME_AND_MATERIALS';
  const canEditCompletion =
    isFixedCost && (user?.role === 'FINANCE' || (user?.role === 'DELIVERY_MANAGER' && user?.id === project?.deliveryManagerId));

  const [completionValue, setCompletionValue] = useState<number | null>(null);
  useEffect(() => {
    if (project?.completionPercent != null) {
      setCompletionValue(Math.round(project.completionPercent * 100));
    } else {
      setCompletionValue(null);
    }
  }, [project?.completionPercent]);

  const completionMutation = useMutation({
    mutationFn: (percent: number) =>
      updateProject(id!, { completionPercent: percent / 100 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id!) });
      message.success('Completion percentage updated');
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : 'Failed to update completion');
    },
  });

  const handleCompletionSave = () => {
    if (completionValue != null && completionValue >= 0 && completionValue <= 100) {
      completionMutation.mutate(completionValue);
    }
  };

  const teamColumns: ColumnsType<TeamMember> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Role', dataIndex: 'roleName', key: 'roleName' },
    {
      title: 'Selling Rate (₹/hr)',
      dataIndex: 'billingRatePaise',
      key: 'billingRate',
      align: 'right',
      render: (paise: number | null) =>
        paise != null ? (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(paise)}</span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Joined Date',
      dataIndex: 'assignedAt',
      key: 'joinedDate',
      render: (date: string) => (date ? date.slice(0, 10) : '—'),
    },
    ...(canManageTeam
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: TeamMember) => (
              <Popconfirm
                title="Remove this team member?"
                onConfirm={() => removeMutation.mutate(record.employeeId)}
                okText="Remove"
                cancelText="Cancel"
              >
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  loading={removeMutation.isPending}
                >
                  Remove
                </Button>
              </Popconfirm>
            ),
          } as ColumnsType<TeamMember>[number],
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !project) {
    return <Alert type="error" title="Failed to load project" showIcon />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/projects">Projects</Link> },
          { title: project.name },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{project.name}</Title>
          <ProjectStatusBadge status={project.status} />
        </Space>
        {project.status === 'REJECTED' && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/projects/${project.id}/edit`)}
          >
            Edit & Resubmit
          </Button>
        )}
      </div>

      {project.rejectionComment && (
        <Alert
          type="error"
          title="Rejection Reason"
          description={project.rejectionComment}
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      <Descriptions bordered column={2}>
        <Descriptions.Item label="Client">{project.client}</Descriptions.Item>
        <Descriptions.Item label="Vertical">{project.vertical}</Descriptions.Item>
        <Descriptions.Item label="Engagement Model">
          {engagementModelLabels[project.engagementModel] ?? project.engagementModel}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <ProjectStatusBadge status={project.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Start Date">{project.startDate.slice(0, 10)}</Descriptions.Item>
        <Descriptions.Item label="End Date">{project.endDate.slice(0, 10)}</Descriptions.Item>
        {project.contractValuePaise != null && (
          <Descriptions.Item label="Contract Value">
            {formatCurrency(project.contractValuePaise)}
          </Descriptions.Item>
        )}
      </Descriptions>

      {isFixedCost && canEditCompletion && (
        <div data-testid="completion-section" style={{ marginTop: 24 }}>
          <Title level={5}>% Completion</Title>
          <Space>
            <InputNumber
              min={0}
              max={100}
              value={completionValue}
              onChange={(val) => setCompletionValue(val)}
              addonAfter="%"
              style={{ width: 140 }}
              data-testid="completion-input"
            />
            <Button
              type="primary"
              onClick={handleCompletionSave}
              loading={completionMutation.isPending}
              disabled={completionValue == null || completionValue < 0 || completionValue > 100}
            >
              Save
            </Button>
          </Space>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <ProjectFinancialSummary financials={project.financials} />
      </div>

      <div data-testid="team-roster-section" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>Team Roster</Title>
          {canManageTeam && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              Add Team Member
            </Button>
          )}
        </div>
        <Table<TeamMember>
          size="small"
          columns={teamColumns}
          dataSource={teamMembers}
          rowKey="employeeId"
          loading={teamLoading}
          locale={{ emptyText: 'No team members assigned' }}
          pagination={false}
        />
      </div>

      {canManageTeam && (
        <AddTeamMemberModal
          open={addModalOpen}
          onCancel={() => setAddModalOpen(false)}
          onSubmit={handleAddSubmit}
          existingMemberIds={teamMembers.map((m) => m.employeeId)}
          isTm={isTm}
          loading={addMutation.isPending}
        />
      )}
    </div>
  );
}

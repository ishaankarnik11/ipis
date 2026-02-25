import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Button, Alert, Spin, Descriptions, Breadcrumb, Table, InputNumber, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { formatCurrency } from '@ipis/shared';
import type { ColumnsType } from 'antd/es/table';
import { projectKeys, getProject, getTeamMembers, updateProject, engagementModelLabels } from '../../services/projects.api';
import type { TeamMember } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

const { Title } = Typography;

const teamColumns: ColumnsType<TeamMember> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Designation', dataIndex: 'designation', key: 'designation' },
  { title: 'Role', dataIndex: 'role', key: 'role' },
  {
    title: 'Billing Rate',
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
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const isFixedCost = project?.engagementModel === 'FIXED_COST';
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

      <div data-testid="team-roster-section" style={{ marginTop: 24 }}>
        <Title level={5}>Team Roster</Title>
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
    </div>
  );
}

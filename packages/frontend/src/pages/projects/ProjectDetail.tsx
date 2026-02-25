import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Typography, Space, Button, Alert, Spin, Descriptions } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { formatCurrency } from '@ipis/shared';
import { projectKeys, getProject } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';

const { Title } = Typography;

const engagementModelLabels: Record<string, string> = {
  TIME_AND_MATERIALS: 'Time & Materials',
  FIXED_COST: 'Fixed Cost',
  AMC: 'AMC',
  INFRASTRUCTURE: 'Infrastructure',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const project = data?.data;

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
            Edit &amp; Resubmit
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
    </div>
  );
}

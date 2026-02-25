import { useNavigate } from 'react-router';
import { Table, Empty, Button, Space, Tooltip, Typography, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { projectKeys, getProjects, engagementModelLabels } from '../../services/projects.api';
import type { Project } from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';
import { useAuth } from '../../hooks/useAuth';

export default function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: projectKeys.all,
    queryFn: getProjects,
  });

  const projects = data?.data ?? [];
  const showDMColumn = user?.role === 'ADMIN' || user?.role === 'FINANCE';

  const columns: ColumnsType<Project> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    {
      title: 'Engagement Model',
      dataIndex: 'engagementModel',
      key: 'engagementModel',
      render: (model: string) => engagementModelLabels[model] ?? model,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Project['status'], record: Project) => (
        <Space direction="vertical" size={0}>
          <ProjectStatusBadge status={status} />
          {status === 'REJECTED' && record.rejectionComment && (
            <Tooltip title={record.rejectionComment}>
              <Typography.Link style={{ fontSize: 12 }}>View Rejection Reason</Typography.Link>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (d: string) => d?.slice(0, 10) },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (d: string) => d?.slice(0, 10) },
  ];

  if (showDMColumn) {
    columns.splice(3, 0, {
      title: 'Delivery Manager',
      dataIndex: 'deliveryManagerName',
      key: 'deliveryManager',
    });
  }

  if (error) {
    return <Alert type="error" title="Failed to load projects" showIcon />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        {user?.role === 'DELIVERY_MANAGER' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>
            Create Project
          </Button>
        )}
      </div>

      <Table<Project>
        size="small"
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="No projects found" /> }}
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/projects/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
}

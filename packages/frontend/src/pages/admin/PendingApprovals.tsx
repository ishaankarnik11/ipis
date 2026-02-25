import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, notification } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  projectKeys,
  getProjects,
  approveProject,
  rejectProject,
  engagementModelLabels,
} from '../../services/projects.api';
import type { Project } from '../../services/projects.api';

export default function PendingApprovals() {
  const queryClient = useQueryClient();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingProject, setRejectingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: projectKeys.all,
    queryFn: getProjects,
  });

  const pendingProjects = (data?.data ?? []).filter(
    (p) => p.status === 'PENDING_APPROVAL',
  );

  const approveMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => approveProject(id),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all] });
      notification.success({
        message: `Project ${name} approved`,
      });
    },
    onError: () => {
      notification.error({ message: 'Failed to approve project. Please try again.' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionComment }: { id: string; rejectionComment: string }) =>
      rejectProject(id, rejectionComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all] });
      notification.success({
        message: `Project ${rejectingProject?.name ?? ''} rejected`,
      });
      closeRejectModal();
    },
    onError: () => {
      notification.error({ message: 'Failed to reject project. Please try again.' });
    },
  });

  const openRejectModal = (project: Project) => {
    setRejectingProject(project);
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectingProject(null);
    form.resetFields();
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (rejectingProject) {
        rejectMutation.mutate({
          id: rejectingProject.id,
          rejectionComment: values.rejectionComment,
        });
      }
    } catch {
      // Validation failed — antd shows inline errors, nothing else to do
    }
  };

  const formatCurrency = (paise: number | null) => {
    if (paise == null) return '-';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns: ColumnsType<Project> = [
    { title: 'Project Name', dataIndex: 'name', key: 'name' },
    { title: 'Delivery Manager', dataIndex: 'deliveryManagerName', key: 'dm' },
    {
      title: 'Engagement Model',
      dataIndex: 'engagementModel',
      key: 'engagementModel',
      render: (model: string) => engagementModelLabels[model] ?? model,
    },
    {
      title: 'Contract Value',
      dataIndex: 'contractValuePaise',
      key: 'contractValue',
      render: formatCurrency,
    },
    {
      title: 'Submission Date',
      dataIndex: 'createdAt',
      key: 'submissionDate',
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => approveMutation.mutate({ id: record.id, name: record.name })}
            loading={approveMutation.isPending && approveMutation.variables?.id === record.id}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            size="small"
            onClick={() => openRejectModal(record)}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Pending Approvals</h2>

      <Table<Project>
        columns={columns}
        dataSource={pendingProjects}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={`Reject Project: ${rejectingProject?.name ?? ''}`}
        open={rejectModalOpen}
        onCancel={closeRejectModal}
        onOk={handleRejectSubmit}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: rejectMutation.isPending }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="rejectionComment"
            label="Rejection Comment"
            rules={[{ required: true, message: 'Rejection reason is required' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason for rejection..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

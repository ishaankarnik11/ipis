import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Alert,
  Typography,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { EngagementModel } from '../../services/projects.api';
import {
  projectKeys,
  getProject,
  createProject,
  updateProject,
  resubmitProject,
} from '../../services/projects.api';
import ProjectStatusBadge from '../../components/ProjectStatusBadge';

const { Title } = Typography;

interface TeamMemberField {
  role: string;
  billingRatePaise: number | null;
}

interface ProjectFormValues {
  name: string;
  client: string;
  vertical: string;
  engagementModel: EngagementModel;
  startDate: string;
  endDate: string;
  contractValuePaise: number | null;
  slaDescription: string;
  vendorCostsPaise: number | null;
  manpowerAllocation: string;
  budgetPaise: number | null;
  teamMembers: TeamMemberField[];
}

const engagementModelOptions: { label: string; value: EngagementModel }[] = [
  { label: 'Time & Materials', value: 'TIME_AND_MATERIALS' },
  { label: 'Fixed Cost', value: 'FIXED_COST' },
  { label: 'AMC', value: 'AMC' },
  { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
];

function paiseToCurrency(paise: number | null | undefined): number | null {
  if (paise == null) return null;
  return paise / 100;
}

function currencyToPaise(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

export default function CreateEditProject() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => getProject(id!),
    enabled: isEdit,
  });

  const project = projectData?.data;

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    defaultValues: {
      name: '',
      client: '',
      vertical: '',
      engagementModel: 'TIME_AND_MATERIALS',
      startDate: '',
      endDate: '',
      contractValuePaise: null,
      slaDescription: '',
      vendorCostsPaise: null,
      manpowerAllocation: '',
      budgetPaise: null,
      teamMembers: [{ role: '', billingRatePaise: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'teamMembers',
  });

  const engagementModel = watch('engagementModel');

  // Pre-populate form for edit mode
  useEffect(() => {
    if (project && isEdit) {
      reset({
        name: project.name,
        client: project.client,
        vertical: project.vertical,
        engagementModel: project.engagementModel,
        startDate: project.startDate,
        endDate: project.endDate,
        contractValuePaise: paiseToCurrency(project.contractValuePaise),
        slaDescription: '',
        vendorCostsPaise: null,
        manpowerAllocation: '',
        budgetPaise: null,
        teamMembers: [{ role: '', billingRatePaise: null }],
      });
    }
  }, [project, isEdit, reset]);

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all] });
      navigate(`/projects/${data.data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Parameters<typeof updateProject>[1] }) =>
      updateProject(projectId, data),
  });

  const resubmitMutation = useMutation({
    mutationFn: resubmitProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      }
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    const basePayload = {
      name: values.name,
      client: values.client,
      vertical: values.vertical,
      engagementModel: values.engagementModel,
      startDate: values.startDate,
      endDate: values.endDate,
    };

    if (isEdit && id) {
      // Edit & Resubmit flow: PATCH then resubmit (sequential — both must succeed)
      const updatePayload = {
        ...basePayload,
        contractValuePaise: currencyToPaise(values.contractValuePaise) ?? undefined,
      };
      try {
        await updateMutation.mutateAsync({ projectId: id, data: updatePayload });
        await resubmitMutation.mutateAsync(id);
        navigate(`/projects/${id}`);
      } catch {
        // Mutation error states handle display via mutationError; user can retry
      }
    } else {
      // Create flow
      let createPayload;
      switch (values.engagementModel) {
        case 'TIME_AND_MATERIALS':
          createPayload = {
            ...basePayload,
            engagementModel: 'TIME_AND_MATERIALS' as const,
            contractValuePaise: currencyToPaise(values.contractValuePaise) ?? undefined,
          };
          break;
        case 'FIXED_COST':
          createPayload = {
            ...basePayload,
            engagementModel: 'FIXED_COST' as const,
            contractValuePaise: currencyToPaise(values.contractValuePaise)!,
          };
          break;
        case 'AMC':
          createPayload = {
            ...basePayload,
            engagementModel: 'AMC' as const,
            contractValuePaise: currencyToPaise(values.contractValuePaise)!,
          };
          break;
        case 'INFRASTRUCTURE':
          createPayload = {
            ...basePayload,
            engagementModel: 'INFRASTRUCTURE' as const,
            contractValuePaise: currencyToPaise(values.contractValuePaise) ?? undefined,
          };
          break;
      }
      await createMutation.mutateAsync(createPayload);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || resubmitMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error || resubmitMutation.error;

  if (isEdit && isProjectLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={3}>{isEdit ? 'Edit & Resubmit Project' : 'Create New Project'}</Title>

      {isEdit && project && (
        <Alert
          type="warning"
          title={
            <Space>
              Current Status: <ProjectStatusBadge status={project.status} />
            </Space>
          }
          description={project.rejectionComment ? `Rejection Reason: ${project.rejectionComment}` : undefined}
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      {mutationError && (
        <Alert
          type="error"
          title="Submission Error"
          description={mutationError instanceof Error ? mutationError.message : 'An error occurred'}
          style={{ marginBottom: 24 }}
          showIcon
          closable
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Common Fields */}
        <Card title="Project Details" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="name">Project Name *</label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Project name is required' }}
                render={({ field }) => (
                  <Input id="name" {...field} status={errors.name ? 'error' : ''} />
                )}
              />
              {errors.name && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.name.message}</div>}
            </div>

            <div>
              <label htmlFor="client">Client *</label>
              <Controller
                name="client"
                control={control}
                rules={{ required: 'Client is required' }}
                render={({ field }) => (
                  <Input id="client" {...field} status={errors.client ? 'error' : ''} />
                )}
              />
              {errors.client && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.client.message}</div>}
            </div>

            <div>
              <label htmlFor="vertical">Vertical *</label>
              <Controller
                name="vertical"
                control={control}
                rules={{ required: 'Vertical is required' }}
                render={({ field }) => (
                  <Input id="vertical" {...field} status={errors.vertical ? 'error' : ''} />
                )}
              />
              {errors.vertical && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.vertical.message}</div>}
            </div>

            <div>
              <label htmlFor="engagementModel">Engagement Model *</label>
              <Controller
                name="engagementModel"
                control={control}
                rules={{ required: 'Engagement model is required' }}
                render={({ field }) => (
                  <Select
                    id="engagementModel"
                    {...field}
                    options={engagementModelOptions}
                    style={{ width: '100%' }}
                    status={errors.engagementModel ? 'error' : ''}
                  />
                )}
              />
            </div>

            <div>
              <label htmlFor="startDate">Start Date *</label>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Start date is required' }}
                render={({ field }) => (
                  <DatePicker
                    id="startDate"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.format('YYYY-MM-DD') : '')}
                    style={{ width: '100%' }}
                    status={errors.startDate ? 'error' : ''}
                  />
                )}
              />
              {errors.startDate && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.startDate.message}</div>}
            </div>

            <div>
              <label htmlFor="endDate">End Date *</label>
              <Controller
                name="endDate"
                control={control}
                rules={{ required: 'End date is required' }}
                render={({ field }) => (
                  <DatePicker
                    id="endDate"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.format('YYYY-MM-DD') : '')}
                    style={{ width: '100%' }}
                    status={errors.endDate ? 'error' : ''}
                  />
                )}
              />
              {errors.endDate && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.endDate.message}</div>}
            </div>
          </div>
        </Card>

        {/* T&M Section */}
        {engagementModel === 'TIME_AND_MATERIALS' && (
          <Card title="Team Members (T&M)" data-testid="tm-section" style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Define planned roles and rates for cost estimation. Actual team members are assigned after project approval.
            </Typography.Text>
            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`teamMembers.${index}.role`}>Role *</label>
                  <Controller
                    name={`teamMembers.${index}.role`}
                    control={control}
                    rules={{ required: 'Role is required' }}
                    render={({ field: f }) => (
                      <Input id={`teamMembers.${index}.role`} {...f} placeholder="e.g. Senior Developer" />
                    )}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`teamMembers.${index}.billingRatePaise`}>Billing Rate *</label>
                  <Controller
                    name={`teamMembers.${index}.billingRatePaise`}
                    control={control}
                    rules={{ required: 'Billing rate is required' }}
                    render={({ field: f }) => (
                      <InputNumber
                        id={`teamMembers.${index}.billingRatePaise`}
                        prefix="₹"
                        value={f.value}
                        onChange={f.onChange}
                        style={{ width: '100%' }}
                        min={0}
                        placeholder="Hourly rate"
                      />
                    )}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(index)}
                    aria-label={`Remove team member ${index + 1}`}
                  />
                )}
              </div>
            ))}
            <Button
              type="dashed"
              onClick={() => append({ role: '', billingRatePaise: null })}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Add Team Member
            </Button>
          </Card>
        )}

        {/* Fixed Cost Section */}
        {engagementModel === 'FIXED_COST' && (
          <Card title="Fixed Cost Details" data-testid="fixed-cost-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label htmlFor="contractValuePaise">Contract Value *</label>
                <Controller
                  name="contractValuePaise"
                  control={control}
                  rules={{ required: 'Contract value is required' }}
                  render={({ field }) => (
                    <InputNumber
                      id="contractValuePaise"
                      prefix="₹"
                      value={field.value}
                      onChange={field.onChange}
                      style={{ width: '100%' }}
                      min={0}
                    />
                  )}
                />
                {errors.contractValuePaise && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.contractValuePaise.message}</div>}
              </div>

              <div>
                <label htmlFor="budgetPaise">Budget</label>
                <Controller
                  name="budgetPaise"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      id="budgetPaise"
                      prefix="₹"
                      value={field.value}
                      onChange={field.onChange}
                      style={{ width: '100%' }}
                      min={0}
                    />
                  )}
                />
              </div>
            </div>
          </Card>
        )}

        {/* AMC Section */}
        {engagementModel === 'AMC' && (
          <Card title="AMC Details" data-testid="amc-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label htmlFor="contractValuePaise">Contract Value *</label>
                <Controller
                  name="contractValuePaise"
                  control={control}
                  rules={{ required: 'Contract value is required' }}
                  render={({ field }) => (
                    <InputNumber
                      id="contractValuePaise"
                      prefix="₹"
                      value={field.value}
                      onChange={field.onChange}
                      style={{ width: '100%' }}
                      min={0}
                    />
                  )}
                />
                {errors.contractValuePaise && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{errors.contractValuePaise.message}</div>}
              </div>

              <div>
                <label htmlFor="slaDescription">Support SLA Description</label>
                <Controller
                  name="slaDescription"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea id="slaDescription" {...field} rows={3} placeholder="Describe the SLA terms" />
                  )}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Infrastructure Section */}
        {engagementModel === 'INFRASTRUCTURE' && (
          <Card title="Infrastructure Details" data-testid="infrastructure-section" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label htmlFor="vendorCostsPaise">Vendor Costs</label>
                <Controller
                  name="vendorCostsPaise"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      id="vendorCostsPaise"
                      prefix="₹"
                      value={field.value}
                      onChange={field.onChange}
                      style={{ width: '100%' }}
                      min={0}
                    />
                  )}
                />
              </div>

              <div>
                <label htmlFor="manpowerAllocation">Manpower Allocation</label>
                <Controller
                  name="manpowerAllocation"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea id="manpowerAllocation" {...field} rows={3} placeholder="Describe manpower allocation" />
                  )}
                />
              </div>
            </div>
          </Card>
        )}

        <Divider />

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isMutating}
            disabled={isMutating}
          >
            {isEdit ? 'Resubmit Project' : 'Create Project'}
          </Button>
          <Button onClick={() => navigate(-1)} disabled={isMutating}>
            Cancel
          </Button>
        </Space>
      </form>
    </div>
  );
}

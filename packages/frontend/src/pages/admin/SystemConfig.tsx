import { Form, InputNumber, Button, Spin, Alert, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys, getConfig, updateConfig } from '../../services/config.api';
import type { SystemConfigInput } from '@ipis/shared';

export default function SystemConfig() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: configKeys.current,
    queryFn: getConfig,
  });

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...configKeys.current] });
      message.success('System configuration updated');
    },
    onError: () => {
      message.error('Failed to update configuration');
    },
  });

  const handleSubmit = (values: SystemConfigInput) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const config = data?.data;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>System Configuration</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={config}
        style={{ maxWidth: 480 }}
      >
        <Form.Item
          label="Standard Monthly Hours"
          name="standardMonthlyHours"
          rules={[{ required: true, message: 'Standard monthly hours is required' }]}
        >
          <InputNumber min={1} max={744} precision={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Healthy Margin Threshold (%)"
          name="healthyMarginThreshold"
          rules={[{ required: true, message: 'Healthy margin threshold is required' }]}
          tooltip="Enter as decimal: 0.20 = 20%"
        >
          <InputNumber min={0} max={1} step={0.01} formatter={(v) => v != null ? `${(Number(v) * 100).toFixed(0)}%` : ''} parser={(v) => { const n = parseFloat(v?.replace('%', '') ?? ''); return isNaN(n) ? 0 : n / 100; }} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="At-Risk Margin Threshold (%)"
          name="atRiskMarginThreshold"
          rules={[{ required: true, message: 'At-risk margin threshold is required' }]}
          tooltip="Enter as decimal: 0.05 = 5%"
        >
          <InputNumber min={0} max={1} step={0.01} formatter={(v) => v != null ? `${(Number(v) * 100).toFixed(0)}%` : ''} parser={(v) => { const n = parseFloat(v?.replace('%', '') ?? ''); return isNaN(n) ? 0 : n / 100; }} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

import { Form, InputNumber, Button, Spin, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configKeys, getConfig, updateConfig } from '../../services/config.api';
import type { ConfigUpdateResponse } from '../../services/config.api';
import type { SystemConfigInput } from '@ipis/shared';
import { reportKeys } from '../../services/dashboards.api';
import { useAuth } from '../../hooks/useAuth';
import ProjectRoleManagement from '../../components/ProjectRoleManagement';

export default function SystemConfig() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: configKeys.current,
    queryFn: getConfig,
  });

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: (result: ConfigUpdateResponse) => {
      queryClient.invalidateQueries({ queryKey: [...configKeys.current] });

      const recalc = result.meta?.recalculation;
      if (recalc) {
        if (recalc.status === 'FAILED' || recalc.error) {
          message.warning('Configuration saved but recalculation failed. Dashboard data may be stale.');
        } else {
          const count = recalc.projectsProcessed ?? 0;
          message.success(`Configuration saved. Recalculation complete — ${count} project${count === 1 ? '' : 's'} updated.`);
          // Invalidate all dashboard caches so they show fresh data
          queryClient.invalidateQueries({ queryKey: reportKeys.all });
        }
      } else {
        message.success('System configuration updated');
      }
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

  const rawConfig = data?.data;
  // Round threshold values to avoid IEEE 754 float precision artifacts (e.g., 0.20000000298 → 0.2)
  const config = rawConfig ? {
    ...rawConfig,
    healthyMarginThreshold: rawConfig.healthyMarginThreshold != null ? Math.round(rawConfig.healthyMarginThreshold * 100) / 100 : rawConfig.healthyMarginThreshold,
    atRiskMarginThreshold: rawConfig.atRiskMarginThreshold != null ? Math.round(rawConfig.atRiskMarginThreshold * 100) / 100 : rawConfig.atRiskMarginThreshold,
  } : undefined;

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
          <InputNumber<number> min={0} max={1} step={0.01} formatter={(v) => v != null ? `${(Number(v) * 100).toFixed(0)}%` : ''} parser={(v) => { const n = parseFloat(v?.replace('%', '') ?? ''); return isNaN(n) ? 0 : n / 100; }} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="At-Risk Margin Threshold (%)"
          name="atRiskMarginThreshold"
          rules={[{ required: true, message: 'At-risk margin threshold is required' }]}
          tooltip="Enter as decimal: 0.05 = 5%"
        >
          <InputNumber<number> min={0} max={1} step={0.01} formatter={(v) => v != null ? `${(Number(v) * 100).toFixed(0)}%` : ''} parser={(v) => { const n = parseFloat(v?.replace('%', '') ?? ''); return isNaN(n) ? 0 : n / 100; }} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Annual Overhead Per Employee (₹)"
          name="annualOverheadPerEmployee"
          rules={[{ required: true, message: 'Annual overhead is required' }]}
          tooltip="Annual overhead per employee added to CTC for cost calculations (rent, utilities, etc.). Value is stored in paise internally."
        >
          <InputNumber<number>
            min={0}
            precision={0}
            style={{ width: '100%' }}
            formatter={(v) => v != null ? `₹${(Number(v) / 100).toLocaleString('en-IN')}` : ''}
            parser={(v) => {
              const n = parseFloat(v?.replace(/[₹,\s]/g, '') ?? '');
              return isNaN(n) ? 0 : Math.round(n * 100);
            }}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Save
          </Button>
        </Form.Item>
      </Form>

      {user?.role === 'ADMIN' && <ProjectRoleManagement />}
    </div>
  );
}

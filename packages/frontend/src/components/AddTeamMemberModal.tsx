import { Modal, Form, Select, Input, InputNumber, Alert } from 'antd';
import { useState } from 'react';
import type { Employee } from '../services/employees.api';

interface AddTeamMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: { employeeId: string; role: string; billingRatePaise?: number }) => Promise<void>;
  employees: Employee[];
  existingMemberIds: string[];
  isTm: boolean;
  loading: boolean;
}

export default function AddTeamMemberModal({
  open,
  onCancel,
  onSubmit,
  employees,
  existingMemberIds,
  isTm,
  loading,
}: AddTeamMemberModalProps) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const assignableEmployees = employees.filter(
    (e) => !e.isResigned && !existingMemberIds.includes(e.id),
  );

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setError(null);
      await onSubmit({
        employeeId: values.employeeId,
        role: values.role,
        billingRatePaise: values.billingRatePaise != null ? Math.round(values.billingRatePaise * 100) : undefined,
      });
      form.resetFields();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError(null);
    onCancel();
  };

  return (
    <Modal
      title="Add Team Member"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Add Member"
      confirmLoading={loading}
      destroyOnClose
    >
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Employee"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            showSearch
            placeholder="Search and select employee"
            optionFilterProp="label"
            options={assignableEmployees.map((e) => ({
              value: e.id,
              label: `${e.name} (${e.employeeCode}) — ${e.designation}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="role"
          label="Role on Project"
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Input placeholder="e.g. Senior Developer, QA Lead" />
        </Form.Item>
        {isTm && (
          <Form.Item
            name="billingRatePaise"
            label="Billing Rate (₹)"
            rules={[{ required: true, message: 'Billing rate is required for T&M projects' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 5000" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

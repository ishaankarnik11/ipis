import { Modal, Form, Select, InputNumber, Alert } from 'antd';
import { useState } from 'react';
import type { Employee } from '../services/employees.api';

export interface ProjectRoleOption {
  id: string;
  name: string;
}

interface AddTeamMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: { employeeId: string; roleId: string; billingRatePaise?: number }) => Promise<void>;
  employees: Employee[];
  existingMemberIds: string[];
  roles: ProjectRoleOption[];
  isTm: boolean;
  loading: boolean;
}

export default function AddTeamMemberModal({
  open,
  onCancel,
  onSubmit,
  employees,
  existingMemberIds,
  roles,
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
        roleId: values.roleId,
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
          name="roleId"
          label="Role on Project"
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Select
            showSearch
            placeholder="Select a role"
            optionFilterProp="label"
            options={roles.map((r) => ({
              value: r.id,
              label: r.name,
            }))}
          />
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

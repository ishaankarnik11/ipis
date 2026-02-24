import { useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Checkbox, Button, Alert, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { employeeKeys, createEmployee, updateEmployee } from '../../services/employees.api';
import type { Employee } from '../../services/employees.api';
import { userKeys, getDepartments } from '../../services/users.api';

interface EmployeeFormModalProps {
  open: boolean;
  editingEmployee: Employee | null;
  onClose: () => void;
}

export default function EmployeeFormModal({ open, editingEmployee, onClose }: EmployeeFormModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!editingEmployee;

  const { data: deptData } = useQuery({
    queryKey: userKeys.departments,
    queryFn: getDepartments,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
      message.success(`Employee ${variables.name} added successfully`);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateEmployee>[1] }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
      message.success('Employee updated successfully');
      onClose();
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const resetMutations = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
  }, [createMutation.reset, updateMutation.reset]);

  useEffect(() => {
    if (open) {
      if (editingEmployee) {
        form.setFieldsValue({
          employeeCode: editingEmployee.employeeCode,
          name: editingEmployee.name,
          departmentId: editingEmployee.departmentId,
          designation: editingEmployee.designation,
          annualCtc: editingEmployee.annualCtcPaise != null
            ? editingEmployee.annualCtcPaise / 100
            : undefined,
          joiningDate: editingEmployee.joiningDate ? dayjs(editingEmployee.joiningDate) : null,
          isBillable: editingEmployee.isBillable,
        });
      } else {
        form.resetFields();
      }
      resetMutations();
    }
  }, [open, editingEmployee, form, resetMutations]);

  const handleSubmit = (values: {
    employeeCode: string;
    name: string;
    departmentId: string;
    designation: string;
    annualCtc: number;
    joiningDate?: dayjs.Dayjs | null;
    isBillable?: boolean;
  }) => {
    const annualCtcPaise = Math.round(values.annualCtc * 100);

    if (isEditing) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data: {
          designation: values.designation,
          annualCtcPaise,
          departmentId: values.departmentId,
          isBillable: values.isBillable ?? true,
        },
      });
    } else {
      createMutation.mutate({
        employeeCode: values.employeeCode,
        name: values.name,
        departmentId: values.departmentId,
        designation: values.designation,
        annualCtcPaise,
        joiningDate: values.joiningDate ? values.joiningDate.format('YYYY-MM-DD') : undefined,
        isBillable: values.isBillable ?? true,
      });
    }
  };

  const departments = deptData?.data ?? [];

  return (
    <Modal
      title={isEditing ? 'Edit Employee' : 'Add Employee'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {mutation.isError && (
        <Alert
          type="error"
          message={
            mutation.error instanceof Error
              ? mutation.error.message
              : 'An error occurred'
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        validateTrigger="onBlur"
        initialValues={{ isBillable: true }}
      >
        <Form.Item
          label="Employee Code"
          name="employeeCode"
          rules={[{ required: true, message: 'Employee Code is required' }]}
        >
          <Input placeholder="Enter employee code" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="Enter name" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          label="Department"
          name="departmentId"
          rules={[{ required: true, message: 'Department is required' }]}
        >
          <Select
            placeholder="Select department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>

        <Form.Item
          label="Designation"
          name="designation"
          rules={[{ required: true, message: 'Designation is required' }]}
        >
          <Input placeholder="Enter designation" />
        </Form.Item>

        <Form.Item
          label="Annual CTC"
          name="annualCtc"
          rules={[
            { required: true, message: 'Annual CTC is required' },
            { type: 'number', min: 1, message: 'Annual CTC must be a positive number' },
          ]}
        >
          <InputNumber
            prefix="₹"
            placeholder="Enter annual CTC"
            style={{ width: '100%' }}
            min={1}
            precision={0}
          />
        </Form.Item>

        <Form.Item label="Joining Date" name="joiningDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="isBillable" valuePropName="checked">
          <Checkbox>Billable</Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            block
          >
            {isEditing ? 'Save Changes' : 'Add Employee'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

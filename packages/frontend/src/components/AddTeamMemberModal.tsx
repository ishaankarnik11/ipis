import { Modal, Alert } from 'antd';
import { useState } from 'react';
import TeamMemberRow, { type TeamMemberRowValue } from './TeamMemberRow';

interface AddTeamMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: { employeeId: string; roleId: string; billingRatePaise?: number }) => Promise<void>;
  existingMemberIds: string[];
  isTm: boolean;
  loading: boolean;
}

const emptyRow: TeamMemberRowValue = { employeeId: null, roleId: null, sellingRate: null };

export default function AddTeamMemberModal({
  open,
  onCancel,
  onSubmit,
  existingMemberIds,
  isTm,
  loading,
}: AddTeamMemberModalProps) {
  const [value, setValue] = useState<TeamMemberRowValue>({ ...emptyRow });
  const [error, setError] = useState<string | null>(null);

  const handleOk = async () => {
    if (!value.employeeId || !value.roleId) {
      setError('Employee and role are required');
      return;
    }
    if (isTm && !value.sellingRate) {
      setError('Selling rate is required for T&M projects');
      return;
    }

    try {
      setError(null);
      await onSubmit({
        employeeId: value.employeeId,
        roleId: value.roleId,
        billingRatePaise: value.sellingRate != null ? Math.round(value.sellingRate * 100) : undefined,
      });
      setValue({ ...emptyRow });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    setValue({ ...emptyRow });
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
      width={700}
    >
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
      <TeamMemberRow
        value={value}
        onChange={setValue}
        engagementModel={isTm ? 'TIME_AND_MATERIALS' : 'FIXED_COST'}
        existingEmployeeIds={existingMemberIds}
      />
    </Modal>
  );
}

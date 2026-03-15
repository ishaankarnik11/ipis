import { Modal, Alert } from 'antd';
import { useState } from 'react';
import TeamMemberRow, { type TeamMemberRowValue } from './TeamMemberRow';

interface AddTeamMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: { employeeId: string; designationId: string; billingRatePaise?: number; allocationPercent?: number }) => Promise<void>;
  existingMemberIds: string[];
  isTm: boolean;
  loading: boolean;
}

const emptyRow: TeamMemberRowValue = { employeeId: null, designationId: null, sellingRate: null, allocationPercent: null };

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
    if (!value.employeeId || !value.designationId) {
      setError('Employee and designation are required');
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
        designationId: value.designationId,
        billingRatePaise: value.sellingRate != null ? Math.round(value.sellingRate * 100) : undefined,
        allocationPercent: value.allocationPercent ?? undefined,
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
      width={600}
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

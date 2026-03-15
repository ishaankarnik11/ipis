import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TeamMemberRow, { type TeamMemberRowValue } from './TeamMemberRow';

interface TeamMemberListProps {
  value: TeamMemberRowValue[];
  onChange: (value: TeamMemberRowValue[]) => void;
  engagementModel: string;
}

export default function TeamMemberList({ value, onChange, engagementModel }: TeamMemberListProps) {
  const existingEmployeeIds = value
    .map((v) => v.employeeId)
    .filter((id): id is string => id !== null);

  const handleRowChange = (index: number, updated: TeamMemberRowValue) => {
    const next = [...value];
    next[index] = updated;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...value, { employeeId: null, designationId: null, sellingRate: null, allocationPercent: null }]);
  };

  return (
    <div>
      {value.map((row, index) => (
        <TeamMemberRow
          key={row.employeeId ?? `new-${index}`}
          value={row}
          onChange={(updated) => handleRowChange(index, updated)}
          onRemove={() => handleRemove(index)}
          engagementModel={engagementModel}
          existingEmployeeIds={existingEmployeeIds}
        />
      ))}
      <Button
        type="dashed"
        onClick={handleAdd}
        icon={<PlusOutlined />}
        style={{ width: '100%' }}
        data-testid="add-member-btn"
      >
        Add Member
      </Button>
    </div>
  );
}

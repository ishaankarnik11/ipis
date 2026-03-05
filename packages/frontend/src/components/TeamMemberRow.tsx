import { useState, useEffect } from 'react';
import { Select, InputNumber, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { employeeKeys, searchEmployees } from '../services/employees.api';
import { projectRoleKeys, getActiveProjectRoles } from '../services/project-roles.api';

export interface TeamMemberRowValue {
  employeeId: string | null;
  roleId: string | null;
  sellingRate: number | null; // rupees (user-facing)
}

interface TeamMemberRowProps {
  value: TeamMemberRowValue;
  onChange: (value: TeamMemberRowValue) => void;
  onRemove?: () => void;
  engagementModel: string;
  existingEmployeeIds?: string[];
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function TeamMemberRow({
  value,
  onChange,
  onRemove,
  engagementModel,
  existingEmployeeIds = [],
}: TeamMemberRowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: employeeKeys.search(debouncedQuery),
    queryFn: () => searchEmployees(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: rolesData } = useQuery({
    queryKey: projectRoleKeys.active,
    queryFn: getActiveProjectRoles,
  });

  const isTm = engagementModel === 'TIME_AND_MATERIALS';

  const employeeOptions = (searchResults?.data ?? [])
    .filter((e) => !existingEmployeeIds.includes(e.id) || e.id === value.employeeId)
    .map((e) => ({
      value: e.id,
      label: `${e.name} (${e.employeeCode}) — ${e.designation}, ${e.departmentName}`,
    }));

  const roleOptions = (rolesData?.data ?? []).map((r) => ({
    value: r.id,
    label: r.name,
  }));

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 2 }}>
        <Select
          showSearch
          placeholder="Search employee (min 2 chars)"
          filterOption={false}
          onSearch={setSearchQuery}
          value={value.employeeId}
          onChange={(employeeId) => onChange({ ...value, employeeId })}
          options={employeeOptions}
          loading={isSearching}
          allowClear
          style={{ width: '100%' }}
          notFoundContent={debouncedQuery.length < 2 ? 'Type 2+ characters to search' : 'No employees found'}
          data-testid="employee-search"
        />
      </div>
      <div style={{ flex: 1 }}>
        <Select
          showSearch
          placeholder="Select role"
          optionFilterProp="label"
          value={value.roleId}
          onChange={(roleId) => onChange({ ...value, roleId })}
          options={roleOptions}
          allowClear
          style={{ width: '100%' }}
          data-testid="role-select"
        />
      </div>
      <div style={{ flex: 1 }}>
        <InputNumber
          placeholder={isTm ? 'Rate (required)' : 'Rate (optional)'}
          addonAfter="₹/hr"
          min={1}
          value={value.sellingRate}
          onChange={(sellingRate) => onChange({ ...value, sellingRate: sellingRate ?? null })}
          style={{ width: '100%' }}
          status={isTm && value.employeeId && !value.sellingRate ? 'error' : ''}
          data-testid="selling-rate"
        />
      </div>
      {onRemove && (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={onRemove}
          aria-label="Remove team member"
          style={{ marginTop: 4 }}
        />
      )}
    </div>
  );
}

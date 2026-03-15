import { useState, useEffect } from 'react';
import { Select, InputNumber, Button, Row, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { employeeKeys, searchEmployees } from '../services/employees.api';
import { designationKeys, getActiveDesignations } from '../services/designations.api';

export interface TeamMemberRowValue {
  employeeId: string | null;
  designationId: string | null;
  sellingRate: number | null; // rupees (user-facing)
  allocationPercent: number | null;
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

  const { data: designationsData } = useQuery({
    queryKey: designationKeys.active,
    queryFn: getActiveDesignations,
  });

  const isTm = engagementModel === 'TIME_AND_MATERIALS';

  const employees = searchResults?.data ?? [];
  const designations = designationsData?.data ?? [];

  const employeeOptions = employees
    .filter((e) => !existingEmployeeIds.includes(e.id) || e.id === value.employeeId)
    .map((e) => ({
      value: e.id,
      label: `${e.name} (${e.employeeCode}) — ${e.designation}, ${e.departmentName}`,
    }));

  const designationOptions = designations.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  // Auto-populate designation from employee designation (Story 10.8)
  const handleEmployeeChange = (employeeId: string | null) => {
    if (!employeeId) {
      onChange({ ...value, employeeId: null });
      return;
    }
    const employee = employees.find((e) => e.id === employeeId);
    let matchedDesignationId: string | null = value.designationId;
    if (employee?.designation && !value.designationId) {
      const empDesignation = employee.designation.toLowerCase();
      const match = designations.find((r) => r.name.toLowerCase() === empDesignation);
      if (match) {
        matchedDesignationId = match.id;
      }
    }
    onChange({ ...value, employeeId, designationId: matchedDesignationId });
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Row 1: Employee (full width) */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Employee</label>
        <Select
          showSearch
          placeholder="Search employee (min 2 chars)"
          filterOption={false}
          onSearch={setSearchQuery}
          value={value.employeeId}
          onChange={handleEmployeeChange}
          options={employeeOptions}
          loading={isSearching}
          allowClear
          style={{ width: '100%' }}
          notFoundContent={debouncedQuery.length < 2 ? 'Type 2+ characters to search' : 'No employees found'}
          data-testid="employee-search"
        />
      </div>

      {/* Row 2: Designation (full width) */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Designation</label>
        <Select
          showSearch
          placeholder="Select designation"
          optionFilterProp="label"
          value={value.designationId}
          onChange={(designationId) => onChange({ ...value, designationId })}
          options={designationOptions}
          allowClear
          style={{ width: '100%' }}
          data-testid="designation-select"
        />
      </div>

      {/* Row 3: Selling Rate + Allocation % (side by side) */}
      <Row gutter={12}>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Selling Rate {isTm ? '(required)' : '(optional)'}
          </label>
          <InputNumber
            placeholder="₹/hr"
            min={1}
            value={value.sellingRate}
            onChange={(sellingRate) => onChange({ ...value, sellingRate: sellingRate ?? null })}
            style={{ width: '100%' }}
            status={isTm && value.employeeId && !value.sellingRate ? 'error' : ''}
            data-testid="selling-rate"
          />
        </Col>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Allocation %</label>
          <InputNumber
            placeholder="100"
            min={1}
            max={100}
            value={value.allocationPercent}
            onChange={(allocationPercent) => onChange({ ...value, allocationPercent: allocationPercent ?? null })}
            style={{ width: '100%' }}
            data-testid="allocation-percent"
          />
        </Col>
      </Row>

      {onRemove && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onRemove}
            aria-label="Remove team member"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

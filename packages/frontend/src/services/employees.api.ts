import type { CreateEmployeeInput, UpdateEmployeeInput } from '@ipis/shared';
import { get, post, patch } from './api';
import type { DataResponse, ListResponse, SuccessResponse } from './types';

export const employeeKeys = {
  all: ['employees'] as const,
  detail: (id: string) => ['employees', id] as const,
  search: (q: string) => ['employees', 'search', q] as const,
};

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  departmentId: string;
  isBillable: boolean;
  isResigned: boolean;
  annualCtcPaise?: number;
  joiningDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getEmployees(): Promise<ListResponse<Employee>> {
  return get<ListResponse<Employee>>('/employees');
}

export function getEmployee(id: string): Promise<DataResponse<Employee>> {
  return get<DataResponse<Employee>>(`/employees/${id}`);
}

export function createEmployee(data: CreateEmployeeInput): Promise<DataResponse<Employee>> {
  return post<DataResponse<Employee>>('/employees', data);
}

export function updateEmployee(id: string, data: UpdateEmployeeInput): Promise<DataResponse<Employee>> {
  return patch<DataResponse<Employee>>(`/employees/${id}`, data);
}

export function resignEmployee(id: string): Promise<SuccessResponse> {
  return patch<SuccessResponse>(`/employees/${id}/resign`);
}

export interface EmployeeSearchResult {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  departmentName: string;
}

export function searchEmployees(q: string): Promise<ListResponse<EmployeeSearchResult>> {
  return get<ListResponse<EmployeeSearchResult>>(`/employees/search?q=${encodeURIComponent(q)}`);
}

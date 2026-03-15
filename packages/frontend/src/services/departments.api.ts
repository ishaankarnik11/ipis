import { get, post, patch, del } from './api';
import type { DataResponse, ListResponse } from './types';

export interface DepartmentDetail {
  id: string;
  name: string;
  headUserId: string | null;
  isActive: boolean;
  createdAt: string;
  employeeCount: number;
}

export const departmentKeys = {
  all: ['departments'] as const,
  active: ['departments', 'active'] as const,
};

export function getDepartmentsDetailed(): Promise<ListResponse<DepartmentDetail>> {
  return get<ListResponse<DepartmentDetail>>('/departments');
}

export function getActiveDepartments(): Promise<ListResponse<DepartmentDetail>> {
  return get<ListResponse<DepartmentDetail>>('/departments?active=true');
}

export function createDepartment(data: { name: string; headUserId?: string | null }): Promise<DataResponse<DepartmentDetail>> {
  return post<DataResponse<DepartmentDetail>>('/departments', data);
}

export function updateDepartment(id: string, data: { name?: string; headUserId?: string | null }): Promise<DataResponse<DepartmentDetail>> {
  return patch<DataResponse<DepartmentDetail>>(`/departments/${id}`, data);
}

export function deactivateDepartment(id: string): Promise<DataResponse<DepartmentDetail>> {
  return del<DataResponse<DepartmentDetail>>(`/departments/${id}`);
}

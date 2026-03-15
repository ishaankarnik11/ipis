import { get, post, patch } from './api';
import type { DataResponse, ListResponse } from './types';

export interface Designation {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
}

export const designationKeys = {
  all: ['designations'] as const,
  active: ['designations', 'active'] as const,
};

export function getDesignations(): Promise<ListResponse<Designation>> {
  return get<ListResponse<Designation>>('/designations');
}

export function getActiveDesignations(): Promise<ListResponse<Designation>> {
  return get<ListResponse<Designation>>('/designations?active=true');
}

export function createDesignation(data: { name: string; departmentId?: string | null }): Promise<DataResponse<Designation>> {
  return post<DataResponse<Designation>>('/designations', data);
}

export function updateDesignation(id: string, data: { name?: string; departmentId?: string | null; isActive?: boolean }): Promise<DataResponse<Designation>> {
  return patch<DataResponse<Designation>>(`/designations/${id}`, data);
}

// Backwards-compatible aliases
export type ProjectRole = Designation;
export const projectRoleKeys = designationKeys;
export const getProjectRoles = getDesignations;
export const getActiveProjectRoles = getActiveDesignations;
export const createProjectRole = createDesignation;
export const updateProjectRole = updateDesignation;

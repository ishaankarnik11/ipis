import { get, post, patch } from './api';
import type { DataResponse, ListResponse } from './types';

export interface ProjectRole {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export const projectRoleKeys = {
  all: ['project-roles'] as const,
  active: ['project-roles', 'active'] as const,
};

export function getProjectRoles(): Promise<ListResponse<ProjectRole>> {
  return get<ListResponse<ProjectRole>>('/project-roles');
}

export function getActiveProjectRoles(): Promise<ListResponse<ProjectRole>> {
  return get<ListResponse<ProjectRole>>('/project-roles?active=true');
}

export function createProjectRole(data: { name: string }): Promise<DataResponse<ProjectRole>> {
  return post<DataResponse<ProjectRole>>('/project-roles', data);
}

export function updateProjectRole(id: string, data: { isActive: boolean }): Promise<DataResponse<ProjectRole>> {
  return patch<DataResponse<ProjectRole>>(`/project-roles/${id}`, data);
}

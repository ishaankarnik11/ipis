import { get } from './api';
import type { ListResponse } from './types';

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

export function getActiveProjectRoles(): Promise<ListResponse<ProjectRole>> {
  return get<ListResponse<ProjectRole>>('/project-roles?active=true');
}

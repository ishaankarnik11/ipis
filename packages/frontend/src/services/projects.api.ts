import type { CreateProjectInput, UpdateProjectInput } from '@ipis/shared';
import { get, patch, post } from './api';
import type { DataResponse, ListResponse, SuccessResponse } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

export type ProjectStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'COMPLETED';
export type EngagementModel = 'TIME_AND_MATERIALS' | 'FIXED_COST' | 'AMC' | 'INFRASTRUCTURE';

export interface Project {
  id: string;
  name: string;
  client: string;
  vertical: string;
  engagementModel: EngagementModel;
  status: ProjectStatus;
  contractValuePaise: number | null;
  deliveryManagerId: string;
  rejectionComment: string | null;
  completionPercent: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export function getProjects(): Promise<ListResponse<Project>> {
  return get<ListResponse<Project>>('/projects');
}

export function getProject(id: string): Promise<DataResponse<Project>> {
  return get<DataResponse<Project>>(`/projects/${id}`);
}

export function createProject(data: CreateProjectInput): Promise<DataResponse<Project>> {
  return post<DataResponse<Project>>('/projects', data);
}

export function updateProject(id: string, data: UpdateProjectInput): Promise<DataResponse<Project>> {
  return patch<DataResponse<Project>>(`/projects/${id}`, data);
}

export function resubmitProject(id: string): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/projects/${id}/resubmit`);
}

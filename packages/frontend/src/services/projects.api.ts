import type { CreateProjectInput, UpdateProjectInput } from '@ipis/shared';
import { get, patch, post } from './api';
import type { DataResponse, ListResponse, SuccessResponse } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  teamMembers: (id: string) => ['projects', id, 'team-members'] as const,
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
  deliveryManagerName: string | null;
  rejectionComment: string | null;
  completionPercent: number | null;
  slaDescription: string | null;
  vendorCostPaise: number | null;
  manpowerCostPaise: number | null;
  budgetPaise: number | null;
  infraCostMode: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  employeeId: string;
  name: string;
  designation: string;
  role: string;
  billingRatePaise: number | null;
  assignedAt: string;
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

export function approveProject(id: string): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/projects/${id}/approve`);
}

export function rejectProject(id: string, rejectionComment: string): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/projects/${id}/reject`, { rejectionComment });
}

export function getTeamMembers(projectId: string): Promise<ListResponse<TeamMember>> {
  return get<ListResponse<TeamMember>>(`/projects/${projectId}/team-members`);
}

export const engagementModelLabels: Record<string, string> = {
  TIME_AND_MATERIALS: 'Time & Materials',
  FIXED_COST: 'Fixed Cost',
  AMC: 'AMC',
  INFRASTRUCTURE: 'Infrastructure',
};

import type { CreateProjectInput, UpdateProjectInput, AddTeamMemberInput } from '@ipis/shared';
import { get, patch, post, del } from './api';
import type { DataResponse, ListResponse, SuccessResponse } from './types';

export const projectKeys = {
  all: ['projects'] as const,
  list: (scope?: string) => ['projects', 'list', scope ?? 'default'] as const,
  detail: (id: string) => ['projects', id] as const,
  teamMembers: (id: string) => ['projects', id, 'team-members'] as const,
};

export type ProjectStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type EngagementModel = 'TIME_AND_MATERIALS' | 'FIXED_COST' | 'AMC' | 'INFRASTRUCTURE';

export interface ProjectFinancials {
  revenuePaise: number | null;
  costPaise: number | null;
  profitPaise: number | null;
  marginPercent: number | null;
  burnRatePaise: number | null;
  plannedBurnRatePaise: number | null;
  budgetPaise: number | null;
  actualCostPaise: number | null;
  variancePaise: number | null;
  consumedPercent: number | null;
}

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
  infraCostMode: 'SIMPLE' | 'DETAILED' | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  financials: ProjectFinancials | null;
}

export interface TeamMember {
  employeeId: string;
  name: string;
  employeeDesignation: string;
  designationId: string;
  designationName: string;
  billingRatePaise: number | null;
  monthlyCostPaise?: number;
  allocationPercent: number;
  assignedAt: string;
  overAllocated?: boolean;
  totalAllocation?: number;
}

export function getProjects(scope?: string): Promise<ListResponse<Project>> {
  const qs = scope ? `?scope=${scope}` : '';
  return get<ListResponse<Project>>(`/projects${qs}`);
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

export function addTeamMember(projectId: string, data: AddTeamMemberInput): Promise<DataResponse<TeamMember>> {
  return post<DataResponse<TeamMember>>(`/projects/${projectId}/team-members`, data);
}

export function removeTeamMember(projectId: string, employeeId: string): Promise<SuccessResponse> {
  return del<SuccessResponse>(`/projects/${projectId}/team-members/${employeeId}`);
}

export const engagementModelLabels: Record<string, string> = {
  TIME_AND_MATERIALS: 'Time & Materials',
  FIXED_COST: 'Fixed Cost',
  AMC: 'AMC',
  INFRASTRUCTURE: 'Infrastructure',
};

import { get } from './api';
import type { DataResponse, ListResponse } from './types';

export interface ProjectDashboardItem {
  projectId: string;
  projectName: string;
  engagementModel: string;
  department: string | null;
  vertical: string;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

export interface DashboardFilters {
  department?: string;
  vertical?: string;
  engagement_model?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ── Executive Dashboard ──

export interface ExecutiveDashboardData {
  revenuePaise: number;
  costPaise: number;
  marginPercent: number;
  billableUtilisationPercent: number;
  top5Projects: ProjectDashboardItem[];
  bottom5Projects: ProjectDashboardItem[];
}

// ── Practice Dashboard ──

export interface PracticeDashboardItem {
  designation: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  employeeCount: number;
}

// ── Department Dashboard ──

export interface DepartmentDashboardItem {
  departmentId: string;
  departmentName: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

// ── Company Dashboard ──

export interface CompanyDashboardData {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  departments: DepartmentDashboardItem[];
}

// ── Query Keys ──

export const reportKeys = {
  all: ['reports'] as const,
  projects: (filters?: DashboardFilters) =>
    ['reports', 'projects', filters ?? {}] as const,
  executive: ['reports', 'executive'] as const,
  practice: ['reports', 'practice'] as const,
  department: ['reports', 'department'] as const,
  company: ['reports', 'company'] as const,
};

export function getProjectDashboard(
  filters?: DashboardFilters,
): Promise<ListResponse<ProjectDashboardItem>> {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  return get<ListResponse<ProjectDashboardItem>>(
    `/reports/dashboards/projects${qs ? `?${qs}` : ''}`,
  );
}

export function getExecutiveDashboard(): Promise<DataResponse<ExecutiveDashboardData | null>> {
  return get<DataResponse<ExecutiveDashboardData | null>>('/reports/dashboards/executive');
}

export function getPracticeDashboard(): Promise<ListResponse<PracticeDashboardItem>> {
  return get<ListResponse<PracticeDashboardItem>>('/reports/dashboards/practice');
}

export function getDepartmentDashboard(): Promise<ListResponse<DepartmentDashboardItem>> {
  return get<ListResponse<DepartmentDashboardItem>>('/reports/dashboards/department');
}

export function getCompanyDashboard(): Promise<DataResponse<CompanyDashboardData | null>> {
  return get<DataResponse<CompanyDashboardData | null>>('/reports/dashboards/company');
}

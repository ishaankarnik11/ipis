import { get } from './api';
import type { ListResponse } from './types';

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

export const reportKeys = {
  all: ['reports'] as const,
  projects: (filters?: DashboardFilters) =>
    ['reports', 'projects', filters ?? {}] as const,
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

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
  deptTeamCount?: number;
  burnRatePaise: number;
  plannedBurnRatePaise?: number;
  budgetPaise: number | null;
  actualCostPaise: number;
  variancePaise: number | null;
  consumedPercent: number | null;
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
  marginPercent: number | null;
}

// ── Department Drill-Down ──

export interface DepartmentDrilldownEmployee {
  employeeId: string;
  name: string;
  designation: string;
  billableUtilisationPercent: number;
  revenueContributionPaise: number;
  costPaise: number;
}

export interface DepartmentDrilldownProject {
  projectId: string;
  projectName: string;
  employeeCount: number;
  revenueContributionPaise: number;
}

export interface DepartmentDrilldownData {
  departmentId: string;
  departmentName: string;
  employees: DepartmentDrilldownEmployee[];
  projects: DepartmentDrilldownProject[];
}

// ── Department Comparison (month-over-month) ──

export interface DepartmentMonthData {
  periodMonth: number;
  periodYear: number;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number | null;
}

export interface DepartmentComparisonItem {
  departmentId: string;
  departmentName: string;
  months: DepartmentMonthData[];
}

// ── Company Dashboard ──

export interface CompanyDashboardData {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  departments: DepartmentDashboardItem[];
}

// ── Employee Dashboard ──

export interface EmployeeDashboardItem {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
  marginPercent: number;
  profitabilityRank: number;
}

export interface EmployeeDashboardFilters {
  department?: string;
  designation?: string;
}

export interface EmployeeMonthlyHistory {
  periodMonth: number;
  periodYear: number;
  totalHours: number;
  billableHours: number;
  billableUtilisationPercent: number;
  totalCostPaise: number;
  revenueContributionPaise: number;
  profitContributionPaise: number;
}

export interface EmployeeProjectAssignment {
  projectId: string;
  projectName: string;
  designationId: string;
  designationName: string;
  sellingRatePaise: number | null;
  assignedAt: string;
}

export interface EmployeeUtilisationSummary {
  billableHours: number;
  totalHours: number;
  utilisationPercent: number;
}

export interface EmployeeDetailData {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
  annualCtcPaise: number;
  isBillable: boolean;
  isResigned: boolean;
  utilisationSummary: EmployeeUtilisationSummary | null;
  monthlyHistory: EmployeeMonthlyHistory[];
  projectAssignments: EmployeeProjectAssignment[];
}

// ── Client Dashboard ──

export interface ClientDashboardItem {
  clientName: string;
  totalRevenuePaise: number;
  totalCostPaise: number;
  profitPaise: number;
  marginPercent: number | null;
  activeProjectCount: number;
}

export interface ClientProjectItem {
  projectId: string;
  projectName: string;
  engagementModel: string;
  status: string;
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

// ── Query Keys ──

export const reportKeys = {
  all: ['reports'] as const,
  projects: (filters?: DashboardFilters) =>
    ['reports', 'projects', filters ?? {}] as const,
  executive: ['reports', 'executive'] as const,
  practice: ['reports', 'practice'] as const,
  department: ['reports', 'department'] as const,
  departmentComparison: (months: string[]) =>
    ['reports', 'department', 'comparison', ...months] as const,
  departmentDrilldown: (id: string) =>
    ['reports', 'department', 'drilldown', id] as const,
  clients: ['reports', 'clients'] as const,
  clientProjects: (name: string) =>
    ['reports', 'clients', name, 'projects'] as const,
  company: ['reports', 'company'] as const,
  employees: (filters?: EmployeeDashboardFilters) =>
    ['reports', 'employees', filters ?? {}] as const,
  employeeDetail: (id: string) =>
    ['reports', 'employees', id] as const,
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

export function getDepartmentComparison(
  months: string[],
): Promise<ListResponse<DepartmentComparisonItem>> {
  return get<ListResponse<DepartmentComparisonItem>>(
    `/reports/dashboards/department?months=${months.join(',')}`,
  );
}

export function getDepartmentDrilldown(
  departmentId: string,
): Promise<DataResponse<DepartmentDrilldownData>> {
  return get<DataResponse<DepartmentDrilldownData>>(
    `/reports/dashboards/department/${departmentId}/drilldown`,
  );
}

export function getCompanyDashboard(): Promise<DataResponse<CompanyDashboardData | null>> {
  return get<DataResponse<CompanyDashboardData | null>>('/reports/dashboards/company');
}

export function getEmployeeDashboard(
  filters?: EmployeeDashboardFilters,
): Promise<ListResponse<EmployeeDashboardItem>> {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  return get<ListResponse<EmployeeDashboardItem>>(
    `/reports/dashboards/employees${qs ? `?${qs}` : ''}`,
  );
}

export function getEmployeeDetail(
  id: string,
): Promise<DataResponse<EmployeeDetailData>> {
  return get<DataResponse<EmployeeDetailData>>(`/reports/dashboards/employees/${id}`);
}

export function getClientDashboard(): Promise<ListResponse<ClientDashboardItem>> {
  return get<ListResponse<ClientDashboardItem>>('/reports/dashboards/clients');
}

export function getClientProjects(
  clientName: string,
): Promise<ListResponse<ClientProjectItem>> {
  return get<ListResponse<ClientProjectItem>>(
    `/reports/dashboards/clients/${encodeURIComponent(clientName)}/projects`,
  );
}

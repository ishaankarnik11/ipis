import type { SystemConfigInput } from '@ipis/shared';
import { get, put } from './api';
import type { DataResponse } from './types';

export const configKeys = {
  current: ['config'] as const,
};

export interface SystemConfig {
  standardMonthlyHours: number;
  healthyMarginThreshold: number;
  atRiskMarginThreshold: number;
  annualOverheadPerEmployee: number;
}

export interface ConfigUpdateResponse {
  success: boolean;
  meta?: {
    recalculation?: {
      projectsProcessed?: number;
      status?: string;
      error?: string;
    };
  };
}

export function getConfig(): Promise<DataResponse<SystemConfig>> {
  return get<DataResponse<SystemConfig>>('/config');
}

export function updateConfig(data: SystemConfigInput): Promise<ConfigUpdateResponse> {
  return put<ConfigUpdateResponse>('/config', data);
}

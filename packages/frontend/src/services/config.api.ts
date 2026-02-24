import type { SystemConfigInput } from '@ipis/shared';
import { get, put } from './api';
import type { DataResponse, SuccessResponse } from './types';

export const configKeys = {
  current: ['config'] as const,
};

export interface SystemConfig {
  standardMonthlyHours: number;
  healthyMarginThreshold: number;
  atRiskMarginThreshold: number;
}

export function getConfig(): Promise<DataResponse<SystemConfig>> {
  return get<DataResponse<SystemConfig>>('/config');
}

export function updateConfig(data: SystemConfigInput): Promise<SuccessResponse> {
  return put<SuccessResponse>('/config', data);
}

import { get } from './api';
import type { DataResponse } from './types';

// ── Types ───────────────────────────────────────────────────────────────────

export interface LedgerEmployee {
  employeeId: string;
  employeeName: string;
  designation: string;
  hours: number;
  cost_per_hour_paise: number;
  contribution_paise: number;
}

interface BaseLedgerData {
  revenue_paise: number;
  cost_paise: number;
  profit_paise: number;
  margin_percent: number;
  engagement_model: string;
  calculated_at: string;
  engine_version: string;
  recalculation_run_id: string;
}

export interface EmployeeLedgerData extends BaseLedgerData {
  employees: LedgerEmployee[];
}

export interface InfraDetailedLedgerData extends EmployeeLedgerData {
  infra_cost_mode: 'DETAILED';
  vendor_cost_paise: number;
}

export interface InfraSimpleLedgerData extends BaseLedgerData {
  infra_cost_mode: 'SIMPLE';
  vendor_cost_paise: number;
  manpower_cost_paise: number;
}

export type LedgerData =
  | EmployeeLedgerData
  | InfraDetailedLedgerData
  | InfraSimpleLedgerData;

// ── Query keys ──────────────────────────────────────────────────────────────

export const ledgerKeys = {
  all: ['ledger'] as const,
  detail: (projectId: string, period: string) =>
    ['ledger', projectId, period] as const,
};

// ── API function ────────────────────────────────────────────────────────────

export function getProjectLedger(
  projectId: string,
  period: string,
): Promise<DataResponse<LedgerData>> {
  return get<DataResponse<LedgerData>>(
    `/reports/projects/${projectId}/ledger?period=${period}`,
  );
}

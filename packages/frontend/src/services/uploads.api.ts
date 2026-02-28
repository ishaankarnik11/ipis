import { get, postForm } from './api';
import type { DataResponse, ListResponse } from './types';

// ── Query keys ──────────────────────────────────────────────────────────────

export const uploadKeys = {
  history: ['uploads', 'history'] as const,
  latestByType: ['uploads', 'latestByType'] as const,
  progress: (id: string) => ['uploads', 'progress', id] as const,
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface TimesheetUploadResult {
  status: string;
  rowCount: number;
  periodMonth: number;
  periodYear: number;
  replacedRowsCount: number | null;
  uploadEventId: string;
}

export interface BillingUploadResult {
  status: string;
  rowCount: number;
  periodMonth: number;
  periodYear: number;
  replacedRowsCount: number | null;
  uploadEventId: string;
  recalculation: {
    status: string;
    runId: string | null;
    projectsProcessed: number;
    error: string | null;
  };
}

export interface SalaryUploadResult {
  status: string;
  imported: number;
  failed: number;
  uploadEventId: string;
  failedRows: { row: number; employeeCode: string; error: string }[];
}

/** @deprecated Use SalaryUploadResult — kept for backward compatibility */
export type BulkUploadResult = SalaryUploadResult;

export interface UploadHistoryEntry {
  id: string;
  type: string;
  status: string;
  periodMonth: number;
  periodYear: number;
  rowCount: number;
  replacedRowsCount: number | null;
  uploaderName: string;
  createdAt: string;
}

export interface LatestByTypeEntry {
  type: string;
  periodMonth: number;
  periodYear: number;
  createdAt: string;
}

// ── Upload functions ────────────────────────────────────────────────────────

export function uploadTimesheetFile(file: File): Promise<DataResponse<TimesheetUploadResult>> {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<DataResponse<TimesheetUploadResult>>('/uploads/timesheets', formData);
}

export function uploadBillingFile(file: File): Promise<DataResponse<BillingUploadResult>> {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<DataResponse<BillingUploadResult>>('/uploads/billing', formData);
}

export function uploadSalaryFile(
  file: File,
  mode: 'full' | 'correction' = 'full',
): Promise<DataResponse<SalaryUploadResult>> {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<DataResponse<SalaryUploadResult>>(`/uploads/salary?mode=${mode}`, formData);
}

// ── Query functions ─────────────────────────────────────────────────────────

export function getUploadHistory(
  page = 1,
  pageSize = 20,
): Promise<ListResponse<UploadHistoryEntry>> {
  return get<ListResponse<UploadHistoryEntry>>(
    `/uploads/history?page=${page}&pageSize=${pageSize}`,
  );
}

export function getLatestByType(): Promise<DataResponse<LatestByTypeEntry[]>> {
  return get<DataResponse<LatestByTypeEntry[]>>('/uploads/latest-by-type');
}

// ── Download functions ──────────────────────────────────────────────────────

export async function downloadErrorReport(uploadEventId: string): Promise<void> {
  const res = await fetch(`/api/v1/uploads/${uploadEventId}/error-report`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to download error report');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-report-${uploadEventId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTemplate(): void {
  const a = document.createElement('a');
  a.href = '/api/v1/employees/sample-template';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

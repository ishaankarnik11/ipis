import { postForm } from './api';
import type { DataResponse } from './types';

export const uploadKeys = {
  history: ['uploads', 'history'] as const,
};

export interface BulkUploadResult {
  imported: number;
  failed: number;
  failedRows: { row: number; employeeCode: string; error: string }[];
}

export function uploadSalaryFile(file: File): Promise<DataResponse<BulkUploadResult>> {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<DataResponse<BulkUploadResult>>('/employees/bulk-upload', formData);
}

export function downloadTemplate(): void {
  const a = document.createElement('a');
  a.href = '/api/v1/employees/sample-template';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

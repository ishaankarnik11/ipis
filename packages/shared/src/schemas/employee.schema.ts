import { z } from 'zod';

export const employeeRowSchema = z.object({
  employee_code: z.string().min(1, 'employee_code is required'),
  name: z.string().min(1, 'name is required'),
  department: z.string().min(1, 'department is required'),
  designation: z.string().min(1, 'designation is required'),
  annual_ctc: z.number().positive('annual_ctc must be positive'),
  joining_date: z.string().optional(),
  is_billable: z.boolean().optional().default(true),
});

export type EmployeeRowInput = z.infer<typeof employeeRowSchema>;

export const bulkUploadResponseSchema = z.object({
  imported: z.number(),
  failed: z.number(),
  failedRows: z.array(
    z.object({
      row: z.number(),
      employeeCode: z.string(),
      error: z.string(),
    }),
  ),
});

export type BulkUploadResponse = z.infer<typeof bulkUploadResponseSchema>;

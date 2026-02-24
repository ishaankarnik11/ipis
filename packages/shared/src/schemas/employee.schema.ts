import { z } from 'zod';

const isoDateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Must be a valid date string (e.g., 2024-06-15)' },
);

export const employeeRowSchema = z.object({
  employee_code: z.string().trim().min(1, 'employee_code is required'),
  name: z.string().trim().min(1, 'name is required'),
  department: z.string().trim().min(1, 'department is required'),
  designation: z.string().trim().min(1, 'designation is required'),
  annual_ctc: z.number().positive('annual_ctc must be positive'),
  joining_date: isoDateString.optional(),
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

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'employeeCode is required'),
  name: z.string().min(1, 'name is required'),
  departmentId: z.string().uuid('departmentId must be a valid UUID'),
  designation: z.string().min(1, 'designation is required'),
  annualCtcPaise: z.number().int('annualCtcPaise must be an integer').positive('annualCtcPaise must be positive'),
  joiningDate: isoDateString.optional(),
  isBillable: z.boolean().optional().default(true),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    designation: z.string().min(1, 'designation cannot be empty').optional(),
    annualCtcPaise: z.number().int('annualCtcPaise must be an integer').positive('annualCtcPaise must be positive').optional(),
    departmentId: z.string().uuid('departmentId must be a valid UUID').optional(),
    isBillable: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

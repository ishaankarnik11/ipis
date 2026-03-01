import { z } from 'zod';

export const timesheetRowSchema = z.object({
  employee_id: z.string().trim().min(1, 'employee_id is required'),
  project_name: z.string().trim().min(1, 'project_name is required'),
  hours: z.coerce.number().positive('hours must be positive').max(744, 'hours cannot exceed 744 per month'),
  period_month: z.coerce.number().int().min(1, 'period_month must be 1-12').max(12, 'period_month must be 1-12'),
  period_year: z.coerce.number().int().min(2000, 'period_year must be 2000-2100').max(2100, 'period_year must be 2000-2100'),
});

export type TimesheetRowInput = z.infer<typeof timesheetRowSchema>;

export const billingRowSchema = z.object({
  project_id: z.string().trim().min(1, 'project_id is required'),
  client_name: z.string().trim().min(1, 'client_name is required'),
  invoice_amount_paise: z.coerce.number().int('invoice_amount_paise must be an integer').positive('invoice_amount_paise must be positive'),
  invoice_date: z.string().trim().min(1, 'invoice_date is required').refine((s) => !isNaN(Date.parse(s)), 'invoice_date must be a valid date'),
  project_type: z.string().trim().min(1, 'project_type is required'),
  vertical: z.string().trim().min(1, 'vertical is required'),
  period_month: z.coerce.number().int().min(1, 'period_month must be 1-12').max(12, 'period_month must be 1-12'),
  period_year: z.coerce.number().int().min(2000, 'period_year must be 2000-2100').max(2100, 'period_year must be 2000-2100'),
});

export type BillingRowInput = z.infer<typeof billingRowSchema>;

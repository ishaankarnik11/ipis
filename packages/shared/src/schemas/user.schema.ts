import { z } from 'zod';

export const UserRole = z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']);
export type UserRole = z.infer<typeof UserRole>;

export const UserStatus = z.enum(['INVITED', 'ACTIVE', 'DEACTIVATED']);
export type UserStatus = z.infer<typeof UserStatus>;

export const createUserSchema = z.object({
  email: z.string().email(),
  role: UserRole,
  name: z.string().min(1).max(255).optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: UserRole.optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: UserStatus.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const systemConfigSchema = z.object({
  standardMonthlyHours: z.number().int().min(1).max(744).optional(),
  healthyMarginThreshold: z.number().min(0).max(1).optional(),
  atRiskMarginThreshold: z.number().min(0).max(1).optional(),
  annualOverheadPerEmployee: z.number().int().min(0).optional(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

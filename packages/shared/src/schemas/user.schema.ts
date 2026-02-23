import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']),
  departmentId: z.string().uuid().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD']).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const systemConfigSchema = z.object({
  standardMonthlyHours: z.number().int().min(1).max(744).optional(),
  healthyMarginThreshold: z.number().min(0).max(1).optional(),
  atRiskMarginThreshold: z.number().min(0).max(1).optional(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

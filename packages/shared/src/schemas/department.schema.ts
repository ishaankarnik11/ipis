import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'name is required').max(100, 'name must be 100 characters or fewer'),
  headUserId: z.string().uuid('headUserId must be a valid UUID').optional().nullable(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  headUserId: z.string().uuid().optional().nullable(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

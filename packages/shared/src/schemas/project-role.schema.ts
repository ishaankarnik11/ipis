import { z } from 'zod';

export const createDesignationSchema = z.object({
  name: z.string().min(1, 'name is required').max(100, 'name must be 100 characters or fewer'),
  departmentId: z.string().uuid('departmentId must be a valid UUID').optional().nullable(),
});

export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;

export const updateDesignationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;

// Backwards-compatible aliases (to be removed after full migration)
export const createProjectRoleSchema = createDesignationSchema;
export const updateProjectRoleSchema = updateDesignationSchema;
export type CreateProjectRoleInput = CreateDesignationInput;
export type UpdateProjectRoleInput = UpdateDesignationInput;

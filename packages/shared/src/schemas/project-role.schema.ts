import { z } from 'zod';

export const createProjectRoleSchema = z.object({
  name: z.string().min(1, 'name is required').max(100, 'name must be 100 characters or fewer'),
});

export type CreateProjectRoleInput = z.infer<typeof createProjectRoleSchema>;

export const updateProjectRoleSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateProjectRoleInput = z.infer<typeof updateProjectRoleSchema>;

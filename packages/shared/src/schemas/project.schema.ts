import { z } from 'zod';

const engagementModelEnum = z.enum([
  'TIME_AND_MATERIALS',
  'FIXED_COST',
  'AMC',
  'INFRASTRUCTURE',
]);

const isoDateString = z.string().min(1).refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Must be a valid date string (e.g., 2026-03-01)' },
);

const baseProjectFields = {
  name: z.string().min(1, 'name is required'),
  client: z.string().min(1, 'client is required'),
  vertical: z.string().min(1, 'vertical is required'),
  startDate: isoDateString,
  endDate: isoDateString,
};

const timeAndMaterialsSchema = z.object({
  ...baseProjectFields,
  engagementModel: z.literal('TIME_AND_MATERIALS'),
  contractValuePaise: z.number().int().positive('contractValuePaise must be positive').optional(),
});

const fixedCostSchema = z.object({
  ...baseProjectFields,
  engagementModel: z.literal('FIXED_COST'),
  contractValuePaise: z.number().int().positive('contractValuePaise must be positive'),
});

const amcSchema = z.object({
  ...baseProjectFields,
  engagementModel: z.literal('AMC'),
  contractValuePaise: z.number().int().positive('contractValuePaise must be positive'),
});

const infrastructureSchema = z.object({
  ...baseProjectFields,
  engagementModel: z.literal('INFRASTRUCTURE'),
  contractValuePaise: z.number().int().positive('contractValuePaise must be positive').optional(),
});

export const createProjectSchema = z.discriminatedUnion('engagementModel', [
  timeAndMaterialsSchema,
  fixedCostSchema,
  amcSchema,
  infrastructureSchema,
]).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'endDate must be after startDate', path: ['endDate'] },
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const rejectProjectSchema = z.object({
  rejectionComment: z.string().min(1, 'rejectionComment is required'),
});

export type RejectProjectInput = z.infer<typeof rejectProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  client: z.string().min(1).optional(),
  vertical: z.string().min(1).optional(),
  engagementModel: engagementModelEnum.optional(),
  contractValuePaise: z.number().int().positive().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const addTeamMemberSchema = z.object({
  employeeId: z.string().uuid('employeeId must be a valid UUID'),
  role: z.string().min(1, 'role is required'),
  billingRatePaise: z.number().int().positive('billingRatePaise must be positive').optional(),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

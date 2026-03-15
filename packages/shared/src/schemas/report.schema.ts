import { z } from 'zod';

export const reportTypeEnum = z.enum([
  'project',
  'executive',
  'company',
  'department',
  'employee',
  'employee-detail',
]);

export const pdfExportRequestSchema = z.object({
  reportType: reportTypeEnum,
  entityId: z.string().uuid().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
});

export type PdfExportRequest = z.infer<typeof pdfExportRequestSchema>;
export type ReportType = z.infer<typeof reportTypeEnum>;

export const shareRequestSchema = z.object({
  reportType: reportTypeEnum,
  entityId: z.string().uuid().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
});

export const shareResponseSchema = z.object({
  token: z.string().uuid(),
  shareUrl: z.string(),
  expiresAt: z.string(),
});

export type ShareRequest = z.infer<typeof shareRequestSchema>;
export type ShareResponse = z.infer<typeof shareResponseSchema>;

import { z } from 'zod';

// Lead status validation
export const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted']);

// Lead update validation
export const leadUpdateSchema = z.object({
  status: leadStatusSchema,
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
});

// Admin search parameters validation
export const adminSearchSchema = z.object({
  search: z.string().optional(),
  period: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
  status: leadStatusSchema.optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Admin analytics parameters validation
export const adminAnalyticsSchema = z.object({
  period: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  metrics: z.array(z.enum(['leads', 'conversions', 'revenue', 'engagement'])).default(['leads']),
});

// Email campaign validation
export const emailCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  target_audience: z.array(z.string()).min(1),
  scheduled_at: z.string().datetime().optional(),
});

// Admin user validation
export const adminUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.string()).optional(),
});

// Export parameters validation
export const exportSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  filters: z.record(z.string(), z.any()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

// Type exports
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type AdminSearchInput = z.infer<typeof adminSearchSchema>;
export type AdminAnalyticsInput = z.infer<typeof adminAnalyticsSchema>;
export type EmailCampaignInput = z.infer<typeof emailCampaignSchema>;
export type AdminUserInput = z.infer<typeof adminUserSchema>;
export type ExportInput = z.infer<typeof exportSchema>;

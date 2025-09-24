import { z } from 'zod'
// Enable ZodError.errors -> .issues compatibility shim
import '../../polyfills/zod-errors-compat'

// ============================================================================
// CHAT VALIDATION
// ============================================================================

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
  id: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional()
})

export const chatRequestSchema = z.object({
  version: z.literal('v1'),
  messages: z.array(chatMessageSchema).min(1).max(50),
  model: z.string().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional()
})

// ============================================================================
// INTELLIGENCE VALIDATION  
// ============================================================================

export const leadCaptureSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  message: z.string().max(1000).optional(),
  source: z.string().default('chat'),
  sessionId: z.string().optional()
})

export const sessionInitSchema = z.object({
  sessionId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  companyUrl: z.string().url().optional()
})

// ============================================================================
// TRANSLATION VALIDATION
// ============================================================================

export const translationRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.string().min(2).max(10),
  sourceLang: z.string().min(2).max(10).optional(),
  sessionId: z.string().optional()
})

// ============================================================================
// LEAD RESEARCH VALIDATION
// ============================================================================

export const leadResearchSchema = z.object({
  sessionId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  companyUrl: z.string().url().optional(),
  provider: z.string().default('google')
})

// ============================================================================
// ADMIN VALIDATION
// ============================================================================

export const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted'])

export const leadUpdateSchema = z.object({
  status: leadStatusSchema,
  notes: z.string().optional(),
  assigned_to: z.string().optional()
})

export const adminSearchSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.string(), z.any()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================

export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).default(['image/*', 'application/pdf', 'text/*'])
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+()\-\s]/g, '').trim()
}

export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>
export type SessionInitInput = z.infer<typeof sessionInitSchema>
export type TranslationRequest = z.infer<typeof translationRequestSchema>
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>
export type AdminSearchInput = z.infer<typeof adminSearchSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type LeadResearchInput = z.infer<typeof leadResearchSchema>
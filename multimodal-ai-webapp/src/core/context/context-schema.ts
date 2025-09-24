import { z } from 'zod'

export const ConsentInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyUrl: z.string().url().optional()
})

export const SessionInitInput = z.object({
  sessionId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  companyUrl: z.string().url().optional()
})

export type ConsentInput = z.infer<typeof ConsentInput>
export type SessionInitInput = z.infer<typeof SessionInitInput>


export const CompanySchema = z.object({
  name: z.string(),
  domain: z.string(),
  industry: z.string().optional(),
  size: z.string().optional(),
  summary: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().url().optional(),
})

export const PersonSchema = z.object({
  fullName: z.string(),
  role: z.string().optional(),
  seniority: z.string().optional(),
  profileUrl: z.string().url().optional(),
  company: z.string().optional(),
})

export const ContextSnapshotSchema = z.object({
  lead: z.object({ email: z.string().email(), name: z.string().optional().default('') }),
  company: CompanySchema.optional(),
  person: PersonSchema.optional(),
  role: z.string().optional(),
  roleConfidence: z.number().min(0).max(1).optional(),
  intent: z.object({ type: z.string(), confidence: z.number(), slots: z.record(z.string(), z.any()) }).optional(),
  capabilities: z.array(z.string()).default([]),
})

export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>



/**
 * Job type definitions for the Redis queue system
 */

export type JobPriority = 'low' | 'medium' | 'high'

export interface Job<T = any> {
  id: string
  type: string
  payload: T
  priority: JobPriority
  createdAt: number
  attempts: number
  maxAttempts: number
  error?: string
}

export interface JobOptions {
  priority?: JobPriority
  maxAttempts?: number
  delay?: number // Delay in milliseconds before processing
}

export type JobHandler<T = any> = (payload: T, job: Job<T>) => Promise<void>

/**
 * Supported job types
 */
export enum JobType {
  WAL_SYNC = 'wal_sync',
  GENERATE_PDF = 'generate_pdf',
  SEND_EMAIL = 'send_email',
  PROCESS_EMBEDDING = 'process_embedding',
  RETRY_AGENT_PERSISTENCE = 'retry-agent-persistence',
  AGENT_ANALYTICS = 'agent-analytics',
}

interface WalSyncPayload {
  sessionId: string
  entryId: string
  operation: 'add_text' | 'add_voice' | 'add_visual' | 'add_upload'
  payload: any
  timestamp: string
}

interface GeneratePdfPayload {
  sessionId: string
  content: any
  options?: any
}

interface SendEmailPayload {
  to: string
  subject: string
  body: string
  attachments?: Array<{ filename: string; url: string }>
}

interface ProcessEmbeddingPayload {
  sessionId: string
  text: string
  kind: string
}

export type JobPayloadMap = {
  [JobType.WAL_SYNC]: WalSyncPayload
  [JobType.GENERATE_PDF]: GeneratePdfPayload
  [JobType.SEND_EMAIL]: SendEmailPayload
  [JobType.PROCESS_EMBEDDING]: ProcessEmbeddingPayload
}


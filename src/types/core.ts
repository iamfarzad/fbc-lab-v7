/**
 * CANONICAL TYPE DEFINITIONS
 * DO NOT CREATE MESSAGE TYPES ANYWHERE ELSE
 * 
 * This is the SINGLE SOURCE OF TRUTH for core types.
 * Import these types instead of creating duplicates.
 */

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  type?: 'text' | 'tool' | 'multimodal' | 'meta'
  isStreaming?: boolean
  isComplete?: boolean
  finalChunk?: boolean
  error?: {
    code: string
    message: string
  }
  attachments?: Attachment[]
  usage?: TokenUsage
  toolCalls?: number
  mode?: string
  [key: string]: unknown // For extension, but typed
}

export interface Attachment {
  id: string
  type: 'image' | 'audio' | 'video' | 'document'
  url: string
  mimeType: string
  size?: number
  name?: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// Re-export as UnifiedMessage for backward compatibility during migration
// TODO: After full migration, remove this alias and use Message everywhere
export type UnifiedMessage = Message

// Context types
export interface ChatContext {
  sessionId?: string
  leadContext?: LeadContext
  intelligenceContext?: unknown
  conversationIds?: string[]
  adminId?: string
  multimodalData?: MultimodalData
  attachments?: Attachment[]
  [key: string]: unknown
}

export interface LeadContext {
  name?: string
  email?: string
  company?: string
  role?: string
  industry?: string
}

export interface MultimodalData {
  audioData?: string | Uint8Array
  imageData?: string | Uint8Array
  videoData?: string | Uint8Array
}

// Chat capabilities
export interface ChatCapabilities {
  supportsStreaming: boolean
  supportsMultimodal: boolean
  supportsRealtime: boolean
  maxTokens: number
}


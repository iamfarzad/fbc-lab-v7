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
  // Extended, typed metadata used across AI Elements UI
  sources?: Source[]
  reasoning?: string
  reasoningDuration?: number
  reasoningSteps?: ReasoningStep[]
  codeBlocks?: CodeBlock[]
  actions?: MessageAction[]
  artifacts?: Artifact[]
  reactions?: MessageReaction[]
  researchSummary?: ResearchSummary
  toolInvocations?: ToolInvocation[]
  // Server-emitted tool-call (HTTP chat path)
  toolCall?: {
    id?: string
    tool: string
    arguments?: Record<string, unknown>
    requiresApproval?: boolean
    timestamp?: string
  }
  annotations?: Array<Record<string, unknown>>
  chainOfThought?: {
    steps: Array<{
      label: string
      description?: string
      status: 'complete' | 'active' | 'pending'
      timestamp?: number
    }>
  }
  tools?: Array<{
    name: string
    type: string
    state: 'running' | 'complete' | 'error'
    input?: unknown
    output?: unknown
    error?: string
  }>
  agent?: string
  contextUsage?: ContextUsage
  images?: ImageDescriptor[]
  inlineCitations?: InlineCitation[]
  tasks?: TaskDescriptor[]
  webPreview?: {
    url: string
    title: string
    description?: string
  }
  followUp?: string
  [key: string]: unknown // For future extension, but prefer adding typed fields above
}

export interface Attachment {
  id: string
  type: 'image' | 'audio' | 'video' | 'document'
  url: string
  mimeType: string
  size?: number
  name?: string
  // Optional enhanced fields for attachments pipeline
  analysis?: string
  summary?: string
  pages?: number
  uploadedAt?: string
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

// --- Enhanced metadata helper types ---
export interface Source {
  id: string
  title: string
  url: string
  snippet?: string
  description?: string
  relevanceScore?: number
  type?: 'web' | 'document' | 'database' | 'api' | 'local'
  metadata?: Record<string, unknown>
}

export interface CodeBlock {
  id: string
  code: string
  language: string
  showLineNumbers?: boolean
  title?: string
  description?: string
  isExecutable?: boolean
  canCopy?: boolean
  canDownload?: boolean
  theme?: string
}

export interface ReasoningStep {
  step: number
  content: string
  duration?: number
  confidence?: number
  type?: 'analysis' | 'planning' | 'execution' | 'verification'
}

export interface MessageAction {
  id: string
  type: 'copy' | 'edit' | 'delete' | 'regenerate' | 'retry' | 'share' | 'download' | 'custom'
  label: string
  icon?: string
  tooltip?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  onClick?: () => void | Promise<void>
  disabled?: boolean
  requiresConfirmation?: boolean
  confirmationMessage?: string
}

export interface Artifact {
  id: string
  type: 'file' | 'chart' | 'table' | 'diagram' | 'custom'
  content: string | Record<string, unknown>
  title?: string
  description?: string
  metadata?: Record<string, unknown>
  downloadUrl?: string
  previewUrl?: string
}

export interface MessageReaction {
  emoji: string
  count: number
  users: string[]
  userReacted?: boolean
}

export interface ResearchSummary {
  query?: string
  combinedAnswer?: string
  urlsUsed?: string[]
  citationCount?: number
  searchGroundingUsed?: number
  urlContextUsed?: number
  error?: string
  [key: string]: unknown
}

export interface ToolInvocation {
  toolCallId?: string
  name?: string
  arguments?: Record<string, unknown>
  result?: unknown
  state?: string
  [key: string]: unknown
}

export interface ContextUsage {
  usedTokens: number
  maxTokens: number
  usage: number
  modelId: string
}

export interface ImageDescriptor {
  base64: string
  mediaType: string
  alt: string
}

export interface InlineCitation {
  url: string
  title: string
  text: string
}

export interface TaskDescriptor {
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  files?: Array<{ name: string }>
}

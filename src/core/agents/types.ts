import type { ConversationFlowState } from '@/components/chat/hooks/useConversationFlow'

export interface AgentContext {
  sessionId: string
  intelligenceContext?: IntelligenceContext
  conversationFlow?: ConversationFlowState
  multimodalContext?: MultimodalContextData
  // mode removed - transport determined by connection type (HTTP vs WebSocket)
  voiceActive?: boolean
  stage?: FunnelStage
}

export interface IntelligenceContext {
  email: string
  name: string
  lead?: {
    name: string
    email: string
  }
  company?: {
    name: string
    domain?: string
    industry?: string
    size?: string
    summary?: string
  }
  person?: {
    fullName: string
    role?: string
    seniority?: string
    profileUrl?: string
  }
  role?: string
  roleConfidence?: number
  fitScore?: {
    workshop: number
    consulting: number
  }
  leadScore?: number
  pitchDelivered?: boolean
  calendarBooked?: boolean
}

export interface MultimodalContextData {
  hasRecentImages: boolean
  hasRecentAudio: boolean
  hasRecentUploads: boolean
  recentAnalyses: string[]
  recentUploads: string[]
}

export type FunnelStage =
  | 'DISCOVERY'
  | 'SCORING'
  | 'WORKSHOP_PITCH'
  | 'CONSULTING_PITCH'
  | 'CLOSING'
  | 'SUMMARY'
  | 'PROPOSAL'
  | 'ADMIN'
  | 'RETARGETING'

export interface AgentResult {
  output: string
  agent: string
  model?: any
  metadata?: {
    stage?: FunnelStage
    multimodalUsed?: boolean
    handoffReasons?: string[]
    leadScore?: number
    fitScore?: { workshop: number; consulting: number }
    [key: string]: any
  }
}

// Use canonical Message type from @/types/core
export type { Message as ChatMessage } from '@/types/core'

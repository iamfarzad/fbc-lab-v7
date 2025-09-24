/**
 * 🔧 MASTER FLOW: Unified Types Export
 * Single source of truth for all types
 */

// Chat types (from unified-types.ts) 
export * from '../chat/unified-types'

// Intelligence types (avoid conflicts)
export type {
  ContextSnapshot,
  CompanyContext,
  PersonContext,
  IntentResult,
  Suggestion,
  Stage,
  ToolRunInput,
  ToolRunResult,
  RoleDetectionResult,
  ResearchResult
} from './intelligence'

// Conversation types
export type {
  ConversationRecord
} from './conversations'
/**
 * Multi-Agent System for F.B/c Sales Funnel
 * 
 * Architecture:
 * - Discovery Agent: Systematically qualifies leads (6 categories)
 * - Scoring Agent: Calculates lead score + fit scores
 * - Sales Agents: Workshop or Consulting pitch based on fit
 * - Closer Agent: Handles objections
 * - Summary Agent: Post-conversation analysis
 * 
 * All agents are multimodal-aware and share context via orchestrator
 */

export { routeToAgent, getCurrentStage } from './orchestrator'
export { discoveryAgent } from './discovery-agent'
export { scoringAgent } from './scoring-agent'
export { workshopSalesAgent } from './workshop-sales-agent'
export { consultingSalesAgent } from './consulting-sales-agent'
export { closerAgent } from './closer-agent'
export { summaryAgent } from './summary-agent'

export type { 
  AgentContext, 
  AgentResult, 
  FunnelStage,
  IntelligenceContext,
  MultimodalContextData,
  ChatMessage
} from './types'

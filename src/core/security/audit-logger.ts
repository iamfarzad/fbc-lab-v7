import { getSupabaseService } from '@/src/lib/supabase'

export interface AuditEvent {
  sessionId: string
  event: 
    | 'pii_detected' 
    | 'context_archived' 
    | 'pdf_generated' 
    | 'data_deleted' 
    | 'wal_recovery' 
    | 'redis_failure'
    | 'agent_routed'          // NEW
    | 'agent_stage_transition' // NEW
    | 'agent_execution'        // NEW
    | 'tool_executed'          // NEW
  details: Record<string, any>
  timestamp?: string
}

/**
 * Audit Logger for compliance tracking (GDPR, SOC2, etc.)
 * 
 * Logs all security-relevant events to Supabase audit_log table
 * Non-blocking - failures don't interrupt normal operations
 */
class AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    try {
      const supabase = getSupabaseService()

      const { error } = await supabase.from('audit_log').insert({
        session_id: event.sessionId,
        event: event.event,
        details: event.details,
        timestamp: event.timestamp || new Date().toISOString(),
        user_agent: process.env.VERCEL_REGION || 'server',
        ip_hash: 'server-side' // TODO: Hash client IP if available from request headers
      })

      if (error) {
        console.error('Audit log insert failed:', error)
        // Don't throw - audit failure shouldn't break operations
      } else {
        console.log(`Audit logged: ${event.event} for ${event.sessionId}`)
      }
    } catch (err) {
      console.error('Audit logger error:', err)
      // Silent failure - audit is important but not critical path
    }
  }

  /**
   * Log PII detection event
   */
  async logPIIDetection(sessionId: string, types: string[], count: number, redacted: boolean): Promise<void> {
    await this.log({
      sessionId,
      event: 'pii_detected',
      details: { types, count, redacted }
    })
  }

  /**
   * Log context archival event
   */
  async logContextArchived(sessionId: string, messageCount: number, modalities: string[]): Promise<void> {
    await this.log({
      sessionId,
      event: 'context_archived',
      details: { messageCount, modalities }
    })
  }

  /**
   * Log PDF generation event
   */
  async logPDFGenerated(sessionId: string, pdfPath: string, size: number): Promise<void> {
    await this.log({
      sessionId,
      event: 'pdf_generated',
      details: { pdfPath, size }
    })
  }

  /**
   * Log data deletion event (GDPR)
   */
  async logDataDeletion(sessionId: string, reason: string, deletedItems: string[]): Promise<void> {
    await this.log({
      sessionId,
      event: 'data_deleted',
      details: { reason, deletedItems }
    })
  }

  /**
   * Log WAL recovery event (disaster recovery)
   */
  async logWALRecovery(sessionId: string, entriesRecovered: number): Promise<void> {
    await this.log({
      sessionId,
      event: 'wal_recovery',
      details: { entriesRecovered }
    })
  }

  /**
   * Log Redis failure (monitoring)
   */
  async logRedisFailure(sessionId: string, operation: string, error: string): Promise<void> {
    await this.log({
      sessionId,
      event: 'redis_failure',
      details: { operation, error }
    })
  }

  /**
   * Log agent routing decision
   */
  async logAgentRouted(
    sessionId: string,
    agent: string,
    stage: string,
    trigger: string,
    metadata: {
      previousStage?: string
      conversationFlow?: any
      intelligenceContext?: any
      routingReason?: string
    }
  ): Promise<void> {
    await this.log({
      sessionId,
      event: 'agent_routed',
      details: {
        agent,
        stage,
        trigger,
        ...metadata
      }
    })
  }

  /**
   * Log stage transition
   */
  async logStageTransition(
    sessionId: string,
    fromStage: string,
    toStage: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      sessionId,
      event: 'agent_stage_transition',
      details: {
        fromStage,
        toStage,
        reason,
        ...metadata
      }
    })
  }

  /**
   * Log agent execution with performance metrics
   */
  async logAgentExecution(
    sessionId: string,
    agent: string,
    stage: string,
    performance: {
      startTime: number
      endTime: number
      duration: number
      success: boolean
      error?: string
    },
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      sessionId,
      event: 'agent_execution',
      details: {
        agent,
        stage,
        performance,
        ...metadata
      }
    })
  }

  /**
   * Log tool execution with performance metrics
   */
  async logToolExecution(
    sessionId: string,
    toolName: string,
    agent: string,
    performance: {
      duration: number
      success: boolean
      error?: string
    },
    metadata: {
      inputs?: any
      outputs?: any
      cached?: boolean
      attempt?: number
    }
  ): Promise<void> {
    await this.log({
      sessionId,
      event: 'tool_executed',
      details: {
        toolName,
        agent,
        performance,
        ...metadata
      }
    })
  }
}

export const auditLog = new AuditLogger()


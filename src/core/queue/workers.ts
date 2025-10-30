import { getSupabaseService } from '@/src/lib/supabase'
import { JobType } from './job-types'
import { redisQueue } from './redis-queue'
import { vercelCache } from '@/lib/vercel-cache'

const MAX_RETRIES = 5
const DEAD_LETTER_QUEUE = 'dead-letter-agent-persistence'

/**
 * Check if an event has already been processed (for idempotency)
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  try {
    const key = `processed-event:${eventId}`
    const exists = await vercelCache.get('processed-events', key)
    return !!exists
  } catch {
    return false
  }
}

/**
 * Mark an event as processed (for idempotency)
 */
async function markEventProcessed(eventId: string): Promise<void> {
  const key = `processed-event:${eventId}`
  await vercelCache.set('processed-events', key, { processedAt: Date.now() }, {
    ttl: 604800, // 7 days
    tags: ['processed-events']
  })
}

/**
 * Register all job handlers
 * Handlers are automatically invoked when jobs are enqueued (low-load processing)
 */
export function registerWorkers(): void {
  // WAL Sync Worker
  redisQueue.registerHandler(JobType.WAL_SYNC, async (payload: any) => {
    const { sessionId, entryId, operation, payload: entryPayload, timestamp } = payload

    const supabase = getSupabaseService()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Store in Supabase wal_log table
    const { error } = await supabase.from('wal_log').insert({
      id: entryId,
      session_id: sessionId,
      operation,
      payload: entryPayload,
      timestamp,
      synced_at: new Date().toISOString()
    })

    if (error) {
      throw new Error(`WAL sync failed: ${error.message}`)
    }

    console.log(`✅ WAL synced to Supabase via queue: ${entryId}`)
  })

  // PDF Generation Worker (placeholder for future)
  redisQueue.registerHandler(JobType.GENERATE_PDF, async (payload: any) => {
    // TODO: Implement PDF generation
    console.log('PDF generation job received:', payload)
    throw new Error('PDF generation not yet implemented')
  })

  // Email Sending Worker (placeholder for future)
  redisQueue.registerHandler(JobType.SEND_EMAIL, async (payload: any) => {
    // TODO: Implement email sending
    console.log('Email sending job received:', payload)
    throw new Error('Email sending not yet implemented')
  })

  // Embedding Processing Worker (placeholder for future)
  redisQueue.registerHandler(JobType.PROCESS_EMBEDDING, async (payload: any) => {
    // TODO: Implement background embedding processing
    console.log('Embedding processing job received:', payload)
    throw new Error('Embedding processing not yet implemented')
  })

  // Retry Agent Persistence Worker
  redisQueue.registerHandler(JobType.RETRY_AGENT_PERSISTENCE, async (payload: any) => {
    const { sessionId, eventId, data, retryCount } = payload
    
    // Check if already processed (idempotency)
    const processed = await checkEventProcessed(eventId)
    if (processed) {
      console.log(`✅ Event already processed: ${eventId}`)
      return
    }
    
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ Max retries (${MAX_RETRIES}) reached for ${sessionId}/${eventId}`)
      
      // Move to dead letter queue for human review
      await redisQueue.enqueue(DEAD_LETTER_QUEUE, {
        ...payload,
        failedAt: Date.now(),
        reason: 'max_retries_exceeded'
      }, { priority: 'high' })
      
      // Track dead letter metric
      console.error(`[METRIC] dead_letter session=${sessionId} event=${eventId} reason=max_retries_exceeded`)
      return
    }
    
    try {
      const { ContextStorage } = await import('../context/context-storage')
      const storage = new ContextStorage()
      
      // Attempt with version check
      await storage.updateWithVersionCheck(sessionId, data, {
        attempts: 2,
        backoff: 100
      })
      
      console.log(`✅ Retry ${retryCount + 1} successful for ${sessionId}/${eventId}`)
      
      // Mark event as processed in Redis
      await markEventProcessed(eventId)
      
      // Clear fallback from Redis
      await vercelCache.delete('agent-fallback', `${sessionId}:${eventId}`)
      
      // Clear analytics_pending flag
      await storage.update(sessionId, { analytics_pending: false })
      
    } catch (error) {
      console.error(`Retry ${retryCount + 1} failed for ${eventId}:`, error)
      
      // Calculate exponential backoff (max 5 minutes)
      const delay = Math.min(Math.pow(2, retryCount + 1) * 1000, 300000)
      
      // Re-queue with incremented retry count
      await redisQueue.enqueue(JobType.RETRY_AGENT_PERSISTENCE, {
        ...payload,
        retryCount: retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }, {
        priority: 'high',
        delay
      })
      
      // Track retry queued metric
      console.log(`[METRIC] retry_queued session=${sessionId} event=${eventId} attempt=${retryCount + 1}`)
    }
  })

  // Agent Analytics Worker
  redisQueue.registerHandler(JobType.AGENT_ANALYTICS, async (payload: any) => {
    const { sessionId, eventId, agent, stage, timestamp, leadScore, fitScore, multimodalUsed, hasEmail } = payload
    
    try {
      // Log to analytics (could be Supabase audit_log or external service)
      const supabase = getSupabaseService()
      if (supabase) {
        // Try to log to audit_log if table exists
        const { error } = await supabase.from('audit_log').insert({
          event: 'agent_executed',
          session_id: sessionId,
          metadata: {
            eventId,
            agent,
            stage,
            timestamp,
            leadScore,
            fitScore,
            multimodalUsed,
            hasEmail
          },
          created_at: new Date().toISOString()
        }).catch(() => {
          // Table might not exist, that's ok
          return { error: null }
        })
        
        if (error) {
          console.warn('Failed to log to audit_log (non-fatal):', error)
        }
      }
      
      // Also mark analytics as complete in context
      const { ContextStorage } = await import('../context/context-storage')
      const storage = new ContextStorage()
      await storage.update(sessionId, { analytics_pending: false })
      
      console.log(`📊 Analytics logged: ${agent} at ${stage} for session ${sessionId}`)
    } catch (error) {
      console.error('Analytics logging failed (non-fatal):', error)
    }
  })
}

/**
 * Initialize workers (call this once on app startup)
 * For low-load scenarios, jobs process immediately when enqueued
 * No separate background processor needed
 */
export function initializeWorkers(): void {
  registerWorkers()
  console.log('✅ Queue workers initialized (immediate processing mode)')
}

/**
 * Start background queue processing (OPTIONAL - only needed for high-load scenarios)
 * For low-load, jobs process immediately when enqueued, so this is not required
 * 
 * @deprecated For low-load scenarios, use initializeWorkers() instead
 */
export async function startQueueProcessor(): Promise<void> {
  // Register all workers
  registerWorkers()

  // Process queue every 5 seconds
  const interval = setInterval(async () => {
    try {
      const processed = await redisQueue.processQueue(undefined, 10)
      if (processed > 0) {
        console.log(`🔄 Processed ${processed} jobs from queue`)
      }
    } catch (error) {
      console.error('Queue processor error:', error)
    }
  }, 5000)

  // Store interval ID for cleanup (if needed)
  ;(globalThis as any).__queueProcessorInterval = interval

  console.log('✅ Queue processor started (background mode)')
}

/**
 * Stop queue processing (for testing or graceful shutdown)
 */
export function stopQueueProcessor(): void {
  const interval = (globalThis as any).__queueProcessorInterval
  if (interval) {
    clearInterval(interval)
    delete (globalThis as any).__queueProcessorInterval
    console.log('🛑 Queue processor stopped')
  }
}


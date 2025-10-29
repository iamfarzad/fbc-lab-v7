import { getSupabaseService } from '@/src/lib/supabase'
import { JobType } from './job-types'
import { redisQueue } from './redis-queue'

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


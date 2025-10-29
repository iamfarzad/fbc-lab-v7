import { vercelCache } from '@/lib/vercel-cache'
import { getSupabaseService } from '@/src/lib/supabase'
import { MultimodalContext, ConversationEntry, AudioEntry, VisualEntry, UploadEntry } from './context-types'
import { createInitialContext } from './multimodal-context'
import { redisQueue } from '../queue/redis-queue'
import { JobType } from '../queue/job-types'

interface WALEntry {
  id: string
  sessionId: string
  operation: 'add_text' | 'add_voice' | 'add_visual' | 'add_upload'
  payload: ConversationEntry | AudioEntry | VisualEntry | UploadEntry
  timestamp: string
  synced: boolean
}

class WriteAheadLog {
  private pendingWrites: Map<string, WALEntry[]> = new Map()

  async logOperation(
    sessionId: string,
    operation: WALEntry['operation'],
    payload: WALEntry['payload']
  ): Promise<void> {
    const entry: WALEntry = {
      id: crypto.randomUUID(),
      sessionId,
      operation,
      payload,
      timestamp: new Date().toISOString(),
      synced: false
    }

    // 1. Write to Redis WAL immediately (fast, critical path)
    try {
      const walKey = `wal_${sessionId}_${entry.id}`
      await vercelCache.set('wal', walKey, entry, { ttl: 86400 }) // 24h TTL
      // Only log success if Redis is actually configured
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        console.log(`✅ WAL entry logged to Redis: ${operation} for ${sessionId}`)
      }
    } catch (err) {
      console.error('❌ WAL write to Redis failed:', err)
      // Don't throw if Redis is not configured - allow graceful degradation
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        throw err // Critical failure only if Redis is supposed to be available
      } else {
        console.warn('⚠️ Redis not configured - WAL logging skipped (in-memory only)')
      }
    }

    // 2. Add to pending queue (in-memory for recovery)
    const pending = this.pendingWrites.get(sessionId) || []
    pending.push(entry)
    this.pendingWrites.set(sessionId, pending)

    // 3. Enqueue job for background sync to Supabase via Redis queue
    redisQueue.enqueue(JobType.WAL_SYNC, {
      sessionId: entry.sessionId,
      entryId: entry.id,
      operation: entry.operation,
      payload: entry.payload,
      timestamp: entry.timestamp
    }, {
      priority: 'medium',
      maxAttempts: 3
    }).catch(err => {
      console.error('Failed to enqueue WAL sync job (non-fatal):', err)
      // Fallback to old fire-and-forget method if queue fails
      this.backgroundSync(sessionId).catch(fallbackErr =>
        console.error('Background WAL sync fallback failed:', fallbackErr)
      )
    })
  }

  private async backgroundSync(sessionId: string): Promise<void> {
    const pending = this.pendingWrites.get(sessionId) || []
    if (pending.length === 0) return

    try {
      const supabase = getSupabaseService()
      
      // Check if Supabase is properly configured
      if (!supabase || supabase === null as any) {
        console.warn('⚠️ WAL sync skipped - Supabase not configured')
        return
      }

      for (const entry of pending) {
        if (entry.synced) continue

        try {
          // Store in Supabase wal_log table
          const { error } = await supabase.from('wal_log').insert({
            id: entry.id,
            session_id: entry.sessionId,
            operation: entry.operation,
            payload: entry.payload,
            timestamp: entry.timestamp,
            synced_at: new Date().toISOString()
          })

          if (error) throw error

          entry.synced = true
          console.log(`✅ WAL synced to Supabase: ${entry.id}`)
        } catch (err) {
          console.error(`❌ WAL sync failed for ${entry.id}:`, err)
          break // Stop on first failure, will retry later
        }
      }

      // Remove synced entries
      const stillPending = pending.filter(e => !e.synced)
      if (stillPending.length === 0) {
        this.pendingWrites.delete(sessionId)
      } else {
        this.pendingWrites.set(sessionId, stillPending)
      }
    } catch (err) {
      console.error('WAL background sync error:', err)
    }
  }

  /**
   * Recover context from WAL entries (disaster recovery)
   * Used when Redis and memory are lost but Supabase WAL survives
   */
  async recoverFromWAL(sessionId: string): Promise<MultimodalContext | null> {
    try {
      const supabase = getSupabaseService()
      
      // Check if Supabase is properly configured
      if (!supabase || supabase === null as any) {
        console.warn('⚠️ WAL recovery skipped - Supabase not configured')
        return null
      }

      const { data: walEntries, error } = await supabase
        .from('wal_log')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })

      if (error || !walEntries || walEntries.length === 0) {
        return null
      }

      // Rebuild context from WAL entries
      const context = createInitialContext(sessionId)

      for (const entry of walEntries) {
        switch (entry.operation) {
          case 'add_text':
            context.conversationHistory.push(entry.payload as ConversationEntry)
            break
          case 'add_voice':
            context.audioContext.push(entry.payload as AudioEntry)
            // Also add to conversation history if final
            if ((entry.payload as AudioEntry).data.isFinal) {
              context.conversationHistory.push({
                id: entry.payload.id,
                timestamp: entry.payload.timestamp,
                content: (entry.payload as AudioEntry).data.transcript || '',
                modality: 'audio',
                metadata: {
                  speaker: entry.payload.type === 'voice_input' ? 'user' : 'model'
                }
              })
            }
            break
          case 'add_visual':
            context.visualContext.push(entry.payload as VisualEntry)
            break
          case 'add_upload':
            context.uploadContext.push(entry.payload as UploadEntry)
            break
        }
      }

      console.log(`✅ Recovered context from ${walEntries.length} WAL entries`)
      return context
    } catch (err) {
      console.error('Failed to recover from WAL:', err)
      return null
    }
  }

  /**
   * Force sync all pending writes for a session
   * Called before critical operations like PDF generation
   */
  async flushSession(sessionId: string): Promise<void> {
    const pending = this.pendingWrites.get(sessionId)
    if (!pending || pending.length === 0) return

    console.log(`🔄 Flushing ${pending.length} pending WAL entries for ${sessionId}`)
    await this.backgroundSync(sessionId)

    // Verify all synced
    const stillPending = this.pendingWrites.get(sessionId) || []
    if (stillPending.length > 0) {
      console.error(`⚠️ ${stillPending.length} WAL entries failed to sync`)
      throw new Error(`Failed to flush WAL for session ${sessionId}`)
    }
  }

  /**
   * Get pending write count for monitoring
   */
  getPendingCount(sessionId?: string): number {
    if (sessionId) {
      return this.pendingWrites.get(sessionId)?.length || 0
    }
    return Array.from(this.pendingWrites.values()).reduce(
      (sum, entries) => sum + entries.length,
      0
    )
  }
}

export const walLog = new WriteAheadLog()

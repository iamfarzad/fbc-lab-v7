import { getSupabaseService } from '@/src/lib/supabase'
import { MultimodalContext, DatabaseConversationContext } from './context-types'

// Browser-safe logger (winston is Node.js only)
const logger = {
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
}

// Type-safe conversion for multimodal context storage
type StorableMultimodal = string | MultimodalContext;

function toStorable(ctx: MultimodalContext): StorableMultimodal {
  // If DB column is text, upstream code should treat as string.
  // Keep runtime as string, compile-time as compatible union.
  return JSON.stringify(ctx) as unknown as StorableMultimodal;
}

export class ContextStorage {
  // Use the service client type to avoid Database generic issues.
  private supabase: ReturnType<typeof getSupabaseService> | null
  private inMemoryStorage: Map<string, DatabaseConversationContext>
  private cacheTimestamps: Map<string, number>
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes TTL

  constructor() {
    // Ensure in-memory storage is shared across module instances when Supabase is unavailable
    const globalContext = globalThis as unknown as {
      __fbcContextStore__?: {
        data: Map<string, DatabaseConversationContext>
        timestamps: Map<string, number>
      }
    }

    if (!globalContext.__fbcContextStore__) {
      globalContext.__fbcContextStore__ = {
        data: new Map<string, DatabaseConversationContext>(),
        timestamps: new Map<string, number>()
      }
    }

    this.inMemoryStorage = globalContext.__fbcContextStore__.data
    this.cacheTimestamps = globalContext.__fbcContextStore__.timestamps

    // Try to create Supabase client, fallback to in-memory if unavailable
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.supabase = getSupabaseService()
      } else {
        logger.warn('Supabase credentials not found, falling back to in-memory storage')
        this.supabase = null
      }
    } catch (error) {
      logger.warn('Supabase initialization failed, falling back to in-memory storage:', error)
      this.supabase = null
    }
  }

  async store(sessionId: string, payload: Partial<DatabaseConversationContext>): Promise<void> {
    try {
      const dataToStore = {
        session_id: sessionId,
        email: payload.email || 'unknown@example.com', // Required field
        ...payload,
        updated_at: new Date().toISOString()
      } as DatabaseConversationContext & { updated_at: string }

      // Handle multimodal context
      if ((dataToStore as any).multimodal_context) {
        // Convert to storable format (JSON string for DB)
        (dataToStore as any).multimodal_context = toStorable((dataToStore as any).multimodal_context as unknown as MultimodalContext)
      }

      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          const { error } = await this.supabase
            .from('conversation_contexts')
            .upsert(dataToStore as any)

          if (error) {
            // If the column doesn't exist, try without multimodal_context
            if (error.message?.includes('multimodal_context') || error.message?.includes('tool_outputs')) {
              const dataWithoutExtras = { ...dataToStore } as Record<string, unknown>
              delete dataWithoutExtras.multimodal_context
              delete dataWithoutExtras.tool_outputs
              const { error: retryError } = await this.supabase
                .from('conversation_contexts')
                .upsert(dataWithoutExtras)

              if (retryError) {
                throw retryError
              }
            } else {
              throw error
            }
          }
        } catch (supabaseError) {
          logger.warn('Supabase storage failed, falling back to in-memory:', supabaseError)
          this.inMemoryStorage.set(sessionId, dataToStore)
        }
      } else {
        // Use in-memory storage
        this.inMemoryStorage.set(sessionId, dataToStore)
      }
    } catch (error) {
      logger.error('Context storage failed completely:', error)
      throw error
    }
  }

  // Check if cached data is still valid (not expired)
  private isCacheValid(sessionId: string): boolean {
    const timestamp = this.cacheTimestamps.get(sessionId)
    if (!timestamp) return false
    return (Date.now() - timestamp) < this.CACHE_TTL
  }

  async get(sessionId: string): Promise<DatabaseConversationContext | null> {
    try {
      // Check if we have valid cached data first
      const cachedData = this.inMemoryStorage.get(sessionId)
      if (cachedData && this.isCacheValid(sessionId)) {
        return cachedData
      }

      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('conversation_contexts')
            .select('*')
            .eq('session_id', sessionId)
            .single()

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error
          }

          // Parse multimodal context if it exists as string
          if (data && typeof data.multimodal_context === 'string') {
            try {
              data.multimodal_context = JSON.parse(data.multimodal_context)
            } catch {
              data.multimodal_context = undefined
            }
          }

          // If we got data from Supabase, cache it with timestamp
          if (data) {
            this.inMemoryStorage.set(sessionId, data)
            this.cacheTimestamps.set(sessionId, Date.now())
          }

          return data || null
        } catch (supabaseError) {
          logger.warn('Supabase retrieval failed, trying in-memory fallback:', supabaseError)
          return this.inMemoryStorage.get(sessionId) || null
        }
      } else {
        // Use in-memory storage only
        return this.inMemoryStorage.get(sessionId) || null
      }
    } catch (error) {
      logger.error('Context retrieval failed completely:', error)
      return this.inMemoryStorage.get(sessionId) || null
    }
  }

  // Clean up expired cache entries to prevent memory leaks
  private cleanupExpiredCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [sessionId, timestamp] of this.cacheTimestamps) {
      if ((now - timestamp) > this.CACHE_TTL) {
        expiredKeys.push(sessionId)
      }
    }

    expiredKeys.forEach(sessionId => {
      this.inMemoryStorage.delete(sessionId)
      this.cacheTimestamps.delete(sessionId)
    })

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`)
    }
  }

  async update(sessionId: string, patch: Partial<DatabaseConversationContext>): Promise<void> {
    try {
      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          const { error } = await this.supabase
            .from('conversation_contexts')
            .update({
              ...patch,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)

          if (error) {
            throw error
          }

          // Also update in-memory cache if it exists
          const existing = this.inMemoryStorage.get(sessionId)
          if (existing) {
            this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
          }

          // Periodic cleanup of expired entries
          this.cleanupExpiredCache()
        } catch (supabaseError) {
          logger.warn('Supabase update failed, falling back to in-memory:', supabaseError)
          // Update in-memory storage
          const existing = this.inMemoryStorage.get(sessionId)
          if (existing) {
            this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
          } else {
            // Create new entry if it doesn't exist
            this.inMemoryStorage.set(sessionId, {
              session_id: sessionId,
              email: 'unknown@example.com', // Required field
              ...patch,
              updated_at: new Date().toISOString()
            } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Set cache timestamp
          }

          // Periodic cleanup of expired entries
          this.cleanupExpiredCache()
        }
      } else {
        // Use in-memory storage only
        const existing = this.inMemoryStorage.get(sessionId)
        if (existing) {
          this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
        } else {
          // Create new entry if it doesn't exist
          this.inMemoryStorage.set(sessionId, {
            session_id: sessionId,
            email: 'unknown@example.com', // Required field
            ...patch,
            updated_at: new Date().toISOString()
          } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now()) // Set cache timestamp
        }

        // Periodic cleanup of expired entries
        this.cleanupExpiredCache()
      }
    } catch (error) {
      logger.error('Context update failed completely:', error)
      throw error
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      // Try Supabase first, then in-memory
      if (this.supabase) {
        try {
          const { error } = await this.supabase
            .from('conversation_contexts')
            .delete()
            .eq('session_id', sessionId)

          if (error) {
            throw error
          }
        } catch (supabaseError) {
          logger.warn('Supabase delete failed:', supabaseError)
        }
      }

      // Always delete from in-memory storage
      this.inMemoryStorage.delete(sessionId)
    } catch (error) {
      logger.error('Context deletion failed:', error)
      throw error
    }
  }

  /**
   * Update with optimistic locking to prevent race conditions
   * Uses version field to detect concurrent writes
   */
  async updateWithVersionCheck(
    sessionId: string,
    payload: Partial<DatabaseConversationContext>,
    options: { attempts: number; backoff: number; signal?: AbortSignal }
  ): Promise<void> {
    let attempt = 0
    
    while (attempt < options.attempts) {
      if (options.signal?.aborted) {
        throw new Error('AbortError')
      }
      
      try {
        // Get current version
        const current = await this.get(sessionId)
        const currentVersion = current?.version || 0
        
        const dataToStore = {
          session_id: sessionId,
          email: payload.email || current?.email || 'unknown@example.com',
          ...payload,
          version: currentVersion + 1,
          updated_at: new Date().toISOString()
        }
        
        if (this.supabase) {
          // Optimistic locking query - only update if version matches
          const { data, error } = await this.supabase
            .from('conversation_contexts')
            .update(dataToStore)
            .eq('session_id', sessionId)
            .eq('version', currentVersion)
            .select()
          
          if (error) {
            throw error
          }
          
          if (!data || data.length === 0) {
            // Version mismatch - retry
            throw new Error('VersionConflict')
          }
          
          // Update in-memory cache
          this.inMemoryStorage.set(sessionId, data[0] as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now())
          
          return // Success
        } else {
          // Fallback to in-memory (no version check in memory)
          const existing = this.inMemoryStorage.get(sessionId)
          this.inMemoryStorage.set(sessionId, {
            ...existing,
            ...dataToStore
          } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now())
          return
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'VersionConflict' && attempt < options.attempts - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, options.backoff * Math.pow(2, attempt)))
          attempt++
          continue
        }
        throw error
      }
    }
    
    throw new Error('Max version check attempts exceeded')
  }
}

// Export singleton instance for backward compatibility
export const contextStorage = new ContextStorage()

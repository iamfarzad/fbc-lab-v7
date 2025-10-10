/**
 * Supabase query logger wrapper
 * Wraps Supabase client to log all queries, errors, and slow operations
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const LOG_INGEST_URL = '/api/logs/ingest'
const SLOW_QUERY_THRESHOLD = 1000 // 1 second

async function sendLog(log: any) {
  try {
    // Don't block on logging
    fetch(LOG_INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
      keepalive: true
    }).catch(() => {}) // Silently fail
  } catch {
    // Silently fail - don't break app
  }
}

/**
 * Create a Supabase client with automatic logging
 */
export function createLoggedSupabaseClient(url: string, key: string): SupabaseClient {
  const client = createClient(url, key)

  // Wrap the .from() method to log all queries
  const originalFrom = client.from.bind(client)
  
  client.from = function(table: string) {
    const query = originalFrom(table)
    const startTime = Date.now()
    let operation = 'unknown'

    // Wrap common query methods
    const wrapMethod = (method: string, originalMethod: Function) => {
      return async function(...args: any[]) {
        operation = method
        const methodStartTime = Date.now()
        
        try {
          const result = await originalMethod.apply(this, args)
          const duration = Date.now() - methodStartTime

          // Log slow queries
          if (duration > SLOW_QUERY_THRESHOLD) {
            await sendLog({
              service: 'supabase',
              level: 'warn',
              message: `Slow query: ${operation} on ${table} (${duration}ms)`,
              timestamp: new Date().toISOString(),
              meta: {
                table,
                operation,
                duration,
                threshold: SLOW_QUERY_THRESHOLD
              }
            })
          }

          // Log errors
          if (result.error) {
            await sendLog({
              service: 'supabase',
              level: 'error',
              message: `Database error: ${result.error.message}`,
              timestamp: new Date().toISOString(),
              meta: {
                table,
                operation,
                error: result.error,
                code: result.error.code,
                details: result.error.details,
                hint: result.error.hint
              }
            })
          }

          return result
        } catch (error) {
          // Log exceptions
          await sendLog({
            service: 'supabase',
            level: 'error',
            message: `Database exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            meta: {
              table,
              operation,
              error: error instanceof Error ? error.stack : String(error)
            }
          })
          throw error
        }
      }
    }

    // Wrap all query methods
    const methods = ['select', 'insert', 'update', 'delete', 'upsert']
    methods.forEach(method => {
      if (typeof (query as any)[method] === 'function') {
        const originalMethod = (query as any)[method].bind(query)
        ;(query as any)[method] = wrapMethod(method, originalMethod)
      }
    })

    return query
  }

  return client
}

/**
 * Log a custom Supabase event (for manual logging)
 */
export async function logSupabaseEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, any>
) {
  await sendLog({
    service: 'supabase',
    level,
    message,
    timestamp: new Date().toISOString(),
    meta
  })
}



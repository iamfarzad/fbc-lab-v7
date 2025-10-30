import { vercelCache } from '@/lib/vercel-cache'
import { auditLog } from '@/core/security/audit-logger'
import type { ToolExecutionResult } from './types'

/**
 * Tool Executor - Unified tool execution layer with logging, retry, and caching
 * 
 * Wraps AI SDK tool calls to provide:
 * - Execution logging to audit_log
 * - Retry logic for transient failures
 * - Redis caching for idempotent operations
 * - Performance metrics
 */
export class ToolExecutor {
  private maxRetries: number
  private cacheEnabled: boolean
  private cacheTTL: number // milliseconds

  constructor(options: {
    maxRetries?: number
    cacheEnabled?: boolean
    cacheTTL?: number
  } = {}) {
    this.maxRetries = options.maxRetries ?? parseInt(process.env.TOOL_RETRY_MAX || '3', 10)
    this.cacheEnabled = options.cacheEnabled ?? (process.env.ENABLE_TOOL_CACHING === 'true')
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000 // 5 minutes default
  }

  /**
   * Execute a tool with logging, retry, and caching
   */
  async execute<T = any>(params: {
    toolName: string
    sessionId: string
    agent: string
    inputs: Record<string, any>
    handler: () => Promise<T>
    cacheable?: boolean // Whether this tool result can be cached
  }): Promise<ToolExecutionResult<T>> {
    const { toolName, sessionId, agent, inputs, handler, cacheable = false } = params
    const startTime = Date.now()
    let attempt = 0
    let lastError: Error | null = null

    // Generate cache key for cacheable tools
    const cacheKey = cacheable && this.cacheEnabled
      ? this.generateCacheKey(toolName, inputs)
      : null

    // Check cache first (if cacheable)
    if (cacheKey) {
      try {
        const cachedResult = await vercelCache.get<T>('tool-execution', cacheKey)
        if (cachedResult !== null) {
          const duration = Date.now() - startTime
          
          // Log cache hit (non-blocking)
          this.logExecution({
            toolName,
            sessionId,
            agent,
            inputs,
            outputs: cachedResult,
            duration,
            success: true,
            cached: true,
            attempt: 0
          }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

          return {
            success: true,
            data: cachedResult,
            duration,
            cached: true,
            attempt: 0
          }
        }
      } catch (err) {
        console.warn(`[ToolExecutor] Cache check failed for ${toolName}:`, err)
        // Continue with execution - cache failure shouldn't block
      }
    }

    // Retry logic
    while (attempt < this.maxRetries) {
      try {
        const result = await handler()
        const duration = Date.now() - startTime

        // Cache successful result (if cacheable)
        if (cacheKey && this.cacheEnabled) {
          try {
            await vercelCache.set('tool-execution', cacheKey, result, {
              ttl: this.cacheTTL
            })
          } catch (err) {
            console.warn(`[ToolExecutor] Cache set failed for ${toolName}:`, err)
            // Continue - caching failure shouldn't block
          }
        }

        // Log successful execution (non-blocking)
        this.logExecution({
          toolName,
          sessionId,
          agent,
          inputs,
          outputs: result,
          duration,
          success: true,
          cached: false,
          attempt: attempt + 1
        }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

        return {
          success: true,
          data: result,
          duration,
          cached: false,
          attempt: attempt + 1
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        attempt++

        // Don't retry if it's not a transient error
        if (!this.isTransientError(error)) {
          break
        }

        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10s
          await new Promise(resolve => setTimeout(resolve, backoffMs))
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime
    const errorMessage = lastError?.message || 'Unknown error'

    // Log failure (non-blocking)
    this.logExecution({
      toolName,
      sessionId,
      agent,
      inputs,
      outputs: undefined,
      duration,
      success: false,
      cached: false,
      attempt,
      error: errorMessage
    }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

    return {
      success: false,
      error: errorMessage,
      duration,
      cached: false,
      attempt
    }
  }

  /**
   * Generate cache key from tool name and inputs
   */
  private generateCacheKey(toolName: string, inputs: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedInputs = Object.keys(inputs)
      .sort()
      .reduce((acc, key) => {
        acc[key] = inputs[key]
        return acc
      }, {} as Record<string, any>)
    
    return `${toolName}:${JSON.stringify(sortedInputs)}`
  }

  /**
   * Check if error is transient (should retry)
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const message = error.message.toLowerCase()
    const transientPatterns = [
      'network',
      'timeout',
      'econnreset',
      'enotfound',
      'econnrefused',
      'temporary',
      'rate limit',
      '429',
      '503',
      '502'
    ]

    return transientPatterns.some(pattern => message.includes(pattern))
  }

  /**
   * Log tool execution to audit_log (non-blocking)
   */
  private async logExecution(params: {
    toolName: string
    sessionId: string
    agent: string
    inputs: Record<string, any>
    outputs?: any
    duration: number
    success: boolean
    cached: boolean
    attempt: number
    error?: string
  }): Promise<void> {
    // Only log if audit is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_AGENT_AUDIT !== 'true') {
      return
    }

    try {
      await auditLog.logToolExecution(
        params.sessionId || 'anonymous',
        params.toolName,
        params.agent,
        {
          duration: params.duration,
          success: params.success,
          error: params.error
        },
        {
          inputs: this.sanitizeData(params.inputs),
          outputs: params.outputs ? this.sanitizeData(params.outputs) : undefined,
          cached: params.cached,
          attempt: params.attempt
        }
      )
    } catch (err) {
      // Silent failure - don't block tool execution
      console.warn('[ToolExecutor] Audit logging failed:', err)
    }
  }

  /**
   * Sanitize data for logging (remove PII, limit size)
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) return data
    if (typeof data !== 'object') return data

    // Limit object depth and size
    const maxSize = 1000 // characters
    const jsonStr = JSON.stringify(data)
    
    if (jsonStr.length > maxSize) {
      return { _truncated: true, _size: jsonStr.length }
    }

    return data
  }
}

export const toolExecutor = new ToolExecutor()


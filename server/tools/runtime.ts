/**
 * Tool Runtime with strict schemas, deadlines, and parallel execution
 */

import { z } from 'zod'
import type { TraceContext } from '../middleware/trace'

// Tool schemas (strict Zod validation)
const ToolSchemas = {
  search_web: z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    urls: z.array(z.string().url()).optional()
  }),
  capture_screen_snapshot: z.object({
    summaryOnly: z.boolean().optional().default(false)
  }),
  capture_webcam_snapshot: z.object({
    summaryOnly: z.boolean().optional().default(false)
  }),
  get_dashboard_stats: z.object({
    period: z.enum(['1d', '7d', '30d', '90d']).default('7d')
  })
} as const

export type ToolName = keyof typeof ToolSchemas

export interface ToolCall {
  id: string
  name: ToolName
  args: unknown
  deadlineMs: number
}

export interface ToolResult {
  id: string
  name: ToolName
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

export class ToolRuntime {
  private runningTools = new Map<string, AbortController>()
  
  /**
   * Validate tool arguments against schema (without executing)
   */
  validate(call: ToolCall): { valid: boolean; error?: string } {
    const schema = ToolSchemas[call.name]
    
    if (!schema) {
      return { valid: false, error: `Unknown tool: ${call.name}` }
    }

    const parseResult = schema.safeParse(call.args)
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      
      return { valid: false, error: `Schema validation failed: ${errors}` }
    }
    
    return { valid: true }
  }

  /**
   * Execute tool with strict schema validation, deadline, and cancellation support
   */
  async execute(
    call: ToolCall,
    signal: AbortSignal,
    executor: (name: ToolName, args: unknown, signal: AbortSignal) => Promise<unknown>
  ): Promise<ToolResult> {
    const startTime = Date.now()
    const schema = ToolSchemas[call.name]
    
    if (!schema) {
      return {
        id: call.id,
        name: call.name,
        success: false,
        error: `Unknown tool: ${call.name}`,
        durationMs: Date.now() - startTime
      }
    }

    // Validate and coerce arguments
    const parseResult = schema.safeParse(call.args)
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      
      return {
        id: call.id,
        name: call.name,
        success: false,
        error: `Schema validation failed: ${errors}`,
        durationMs: Date.now() - startTime
      }
    }

    // Create abort controller for this tool
    const controller = new AbortController()
    this.runningTools.set(call.id, controller)
    
    // Create deadline controller
    const deadlineController = new AbortController()
    const deadlineTimer = setTimeout(() => deadlineController.abort(), call.deadlineMs)
    
    // Combine user signal with deadline
    const combinedController = new AbortController()
    let cleanupNeeded = true
    
    // Listen to both signals and abort combined controller when either fires
    const onAbort = () => {
      combinedController.abort()
      cleanupNeeded = false
    }
    
    if (!signal.aborted) {
      signal.addEventListener('abort', onAbort, { once: true })
    } else {
      combinedController.abort()
      cleanupNeeded = false
    }
    
    if (!deadlineController.signal.aborted) {
      deadlineController.signal.addEventListener('abort', onAbort, { once: true })
    } else {
      combinedController.abort()
      cleanupNeeded = false
    }
    
    // Link combined signal to controller
    if (combinedController.signal.aborted || signal.aborted) {
      controller.abort()
      cleanupNeeded = false
    } else {
      combinedController.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
      const result = await executor(call.name, parseResult.data, controller.signal)
      const durationMs = Date.now() - startTime
      
      // Cleanup
      clearTimeout(deadlineTimer)
      if (cleanupNeeded && !signal.aborted) {
        signal.removeEventListener('abort', onAbort)
      }
      if (cleanupNeeded && !deadlineController.signal.aborted) {
        deadlineController.signal.removeEventListener('abort', onAbort)
      }
      
      this.trace && console.log(`[TOOL] ${call.name} completed in ${durationMs}ms`)
      
      return {
        id: call.id,
        name: call.name,
        success: true,
        data: result,
        durationMs
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Cleanup
      clearTimeout(deadlineTimer)
      if (cleanupNeeded && !signal.aborted) {
        signal.removeEventListener('abort', onAbort)
      }
      if (cleanupNeeded && !deadlineController.signal.aborted) {
        deadlineController.signal.removeEventListener('abort', onAbort)
      }
      
      const isTimeout = errorMessage.includes('deadline') || errorMessage.includes('timeout') || deadlineController.signal.aborted
      const isCancelled = controller.signal.aborted && !deadlineController.signal.aborted
      
      this.trace && console.warn(`[TOOL] ${call.name} failed: ${errorMessage}`, {
        timeout: isTimeout,
        cancelled: isCancelled,
        durationMs
      })
      
      return {
        id: call.id,
        name: call.name,
        success: false,
        error: errorMessage,
        durationMs
      }
    } finally {
      this.runningTools.delete(call.id)
      // Ensure cleanup happens even if executor doesn't throw
      if (deadlineTimer) clearTimeout(deadlineTimer)
      if (cleanupNeeded && !signal.aborted) {
        try { signal.removeEventListener('abort', onAbort) } catch {}
      }
      if (cleanupNeeded && !deadlineController.signal.aborted) {
        try { deadlineController.signal.removeEventListener('abort', onAbort) } catch {}
      }
    }
  }

  /**
   * Execute multiple tools in parallel with per-tool deadlines
   */
  async executeParallel(
    calls: ToolCall[],
    signal: AbortSignal,
    executor: (name: ToolName, args: unknown, signal: AbortSignal) => Promise<unknown>
  ): Promise<ToolResult[]> {
    const results = await Promise.allSettled(
      calls.map(call => this.execute(call, signal, executor))
    )
    
    return results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        id: calls[i].id,
        name: calls[i].name,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        durationMs: 0
      }
    })
  }

  /**
   * Cancel a running tool
   */
  cancel(toolId: string): boolean {
    const controller = this.runningTools.get(toolId)
    if (controller) {
      controller.abort()
      this.runningTools.delete(toolId)
      return true
    }
    return false
  }

  /**
   * Cancel all running tools
   */
  cancelAll(): void {
    for (const [id, controller] of this.runningTools.entries()) {
      controller.abort()
    }
    this.runningTools.clear()
  }
}

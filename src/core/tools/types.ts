/**
 * Types for tool execution layer
 */

export interface ToolExecutionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  duration: number
  cached: boolean
  attempt: number
}

export interface ToolExecutionOptions {
  maxRetries?: number
  cacheEnabled?: boolean
  cacheTTL?: number
}


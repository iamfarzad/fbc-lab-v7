// Enhanced API error handling and monitoring
export interface APIError {
  code: string
  message: string
  details?: string
  retryable?: boolean
  statusCode?: number
}

export interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>()

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (entry.count >= maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  reset(key: string): void {
    this.limits.delete(key)
  }
}

class PerformanceMonitor {
  private operations = new Map<string, { startTime: number; metadata?: any }>()

  startOperation(operationId: string, metadata?: any): void {
    this.operations.set(operationId, {
      startTime: Date.now(),
      metadata
    })
  }

  endOperation(operationId: string, result: any): void {
    const operation = this.operations.get(operationId)
    if (operation) {
      const duration = Date.now() - operation.startTime
      console.log(`Operation ${operationId} completed in ${duration}ms`, result)
      this.operations.delete(operationId)
    }
  }
}

export class APIErrorHandler {
  static createErrorResponse(error: unknown, customStatusCode?: number): Response {
    const apiError = this.parseError(error)

    return new Response(
      JSON.stringify({
        error: apiError.message,
        code: apiError.code,
        details: apiError.details,
        retryable: apiError.retryable,
        timestamp: new Date().toISOString()
      }),
      {
        status: apiError.statusCode || customStatusCode || 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  static parseError(error: unknown): APIError {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.name === 'ZodError') {
        return {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.message,
          statusCode: 400
        }
      }

      if (error.message.includes('rate limit')) {
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: error.message,
          retryable: true,
          statusCode: 429
        }
      }

      if (error.message.includes('timeout')) {
        return {
          code: 'TIMEOUT',
          message: 'Request timeout',
          details: error.message,
          retryable: true,
          statusCode: 408
        }
      }

      if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: error.message,
          statusCode: 401
        }
      }

      // Generic error
      return {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: error.message,
        statusCode: 500
      }
    }

    // Unknown error type
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    }
  }
}

// Export singleton instances
export const rateLimiter = new RateLimiter()
export const performanceMonitor = new PerformanceMonitor()
import { NextRequest } from 'next/server'

export interface AdminLogEntry {
  id: string
  timestamp: string
  userId: string
  userEmail: string
  action: string
  endpoint: string
  method: string
  statusCode: number
  duration: number
  ipAddress: string
  userAgent: string
  requestBody?: unknown
  responseBody?: unknown
  error?: string | undefined
  metadata?: Record<string, unknown>
}

export interface AdminMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsByEndpoint: Record<string, number>
  requestsByUser: Record<string, number>
  errorsByType: Record<string, number>
  lastActivity: string
}

class AdminMonitoringService {
  private logs: AdminLogEntry[] = []
  private readonly maxLogs = 10000 // Keep last 10k logs in memory

  logAdminAction(
    request: NextRequest,
    response: Response,
    duration: number,
    userId: string,
    userEmail: string,
    requestBody?: unknown,
    responseBody?: unknown,
    error?: string
  ) {
    const logEntry: AdminLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      action: this.getActionFromEndpoint(request.url),
      endpoint: request.url,
      method: request.method,
      statusCode: response.status,
      duration,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestBody: this.sanitizeRequestBody(requestBody),
      responseBody: this.sanitizeResponseBody(responseBody),
      ...(error && { error }),
      metadata: {
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
        contentType: request.headers.get('content-type'),
      }
    }

    this.logs.push(logEntry)
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.info('🔍 Admin Action:', {
        timestamp: logEntry.timestamp,
        user: userEmail,
        action: logEntry.action,
        endpoint: logEntry.endpoint,
        status: logEntry.statusCode,
        duration: `${logEntry.duration}ms`,
        error: logEntry.error
      })
    }

    // TODO: Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      void this.sendToMonitoringService(logEntry)
    }
  }

  getMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): AdminMetrics {
    const now = new Date()
    const timeRangeMs = this.getTimeRangeMs(timeRange)
    const cutoffTime = new Date(now.getTime() - timeRangeMs)

    const filteredLogs = this.logs.filter(log => 
      new Date(log.timestamp) >= cutoffTime
    )

    const totalRequests = filteredLogs.length
    const successfulRequests = filteredLogs.filter(log => log.statusCode < 400).length
    const failedRequests = filteredLogs.filter(log => log.statusCode >= 400).length
    const averageResponseTime = filteredLogs.length > 0 
      ? filteredLogs.reduce((sum, log) => sum + log.duration, 0) / filteredLogs.length 
      : 0

    const requestsByEndpoint: Record<string, number> = {}
    const requestsByUser: Record<string, number> = {}
    const errorsByType: Record<string, number> = {}

    filteredLogs.forEach(log => {
      // Count by endpoint
      const endpoint = this.getEndpointFromUrl(log.endpoint)
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1

      // Count by user
      requestsByUser[log.userEmail] = (requestsByUser[log.userEmail] || 0) + 1

      // Count errors
      if (log.error) {
        const errorType = this.getErrorType(log.error)
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
      }
    })

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      requestsByEndpoint,
      requestsByUser,
      errorsByType,
      lastActivity: filteredLogs.length > 0 ? filteredLogs[filteredLogs.length - 1]?.timestamp ?? '' : ''
    }
  }

  getRecentLogs(limit: number = 50): AdminLogEntry[] {
    return this.logs.slice(-limit).reverse()
  }

  getLogsByUser(userEmail: string, limit: number = 100): AdminLogEntry[] {
    return this.logs
      .filter(log => log.userEmail === userEmail)
      .slice(-limit)
      .reverse()
  }

  getLogsByEndpoint(endpoint: string, limit: number = 100): AdminLogEntry[] {
    return this.logs
      .filter(log => this.getEndpointFromUrl(log.endpoint) === endpoint)
      .slice(-limit)
      .reverse()
  }

  getErrorLogs(limit: number = 100): AdminLogEntry[] {
    return this.logs
      .filter(log => log.error || log.statusCode >= 400)
      .slice(-limit)
      .reverse()
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  private getActionFromEndpoint(url: string): string {
    const endpoint = this.getEndpointFromUrl(url)
    const actionMap: Record<string, string> = {
      '/api/admin/leads': 'View Leads',
      '/api/admin/stats': 'View Stats',
      '/api/admin/analytics': 'View Analytics',
      '/api/admin/ai-performance': 'View AI Performance',
      '/api/admin/token-usage': 'View Token Usage',
      '/api/admin/email-campaigns': 'Manage Email Campaigns',
      '/api/admin/export': 'Export Data',
      '/api/admin/real-time-activity': 'View Real-time Activity'
    }
    return actionMap[endpoint] || 'Unknown Action'
  }

  private getEndpointFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname
    } catch {
      return url
    }
  }

  private getClientIP(request: NextRequest): string {
    const xff = request.headers.get("x-forwarded-for") ?? "";
    return xff.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "0.0.0.0";
  }

  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return undefined
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key']
    const sanitized = { ...body as Record<string, unknown> }
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })
    
    return sanitized
  }

  private sanitizeResponseBody(body: unknown): unknown {
    if (!body) return undefined
    
    // For responses, we might want to log only metadata, not full content
    if (typeof body === 'object' && body !== null) {
      return {
        type: 'object',
        keys: Object.keys(body),
        size: JSON.stringify(body).length
      }
    }
    
    return typeof body === 'string' ? `${body.substring(0, 100)}...` : body
  }

  private getErrorType(error: string): string {
    if (error.includes('authentication')) return 'Authentication Error'
    if (error.includes('authorization')) return 'Authorization Error'
    if (error.includes('validation')) return 'Validation Error'
    if (error.includes('database')) return 'Database Error'
    if (error.includes('rate limit')) return 'Rate Limit Error'
    return 'Unknown Error'
  }

  private getTimeRangeMs(timeRange: '1h' | '24h' | '7d' | '30d'): number {
    const timeRanges: Record<'1h' | '24h' | '7d' | '30d', number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 1000
    };
    return timeRanges[timeRange];
  }

  private async sendToMonitoringService(_logEntry: AdminLogEntry) {
    void _logEntry
    // TODO: Implement external monitoring service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
    try {
      // await fetch('https://your-monitoring-service.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(_logEntry)
      // })
    } catch (_error) {
      console.error('Failed to send log to monitoring service:', _error)
    }
  }
}

// Singleton instance
export const adminMonitoring = new AdminMonitoringService()

// Middleware function to wrap admin endpoints
export function withAdminMonitoring(handler: (req: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    let response: Response
    let error: string | undefined

    try {
      response = await handler(request)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      response = new Response(JSON.stringify({ error }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const duration = Date.now() - startTime

    // Get user info from request headers (set by auth middleware)
    const userId = request.headers.get('x-user-id') || 'unknown'
    const userEmail = request.headers.get('x-user-email') || 'unknown'

    // Log the admin action
    adminMonitoring.logAdminAction(
      request,
      response,
      duration,
      userId,
      userEmail,
      undefined, // requestBody - could be extracted if needed
      undefined, // responseBody - could be extracted if needed
      error
    )

    return response
  }
}

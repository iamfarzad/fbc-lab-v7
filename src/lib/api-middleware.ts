import { NextRequest, NextResponse } from 'next/server';
import { logger, performanceMonitor } from './logger';
import { v4 as uuidv4 } from 'uuid';

// Request ID generator
export function generateRequestId(): string {
  return `req_${uuidv4()}`;
}

// API Error class for structured error handling
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error response helper
export function createErrorResponse(error: ApiError | Error, requestId?: string): NextResponse {
  const isApiError = error instanceof ApiError;

  const errorResponse = {
    success: false,
    error: {
      message: isApiError ? error.message : 'Internal server error',
      code: isApiError ? error.code : 'INTERNAL_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      ...(isApiError && error.details && { details: error.details })
    }
  };

  // Log the error
  logger.error('API Error Response', error instanceof Error ? error : new Error(String(error)), {
    statusCode: isApiError ? error.statusCode : 500,
    requestId,
    type: 'api_error'
  });

  return NextResponse.json(
    errorResponse,
    {
      status: isApiError ? error.statusCode : 500,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId })
      }
    }
  );
}

// Success response helper
export function createSuccessResponse(data: any, requestId?: string, statusCode: number = 200): NextResponse {
  const response = {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId && { 'X-Request-ID': requestId })
    }
  });
}

// Request logging middleware
export async function withRequestLogging(
  request: NextRequest,
  handler: (request: NextRequest, context: { requestId: string; startTime: number }) => Promise<NextResponse>,
  options: {
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    component?: string;
  } = {}
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { logRequestBody = false, logResponseBody = false, component = 'api' } = options;

  // Create contextual logger for this request
  const requestLogger = logger.child({
    requestId,
    component,
    type: 'api_request'
  });

  try {
    // Log incoming request
    const url = new URL(request.url);
    requestLogger.info('Incoming request', {
      method: request.method,
      path: url.pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    // Log request body if enabled (be careful with large payloads)
    if (logRequestBody && request.method !== 'GET') {
      try {
        const body = await request.json();
        requestLogger.debug('Request body', {
          bodySize: JSON.stringify(body).length,
          hasBody: true
        });
      } catch (error) {
        requestLogger.debug('Failed to parse request body', { error: error instanceof Error ? error.message : 'Unknown' });
      }
    }

    // Execute the handler
    const response = await handler(request, { requestId, startTime });

    // Log successful response
    const duration = Date.now() - startTime;
    requestLogger.logApiRequest(request.method, url.pathname, response.status, duration);

    // Record performance metrics
    performanceMonitor.record(`api_${request.method}_${url.pathname}`, duration);

    // Log response body if enabled
    if (logResponseBody && response.status < 400) {
      try {
        // Note: This would need to be handled differently for streaming responses
        requestLogger.debug('Response logged', {
          status: response.status,
          hasBody: true
        });
      } catch (error) {
        requestLogger.debug('Failed to log response body');
      }
    }

    // Add request ID to response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Request-ID', requestId);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    // Handle errors with proper logging
    const duration = Date.now() - startTime;
    const url = new URL(request.url);

    if (error instanceof ApiError) {
      requestLogger.warn('API Error', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        duration
      });
    } else {
      requestLogger.error('Unhandled API Error', error instanceof Error ? error : new Error('Unknown error'), {
        duration,
        type: 'unhandled_error'
      });
    }

    // Record error metrics
    performanceMonitor.record(`api_error_${request.method}_${url.pathname}`, duration);

    return createErrorResponse(error instanceof ApiError ? error : new ApiError(500, 'Internal server error'), requestId);
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowKey = `${identifier}_${Math.floor(now / this.windowMs)}`;

    const existing = this.requests.get(windowKey);

    if (!existing || now > existing.resetTime) {
      // Reset window
      this.requests.set(windowKey, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      return false;
    }

    existing.count++;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const now = Date.now();
    const windowKey = `${identifier}_${Math.floor(now / this.windowMs)}`;
    const existing = this.requests.get(windowKey);

    return existing ? Math.max(0, existing.resetTime - now) : 0;
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Input validation helper
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ApiError(400, `${fieldName} is required`, 'VALIDATION_ERROR', { field: fieldName });
  }
}

// Common API response patterns
export const ApiResponses = {
  badRequest: (message: string = 'Bad request', details?: any) =>
    new ApiError(400, message, 'BAD_REQUEST', details),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(401, message, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(403, message, 'FORBIDDEN'),

  notFound: (resource: string = 'Resource') =>
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),

  conflict: (message: string = 'Conflict') =>
    new ApiError(409, message, 'CONFLICT'),

  tooManyRequests: (message: string = 'Too many requests') =>
    new ApiError(429, message, 'RATE_LIMITED'),

  internalError: (message: string = 'Internal server error') =>
    new ApiError(500, message, 'INTERNAL_ERROR'),

  serviceUnavailable: (message: string = 'Service unavailable') =>
    new ApiError(503, message, 'SERVICE_UNAVAILABLE')
};

// Health check endpoint helper
export async function createHealthCheckHandler(): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    // Perform basic health checks
    const healthChecks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const duration = Date.now() - startTime;

    logger.info('Health check performed', {
      requestId,
      duration,
      status: 'healthy',
      type: 'health_check'
    });

    return createSuccessResponse(healthChecks, requestId, 200);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Health check failed', error instanceof Error ? error : new Error('Unknown error'), {
      requestId,
      duration,
      type: 'health_check'
    });

    return createErrorResponse(
      new ApiError(503, 'Service unhealthy', 'HEALTH_CHECK_FAILED'),
      requestId
    );
  }
}

// Middleware for API routes with comprehensive error handling and logging
export function withApiMiddleware(
  handler: (request: NextRequest, context: { requestId: string; startTime: number }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    rateLimit?: boolean;
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    component?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withRequestLogging(request, async (req, context) => {
      // Rate limiting check
      if (options.rateLimit !== false) {
        const clientId = req.headers.get('x-forwarded-for') ||
                        req.headers.get('x-real-ip') ||
                        'unknown';

        if (!globalRateLimiter.isAllowed(clientId)) {
          throw ApiResponses.tooManyRequests(
            `Rate limit exceeded. Try again in ${Math.ceil(globalRateLimiter.getRemainingTime(clientId) / 1000)} seconds`
          );
        }
      }

      // Auth check (placeholder for future implementation)
      if (options.requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
          throw ApiResponses.unauthorized();
        }
        // TODO: Implement actual auth validation
      }

      return handler(req, context);
    }, options);
  };
}

// Export cache headers function
export { getCacheHeaders } from './vercel-cache';

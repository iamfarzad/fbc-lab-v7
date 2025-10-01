import { createLogger as createWinstonLogger, format, transports, Logger } from 'winston';

// Create Winston logger instance
const winstonLogger: Logger = createWinstonLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.json(),
    format.printf(({ timestamp, level, message, service, ...meta }) => {
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      const timestampStr = String(timestamp || '');
      const serviceStr = String(service || 'APP');
      const levelStr = String(level || 'INFO').toUpperCase();
      const messageStr = String(message || '');
      return `${timestampStr} [${serviceStr}] ${levelStr}: ${messageStr}${metaStr}`;
    })
  ),
  defaultMeta: {
    service: 'fbc-lab-v7',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Only use file transports in development, not in serverless environments
    ...(process.env.NODE_ENV !== 'production' && !process.env.VERCEL ? [
      // Write all logs with importance level of `error` or less to `error.log`
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Write all logs with importance level of `info` or less to `combined.log`
      new transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
});

// Always add console transport for serverless environments
// In development: colored console + files
// In production/serverless: console only (Vercel captures console logs)
winstonLogger.add(new transports.Console({
  format: format.combine(
    ...(process.env.NODE_ENV !== 'production' ? [format.colorize()] : []),
    format.simple(),
    format.printf(({ timestamp, level, message, service }) => {
      const timestampStr = String(timestamp || '');
      const serviceStr = String(service || '');
      const levelStr = String(level || '');
      const messageStr = String(message || '');
      return `${timestampStr} [${serviceStr}] ${levelStr}: ${messageStr}`;
    })
  )
}));

// Enhanced logger interface with performance tracking
export interface LoggerContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export class EnhancedLogger {
  private logger: Logger;
  private context: LoggerContext;

  constructor(logger: Logger, context: LoggerContext = {}) {
    this.logger = logger;
    this.context = context;
  }

  debug(message: string, meta?: Record<string, any>) {
    this.logger.debug(message, { ...this.context, ...meta });
  }

  info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(message, { ...this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: Record<string, any>) {
    this.logger.error(message, {
      ...this.context,
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  // Performance tracking methods
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    this.debug(`Starting operation: ${operation}`, { operation });

    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed operation: ${operation}`, {
        operation,
        duration,
        performance: 'completed'
      });
    };
  }

  // Create child logger with additional context
  child(context: LoggerContext): EnhancedLogger {
    return new EnhancedLogger(this.logger, { ...this.context, ...context });
  }

  // API request logging
  logApiRequest(method: string, url: string, statusCode?: number, duration?: number) {
    this.info('API Request', {
      method,
      url,
      statusCode,
      duration,
      type: 'api_request'
    });
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, duration?: number, error?: Error) {
    if (error) {
      this.error(`Database operation failed: ${operation}`, error, {
        operation,
        table,
        duration,
        type: 'database'
      });
    } else {
      this.debug(`Database operation: ${operation}`, {
        operation,
        table,
        duration,
        type: 'database'
      });
    }
  }

  // AI model interaction logging
  logAiInteraction(model: string, operation: string, tokens?: number, duration?: number, error?: Error) {
    if (error) {
      this.error(`AI interaction failed: ${model} - ${operation}`, error, {
        model,
        operation,
        tokens,
        duration,
        type: 'ai_interaction'
      });
    } else {
      this.info(`AI interaction: ${model} - ${operation}`, {
        model,
        operation,
        tokens,
        duration,
        type: 'ai_interaction'
      });
    }
  }
}

// Export singleton instance
export const logger = new EnhancedLogger(winstonLogger);

// Utility function to create contextual loggers
export const createContextualLogger = (context: LoggerContext): EnhancedLogger => {
  return new EnhancedLogger(winstonLogger, context);
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: Map<string, { count: number; totalTime: number; lastAccess: number }> = new Map();

  record(operation: string, duration: number) {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, lastAccess: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.lastAccess = Date.now();
    this.metrics.set(operation, existing);

    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operation}`, {
        operation,
        duration,
        threshold: 1000,
        type: 'performance'
      });
    }
  }

  getMetrics(): Record<string, { avgTime: number; count: number; lastAccess: number }> {
    const result: Record<string, { avgTime: number; count: number; lastAccess: number }> = {};

    for (const [operation, data] of this.metrics.entries()) {
      result[operation] = {
        avgTime: data.totalTime / data.count,
        count: data.count,
        lastAccess: data.lastAccess
      };
    }

    return result;
  }

  reset() {
    this.metrics.clear();
  }
}

// Export singleton performance monitor
export const performanceMonitor = new PerformanceMonitor();

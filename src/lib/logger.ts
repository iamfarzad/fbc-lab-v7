type LogMeta = Record<string, unknown> | undefined

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface BaseLogger {
  debug: (message: string, meta?: LogMeta) => void
  info: (message: string, meta?: LogMeta) => void
  warn: (message: string, meta?: LogMeta) => void
  error: (message: string, meta?: LogMeta) => void
}

const formatMeta = (meta?: LogMeta) => {
  if (!meta) return ''
  try {
    const serialized = JSON.stringify(meta)
    return serialized === '{}' ? '' : ` ${serialized}`
  } catch {
    return ' [unserializable meta]'
  }
}

const emit = (level: LogLevel, message: string, meta?: LogMeta) => {
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`
  const suffix = formatMeta(meta)

  switch (level) {
    case 'debug':
      console.debug(`${prefix} ${message}${suffix}`)
      break
    case 'info':
      console.info(`${prefix} ${message}${suffix}`)
      break
    case 'warn':
      console.warn(`${prefix} ${message}${suffix}`)
      break
    case 'error':
      console.error(`${prefix} ${message}${suffix}`)
      break
    default:
      console.log(`${prefix} ${message}${suffix}`)
  }
}

const baseLogger: BaseLogger = {
  debug: emit.bind(null, 'debug'),
  info: emit.bind(null, 'info'),
  warn: emit.bind(null, 'warn'),
  error: emit.bind(null, 'error'),
}

export interface LoggerContext {
  userId?: string
  sessionId?: string
  requestId?: string
  component?: string
  operation?: string
  duration?: number
  [key: string]: unknown
}

export class EnhancedLogger {
  private logger: BaseLogger
  private context: LoggerContext

  constructor(logger: BaseLogger, context: LoggerContext = {}) {
    this.logger = logger
    this.context = context
  }

  private withContext(meta?: LogMeta): LogMeta {
    return { ...this.context, ...meta }
  }

  debug(message: string, meta?: LogMeta) {
    this.logger.debug(message, this.withContext(meta))
  }

  info(message: string, meta?: LogMeta) {
    this.logger.info(message, this.withContext(meta))
  }

  warn(message: string, meta?: LogMeta) {
    this.logger.warn(message, this.withContext(meta))
  }

  error(message: string, error?: Error, meta?: LogMeta) {
    const errorMeta = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : undefined
    this.logger.error(message, this.withContext({ ...meta, ...errorMeta }))
  }

  startTimer(operation: string): () => void {
    const start = Date.now()
    this.debug(`Starting operation: ${operation}`, { operation })
    return () => {
      const duration = Date.now() - start
      this.info(`Completed operation: ${operation}`, {
        operation,
        duration,
        performance: 'completed',
      })
    }
  }

  child(context: LoggerContext): EnhancedLogger {
    return new EnhancedLogger(this.logger, { ...this.context, ...context })
  }

  logApiRequest(method: string, url: string, statusCode?: number, duration?: number) {
    this.info('API Request', {
      method,
      url,
      statusCode,
      duration,
      type: 'api_request',
    })
  }

  logDatabaseOperation(operation: string, table: string, duration?: number, error?: Error) {
    if (error) {
      this.error(`Database operation failed: ${operation}`, error, {
        operation,
        table,
        duration,
        type: 'database',
      })
    } else {
      this.debug(`Database operation: ${operation}`, {
        operation,
        table,
        duration,
        type: 'database',
      })
    }
  }

  logAiInteraction(model: string, operation: string, tokens?: number, duration?: number, error?: Error) {
    if (error) {
      this.error(`AI interaction failed: ${model} - ${operation}`, error, {
        model,
        operation,
        tokens,
        duration,
        type: 'ai_interaction',
      })
    } else {
      this.info(`AI interaction: ${model} - ${operation}`, {
        model,
        operation,
        tokens,
        duration,
        type: 'ai_interaction',
      })
    }
  }
}

export const logger = new EnhancedLogger(baseLogger)

export const createContextualLogger = (context: LoggerContext): EnhancedLogger => {
  return new EnhancedLogger(baseLogger, context)
}

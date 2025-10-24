// Browser console log capture for unified logging

const LOG_INGEST_URL = '/api/logs/ingest'
let isInitialized = false

// Queue logs to avoid blocking main thread
// TODO: migrate — replace any with a structured log type
const logQueue: any[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

// Recursion guard to prevent infinite loops
let isCapturing = false

async function flushLogs() {
  if (logQueue.length === 0) return
  
  const batch = [...logQueue]
  logQueue.length = 0
  
  try {
    // Use sendBeacon for reliability (works even on page unload)
    const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' })
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(LOG_INGEST_URL, blob)
    } else {
      // Fallback to fetch
      await fetch(LOG_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        keepalive: true
      })
    }
  } catch {
    // Silently fail - don't break user experience
    // Don't log the error to avoid infinite loops
  }
}

export function initBrowserLogCapture() {
  if (isInitialized || typeof window === 'undefined') return
  // Allow disabling in development via env to avoid Fast Refresh loops
  if ((process.env.NEXT_PUBLIC_DISABLE_LOG_CAPTURE || '').toLowerCase() === '1') {
    return
  }
  isInitialized = true

  // Store original console methods
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const originalInfo = console.info

  // TODO: migrate — replace any[] with a structured tuple of known console args
  function captureLog(level: 'debug' | 'info' | 'warn' | 'error', args: any[]) {
    // Prevent recursive logging
    if (isCapturing) {
      return
    }
    
    isCapturing = true
    
    try {
      // Still call original console method
      const original = {
        debug: originalLog,
        info: originalInfo,
        warn: originalWarn,
        error: originalError,
      }[level]

      // In production, echo logs as usual. In development, echo is disabled by
      // default to avoid React Dev Overlay feedback loops. Opt-in via env.
      const echoInDev = ((process.env.NEXT_PUBLIC_LOG_ECHO || '').toLowerCase() === '1') ||
                        ((process.env.NEXT_PUBLIC_LOG_ECHO || '').toLowerCase() === 'true')
      const shouldEcho = process.env.NODE_ENV === 'production' || echoInDev
      if (shouldEcho && level !== 'error') {
        original.apply(console, args)
      }

      // Queue for sending
      const joined = args.map(arg => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return arg.message
        try { return JSON.stringify(arg) } catch { return String(arg) }
      }).join(' ')

      // Skip noisy Fast Refresh logs to reduce churn
      if (/Fast Refresh/i.test(joined)) {
        return
      }

      logQueue.push({
      service: 'browser',
      level,
      message: joined,
      timestamp: new Date().toISOString(),
      meta: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        // Include stack trace for errors
        ...(level === 'error' && args[0] instanceof Error ? {
          stack: args[0].stack
        } : {})
      }
    })

      // Schedule flush
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushTimer = null
          flushLogs().catch(() => {})
        }, 1000) // Flush every 1 second
      }

      // Flush immediately on errors
      if (level === 'error' && logQueue.length >= 5) {
        if (flushTimer) {
          clearTimeout(flushTimer)
          flushTimer = null
        }
        flushLogs().catch(() => {})
      }
    } finally {
      // Always reset the guard
      isCapturing = false
    }
  }

  // Override console methods
  console.log = (...args) => captureLog('debug', args)
  console.info = (...args) => captureLog('info', args)
  console.warn = (...args) => captureLog('warn', args)
  console.error = (...args) => captureLog('error', args)

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    if (isCapturing) return
    
    logQueue.push({
      service: 'browser',
      level: 'error',
      message: `Uncaught error: ${event.message}`,
      timestamp: new Date().toISOString(),
      meta: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        url: window.location.href
      }
    })
    flushLogs().catch(() => {})
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isCapturing) return
    
    logQueue.push({
      service: 'browser',
      level: 'error',
      message: `Unhandled promise rejection: ${event.reason}`,
      timestamp: new Date().toISOString(),
      meta: {
        reason: String(event.reason),
        promise: event.promise?.constructor?.name || 'Unknown',
        url: window.location.href
      }
    })
    flushLogs().catch(() => {})
  })

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushLogs().catch(() => {})
  })

  // Flush on visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushLogs().catch(() => {})
    }
  })
}

/**
 * Tracing middleware for real-time voice pipeline
 * Provides per-stage latency tracking and correlation IDs
 */

export type Timer = ReturnType<typeof performance.now>

export interface TraceContext {
  sessionId: string
  connectionId: string
  correlationId: string
  startTime: number
  stages: Map<string, { start: number; end?: number; ms?: number }>
}

const traces = new Map<string, TraceContext>()

export function startTrace(sessionId: string, connectionId: string): TraceContext {
  const correlationId = `${connectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const trace: TraceContext = {
    sessionId,
    connectionId,
    correlationId,
    startTime: performance.now(),
    stages: new Map()
  }
  traces.set(correlationId, trace)
  
  // Cleanup old traces (keep last 1000)
  if (traces.size > 1000) {
    const oldest = Array.from(traces.entries())[0]
    traces.delete(oldest[0])
  }
  
  return trace
}

export function startStage(traceId: string, stage: string): void {
  const trace = traces.get(traceId)
  if (!trace) return
  
  trace.stages.set(stage, { start: performance.now() })
  
  if (process.env.WEBSOCKET_DEBUG === 'true') {
    console.log(`[${trace.connectionId}] [TRACE] ${stage} started`, {
      correlationId: trace.correlationId,
      timestamp: Date.now()
    })
  }
}

export function endStage(traceId: string, stage: string): number | undefined {
  const trace = traces.get(traceId)
  if (!trace) return undefined
  
  const stageData = trace.stages.get(stage)
  if (!stageData) return undefined
  
  const end = performance.now()
  const ms = end - stageData.start
  stageData.end = end
  stageData.ms = ms
  
  // Log slow operations (>500ms)
  if (ms > 500) {
    console.warn(`[${trace.connectionId}] [SLOW] ${stage} took ${ms.toFixed(1)}ms`, {
      correlationId: trace.correlationId
    })
  } else if (process.env.WEBSOCKET_DEBUG === 'true') {
    console.log(`[${trace.connectionId}] [TRACE] ${stage} completed in ${ms.toFixed(1)}ms`)
  }
  
  return ms
}

export function getTrace(traceId: string): TraceContext | undefined {
  return traces.get(traceId)
}

export function withTrace<T>(
  traceId: string,
  stage: string,
  fn: () => Promise<T>
): Promise<T> {
  startStage(traceId, stage)
  return fn().finally(() => {
    endStage(traceId, stage)
  })
}

export function logTrace(traceId: string): void {
  const trace = traces.get(traceId)
  if (!trace) return
  
  const totalMs = performance.now() - trace.startTime
  const stages = Array.from(trace.stages.entries())
    .map(([name, data]) => ({
      name,
      ms: data.ms ?? 'in-progress'
    }))
  
  console.log(`[${trace.connectionId}] [TRACE SUMMARY]`, {
    correlationId: trace.correlationId,
    totalMs: totalMs.toFixed(1),
    stages
  })
}

export function cleanupTrace(traceId: string): void {
  traces.delete(traceId)
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

function asErr(e: unknown): e is { name?: string } { return typeof e === "object" && e !== null; }

type GuardCtx = { name?: string; [k: string]: unknown };

type HandlerArgs<T> = {
  req: NextRequest
  body: T
  sessionId?: string
  requestId: string
  ctx: GuardCtx
}

export function withApiGuard<TSchema extends z.ZodTypeAny>(opts: {
  schema?: TSchema
  requireSession?: boolean
  rateLimit?: { windowMs: number; max: number; key?: (req: NextRequest) => string }
  handler: (args: HandlerArgs<TSchema extends z.ZodTypeAny ? z.infer<TSchema> : unknown>) => Promise<Response | NextResponse>
}) {
  // naive in-memory limiter keyed by provided key; replace with Redis in prod
  const store = new Map<string, { count: number; reset: number }>()

  function checkLimit(req: NextRequest): NextResponse | null {
    if (!opts.rateLimit) return null
    const now = Date.now()
    const key = (opts.rateLimit.key?.(req)) || (req.headers.get('x-intelligence-session-id') || getClientIp(req))
    const rec = store.get(key)
    if (!rec || rec.reset < now) {
      store.set(key, { count: 1, reset: now + opts.rateLimit.windowMs })
      return null
    }
    if (rec.count >= opts.rateLimit.max) {
      const retry = Math.max(1, Math.ceil((rec.reset - now) / 1000))
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(retry) } })
    }
    rec.count++
    return null
  }

  return async function guarded(req: NextRequest, ctx: GuardCtx) {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
    const sessionId = req.headers.get('x-intelligence-session-id') || undefined

    if (opts.requireSession && !sessionId) {
      return NextResponse.json({ ok: false, error: 'Missing x-intelligence-session-id' }, { status: 400, headers: { 'x-request-id': requestId } })
    }

    const limited = checkLimit(req)
    if (limited) return limited

    let body: unknown = undefined
    if (req.method !== 'GET') {
      try {
        const raw = await req.json()
        body = opts.schema ? opts.schema.parse(raw) : raw
      } catch (e: unknown) {
        const msg = asErr(e) && e.name === 'ZodError' ? 'Invalid input' : 'Bad request'
        return NextResponse.json({ ok: false, error: msg }, { status: 400, headers: { 'x-request-id': requestId } })
      }
    }

    try {
      const res = await opts.handler({ req, body, sessionId, requestId, ctx } as any)
      res.headers.set('x-request-id', requestId)
      return res
    } catch (_e) {
      void _e
      return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500, headers: { 'x-request-id': requestId } })
    }
  }
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff && xff.trim()) return xff.split(',')[0]!.trim()
  const rip = req.headers.get('x-real-ip')
  if (rip && rip.trim()) return rip
  try { return new URL(req.url).hostname || 'ip' } catch { return 'ip' }
}


import { NextRequest, NextResponse } from 'next/server'
import type { ToolRunResult } from '@/src/core/types/intelligence'
import { ContextStorage } from '@/src/core/context/context-storage'
import { validateRequest, sessionInitSchema } from '@/src/core/validation/index'
import { withApiMiddleware, ApiResponses, getCacheHeaders } from '@/src/lib/api-middleware'
import { vercelCache, CacheUtils, CACHE_CONFIGS } from '@/src/lib/vercel-cache'
import { logger } from '@/src/lib/logger'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const contextStorage = new ContextStorage()

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limit: 3 requests per 5 seconds per session
const RATE_LIMIT_WINDOW = 5000 // 5 seconds
const RATE_LIMIT_MAX_REQUESTS = 3

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const key = `context:${sessionId}`
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) return false
  record.count++
  return true
}

function getRateState(sessionId: string) {
  const key = `context:${sessionId}`
  const record = rateLimitMap.get(key)
  if (!record) return { remaining: RATE_LIMIT_MAX_REQUESTS, resetTime: Date.now() + RATE_LIMIT_WINDOW }
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count)
  return { remaining, resetTime: record.resetTime }
}

function generateETag(data: unknown): string {
  const jsonString = JSON.stringify(data)
  return crypto.createHash('sha256').update(jsonString).digest('hex')
}

function parseIfNoneMatch(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map(v => v.trim())
    .map(v => v.replace(/^W\//, '')) // strip weak validator prefix
    .map(v => v.replace(/^"(.*)"$/, '$1')) // remove surrounding quotes
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || req.headers.get('x-intelligence-session-id')

    if (!sessionId) return NextResponse.json({ ok: false, error: 'Missing sessionId parameter' } satisfies ToolRunResult, { status: 400 })

    // Rate limiting check
    if (!checkRateLimit(sessionId)) {
      const state = getRateState(sessionId)
      const retryAfterSec = Math.max(1, Math.ceil((state.resetTime - Date.now()) / 1000))
      return new NextResponse(JSON.stringify({ ok: false, error: 'Rate limit exceeded. Please wait before retrying.' } satisfies ToolRunResult), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(state.remaining),
          'X-RateLimit-Reset': String(state.resetTime),
        }
      })
    }

    const context = await contextStorage.get(sessionId) as Record<string, unknown> | null

    // If no context exists, create default context for new session
    let contextData = context
    if (!context) {
      contextData = {
        session_id: sessionId,
        email: '',
        name: '',
        role: '',
        role_confidence: 0,
        ai_capabilities_shown: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store the default context
      await contextStorage.store(sessionId, contextData)
    }

    // Guard against null contextData
    if (!contextData) {
      return NextResponse.json({ ok: false, error: 'No context' }, { status: 404 });
    }

    // Return merged context snapshot
    const snapshot = {
      lead: { email: (contextData.email as string) || '', name: (contextData.name as string) || '' },
      company: contextData.company_context,
      person: contextData.person_context,
      role: (contextData.role as string) || '',
      roleConfidence: (contextData.role_confidence as number) || 0,
      intent: contextData.intent_data,
      capabilities: (contextData.ai_capabilities_shown as string[]) || []
    }

    // Generate ETag for caching
    const etagHash = generateETag(snapshot)
    const etag = `"${etagHash}"`

    // Check If-None-Match header for 304 responses
    const ifNoneMatchList = parseIfNoneMatch(req.headers.get('if-none-match'))
    if (ifNoneMatchList.includes(etagHash)) {
      const res304 = new NextResponse(null, { status: 304 })
      res304.headers.set('ETag', etag)
      res304.headers.set('Cache-Control', 'no-store')
      res304.headers.set('Vary', 'If-None-Match')
      const state304 = getRateState(sessionId)
      res304.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS))
      res304.headers.set('X-RateLimit-Remaining', String(state304.remaining))
      res304.headers.set('X-RateLimit-Reset', String(state304.resetTime))
      return res304
    }

    // Back-compat: include snapshot fields at top-level
    const response = NextResponse.json({ ok: true, output: snapshot, ...snapshot } as any)
    const state200 = getRateState(sessionId)
    response.headers.set('ETag', etag)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Vary', 'If-None-Match')
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS))
    response.headers.set('X-RateLimit-Remaining', String(state200.remaining))
    response.headers.set('X-RateLimit-Reset', String(state200.resetTime))
    return response

  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Internal server error' } satisfies ToolRunResult, { status: 500 })
  }
}

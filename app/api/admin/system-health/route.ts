import 'server-only'

import { NextResponse } from 'next/server'
import { GEMINI_MODELS, GEMINI_ENDPOINTS, WEBSOCKET_CONFIG } from '@/config/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ServiceStatus = { ok: boolean; url?: string; endpoint?: string; model?: string; latencyMs?: number; error?: string }

function nowMs() {
  return typeof performance !== 'undefined' && 'now' in performance ? performance.now() : Date.now()
}

async function checkApiSelf(): Promise<ServiceStatus> {
  const start = nowMs()
  try {
    const res = await fetch(new URL('/api/health', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'), { cache: 'no-store' })
    const latencyMs = Math.round(nowMs() - start)
    return { ok: res.ok, latencyMs, endpoint: '/api/health' }
  } catch (error: any) {
    return { ok: false, error: String(error), endpoint: '/api/health' }
  }
}

async function checkGemini(): Promise<ServiceStatus> {
  const model = GEMINI_MODELS.DEFAULT_VOICE
  const endpoint = `${GEMINI_ENDPOINTS.LIVE_API}/${encodeURIComponent(model)}`
  const url = `https://${endpoint}`
  const start = nowMs()
  try {
    // No auth required for connectivity check; status may be 401/403 but reachability matters
    const res = await fetch(url, { method: 'GET' })
    const latencyMs = Math.round(nowMs() - start)
    const ok = res.status < 500
    return { ok, latencyMs, endpoint, model }
  } catch (error: any) {
    return { ok: false, error: String(error), endpoint, model }
  }
}

async function checkWebSocket(): Promise<ServiceStatus> {
  const url = WEBSOCKET_CONFIG.URL
  try {
    // Attempt to derive an HTTP(S) health URL from WS URL for basic reachability
    const wsUrl = new URL(url)
    const httpProto = wsUrl.protocol === 'wss:' ? 'https:' : 'http:'
    const healthUrl = `${httpProto}//${wsUrl.host}/health`
    const start = nowMs()
    const res = await fetch(healthUrl, { method: 'GET' })
    const latencyMs = Math.round(nowMs() - start)
    const ok = res.ok
    return { ok, latencyMs, url }
  } catch (error: any) {
    return { ok: false, error: String(error), url }
  }
}

export async function GET() {
  const [api, liveApi, websocket] = await Promise.all([
    checkApiSelf(),
    checkGemini(),
    checkWebSocket(),
  ])

  const body = {
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    services: {
      api,
      liveApi,
      websocket,
    },
  }

  const overallOk = api.ok && liveApi.ok && websocket.ok
  const status = overallOk ? 200 : 503
  return NextResponse.json(body, { status })
}





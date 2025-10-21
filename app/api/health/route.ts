import { NextResponse } from 'next/server'
import { getResolvedGeminiApiKey } from '@/config/env'
import { WEBSOCKET_CONFIG, GEMINI_MODELS } from '@/config/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const key = getResolvedGeminiApiKey()
    return NextResponse.json({
      ok: true,
      provider: 'google-genai',
      keyPresent: Boolean(key),
      ws: WEBSOCKET_CONFIG.URL,
      defaultVoiceModel: GEMINI_MODELS.DEFAULT_VOICE,
      ts: new Date().toISOString(),
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'missing api key' }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { logJsonl } from '@/lib/jsonl-logger'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const category = typeof body?.category === 'string' ? body.category : 'client-live'
    const event = typeof body?.event === 'string' ? body.event : 'event'
    const data = body?.data ?? undefined
    try { logJsonl(category, event, data) } catch { /* ignore logging errors */ }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'bad request' }, { status: 400 })
  }
}


import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.warn('safety-escalation', body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('safety-escalation failed', error instanceof Error ? error : undefined)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

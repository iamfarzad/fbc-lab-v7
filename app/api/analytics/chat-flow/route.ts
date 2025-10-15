import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.debug('chat-flow-analytics', body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.warn('chat-flow-analytics failed', error instanceof Error ? error : undefined)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

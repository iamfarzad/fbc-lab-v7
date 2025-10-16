import { respond } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.warn('safety-escalation', body)
    return respond.ok({ ok: true })
  } catch (error) {
    logger.error('safety-escalation failed', error instanceof Error ? error : undefined)
    return respond.badRequest('Invalid payload')
  }
}

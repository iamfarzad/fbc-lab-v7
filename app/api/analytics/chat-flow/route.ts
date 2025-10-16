import { respond } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    logger.debug('chat-flow-analytics', body)
    return respond.ok({ ok: true })
  } catch (error) {
    logger.warn('chat-flow-analytics failed', error instanceof Error ? error : undefined)
    return respond.badRequest('Invalid payload')
  }
}

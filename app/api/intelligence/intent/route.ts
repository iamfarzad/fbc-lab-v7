import { respond } from '@/lib/api/response'
import { z } from 'zod'
import { detectIntent } from '@/src/core/intelligence/intent-detector'
import { ContextStorage } from '@/src/core/context/context-storage'
import { withApiGuard } from '@/app/api-utils/withApiGuard'

const contextStorage = new ContextStorage()

const Body = z.object({ sessionId: z.string().min(1), userMessage: z.string().min(1) })

export const POST = withApiGuard({
  schema: Body,
  requireSession: false,
  rateLimit: { windowMs: 5000, max: 5 },
  handler: async ({ body }) => {
    try {
      const message = String(body.userMessage)
      const intent = detectIntent(message)
      await contextStorage.update(body.sessionId, { intent_data: intent as any, last_user_message: message })
      // Back-compat: include top-level fields alongside ToolRunResult
      return respond.ok({ ok: true, output: intent, ...intent } as any)
    } catch (e: unknown) {
      console.error('Intent detection error:', e)
      return respond.serverError('server_error')
    }
  }
})

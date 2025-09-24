import { NextRequest, NextResponse } from 'next/server'
import type { ToolRunResult } from '@/src/core/types/intelligence'
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
  handler: async ({ body, req }) => {
    try {
      const message = String(body.userMessage)
      const intent = detectIntent(message)
      await contextStorage.update(body.sessionId, { intent_data: intent as any, last_user_message: message })
      // Back-compat: include top-level fields alongside ToolRunResult
      return NextResponse.json({ ok: true, output: intent, ...intent } satisfies any)
    } catch (e: unknown) {
      return NextResponse.json({ ok: false, error: 'server_error' } satisfies ToolRunResult, { status: 500 })
    }
  }
})



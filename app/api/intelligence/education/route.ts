import { NextResponse } from 'next/server'
import type { ToolRunResult } from '@/src/core/types/intelligence'
import { z } from 'zod'
import { withApiGuard } from '@/app/api-utils/withApiGuard'
import { ContextStorage } from '@/src/core/context/context-storage'

const Body = z.object({
  moduleId: z.string().min(1),
  stepId: z.string().min(1),
  xp: z.number().int().min(0).max(1000),
  moduleTitle: z.string().optional(),
  stepTitle: z.string().optional(),
  note: z.string().optional(),
})

const storage = new ContextStorage()

export const POST = withApiGuard({
  schema: Body,
  requireSession: true,
  rateLimit: { windowMs: 2000, max: 6 },
  handler: async ({ body, sessionId }) => {
    try {
      if (!sessionId) return NextResponse.json({ ok: false, error: 'missing_session' } satisfies ToolRunResult, { status: 400 })
      const existing = await storage.get(sessionId)
      const prev = (existing?.tool_outputs as any)?.education || { completed: [], xp: 0, badges: [] }
      const completed = Array.isArray(prev.completed) ? prev.completed : []
      interface CompletedStep {
        moduleId: string;
        stepId: string;
      }
      if (!completed.some((x: unknown) => (x as CompletedStep).moduleId === body.moduleId && (x as CompletedStep).stepId === body.stepId)) {
        completed.push({ moduleId: body.moduleId, stepId: body.stepId })
      }
      const xp = (typeof prev.xp === 'number' ? prev.xp : 0) + body.xp
      const education = { completed, xp, badges: (prev as any)?.badges || [] }
      const tool_outputs = { ...(existing?.tool_outputs as any || {}), education }
      const snippet = `Education: ${body.moduleTitle || body.moduleId} → ${body.stepTitle || body.stepId} (+${body.xp} XP)`
      const last_user_message = `${(existing?.last_user_message || '').toString()}\n\n${snippet}`.trim()
      await storage.update(sessionId, { tool_outputs, last_user_message })
      return NextResponse.json({ ok: true, output: { xp: education.xp, completed: education.completed } } satisfies ToolRunResult)
    } catch (e: unknown) {
      console.error('Education POST error:', e)
      return NextResponse.json({ ok: false, error: 'server_error' } satisfies ToolRunResult, { status: 500 })
    }
  }
})


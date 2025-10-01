import { NextResponse } from 'next/server'
import type { ToolRunResult, ContextSnapshot, IntentResult } from '@/src/core/types/intelligence'
import { z } from 'zod'
import { ContextStorage } from '@/src/core/context/context-storage'
import { suggestTools } from '@/src/core/intelligence/tool-suggestion-engine'
import { withApiGuard } from '@/app/api-utils/withApiGuard'

const contextStorage = new ContextStorage()

const Body = z.object({ sessionId: z.string().min(1), stage: z.string().optional() })

export const POST = withApiGuard({ schema: Body, requireSession: false, rateLimit: { windowMs: 3000, max: 5 }, handler: async ({ body }) => {
  try {
    const raw = await contextStorage.get(body.sessionId)
    if (!raw) {
      console.warn(`Suggestions API: Context not found for sessionId: ${body.sessionId}`)
      return NextResponse.json({
        ok: false,
        error: `Session context not found for sessionId: ${body.sessionId}. Please ensure you've initialized the session first. Try refreshing the page or reinitializing the chat session.`
      } satisfies ToolRunResult, { status: 404 })
    }
  const snapshot: ContextSnapshot = {
    lead: { email: (raw.email ?? '').toString(), name: (raw.name ?? '').toString() },
    company: (raw.company_context && Object.keys(raw.company_context as any).length > 0) ? raw.company_context as any : undefined,
    person: (raw.person_context && Object.keys(raw.person_context as any).length > 0) ? raw.person_context as any : undefined,
    role: raw.role ?? '',
    roleConfidence: raw.role_confidence ?? 0,
    intent: (raw.intent_data as unknown as IntentResult) ?? undefined,
    capabilities: raw.ai_capabilities_shown || [],
  }
  const intent: IntentResult = snapshot.intent || { type: 'other', confidence: 0.4, slots: {} }
  const suggestions = suggestTools(snapshot, intent)
  // Heuristic: if last user input (stored in context) contained a YouTube URL, ensure video2app suggestion is present
  try {
    const lastUser = (raw?.last_user_message || '').toString()
    const yt = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    if (yt.test(lastUser) && !suggestions.some(s => s.capability === 'video2app')) {
      suggestions.unshift({ id: 'video2app', label: 'Turn video into app blueprint', action: 'run_tool', capability: 'video2app' })
    }
  } catch {
    // Ignore heuristic enrichment failures; base suggestions already computed
  }
    // Back-compat: keep top-level suggestions array
    return NextResponse.json({ ok: true, output: { suggestions }, suggestions } as any)
  } catch (error) {
    console.error('❌ Suggestions API error:', error)
    return NextResponse.json({
      ok: false,
      error: `Internal server error while generating suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
    } satisfies ToolRunResult, { status: 500 })
  }
}})

// Add GET handler for compatibility
export async function GET() {
  return NextResponse.json({
    message: 'Suggestions API - Use POST method',
    methods: ['POST'],
    required: ['sessionId'],
    example: {
      sessionId: 'your-session-id',
      stage: 'optional-stage'
    }
  })
}

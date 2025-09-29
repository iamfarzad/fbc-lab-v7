import { NextRequest, NextResponse } from 'next/server'
import { ContextStorage } from '@/src/core/context/context-storage'
import { LeadResearchService, ResearchResult } from '@/src/core/intelligence/lead-research'
import { getSupabase } from '@/src/core/supabase/server'

// Type definitions
interface ContextData {
  email?: string
  name?: string
  company_url?: string
  company_context?: Record<string, unknown> | null
  person_context?: Record<string, unknown> | null
  role?: string | null
  role_confidence?: number | null
  ai_capabilities_shown?: string[]
}

interface ContextSnapshot {
  lead: { email: string; name: string }
  company: Record<string, unknown> | null
  person: Record<string, unknown> | null
  role: string | null
  roleConfidence: number | null
  capabilities: string[]
}

interface SessionInitRequest {
  sessionId?: string
  email: string
  name?: string
  companyUrl?: string
}

interface SessionInitResponse {
  sessionId: string
  contextReady: boolean
  context: ContextSnapshot | null
  snapshot: ContextSnapshot | null
}

const contextStorage = new ContextStorage()
const leadResearchService = new LeadResearchService()

// In-flight dedupe for concurrent research per session (best-effort, dev-friendly)
const researchInFlight = new Map<string, Promise<ResearchResult>>()

function hasResearch(context: ContextData | null): boolean {
  return Boolean(
    context && (
      context.company_context || context.person_context || context.role || context.role_confidence != null
    )
  )
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId: providedSessionId, email, name, companyUrl }: SessionInitRequest = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    // Idempotency: prefer unified header, fallback to legacy; else generate
    const headerSession = req.headers.get('x-intelligence-session-id') || undefined
    const sessionId = providedSessionId || headerSession || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    // Upsert minimal conversation context row (ensures row exists)
    try {
      const supabase = getSupabase()
      await supabase
        .from('conversation_contexts')
        .upsert({
          session_id: String(sessionId),
          email: String(email),
          name: name ? String(name) : null,
          company_url: companyUrl ? String(companyUrl) : null,
        }, { onConflict: 'session_id' })
    } catch {}

    // Action logged

    // Check for existing context for idempotency
    const existing: ContextData | null = await contextStorage.get(sessionId)

    // If no record yet, persist the bare identifiers
    if (!existing) {
      await contextStorage.store(sessionId, {
        email,
        name,
        company_url: companyUrl
      })
    } else {
      // If the identifiers changed, update only those fields (do not clobber researched context)
      const needsIdUpdate =
        (email && existing.email !== email) ||
        (name && existing.name !== name) ||
        (companyUrl && existing.company_url !== companyUrl)

      if (needsIdUpdate) {
        await contextStorage.update(sessionId, {
          email: email ?? existing.email,
          name: name ?? existing.name,
          company_url: companyUrl ?? existing.company_url
        })
      }

      // If we already have research for this session, short‑circuit and return it
      if (hasResearch(existing)) {
        const snapshot: ContextSnapshot = {
          lead: { email: existing.email || email, name: existing.name || name || 'Unknown' },
          company: existing.company_context ?? null,
          person: existing.person_context ?? null,
          role: existing.role ?? null,
          roleConfidence: existing.role_confidence ?? null,
          capabilities: existing.ai_capabilities_shown || []
        }

        const response: SessionInitResponse = {
          sessionId,
          contextReady: true,
          context: snapshot,
          snapshot,
        }

        // Action logged
        return NextResponse.json(response, { headers: { 'X-Session-Id': sessionId, 'Cache-Control': 'no-store' } })
      }
    }

    // Start lead research (async; but do not duplicate if already have research)
    let contextReady = false
    let researchResult: ResearchResult | null = null

    try {
      if (!hasResearch(existing)) {
        // Action logged
        if (!researchInFlight.has(sessionId)) {
          const p = leadResearchService
            .researchLead({ email, name, companyUrl, sessionId })
            .finally(() => researchInFlight.delete(sessionId))
          researchInFlight.set(sessionId, p)
        }
        researchResult = await researchInFlight.get(sessionId)!
      }
      
      // Update context with research results when available
      if (researchResult) {
        await contextStorage.update(sessionId, {
          company_context: researchResult.company,
          person_context: researchResult.person,
          role: researchResult.role,
          role_confidence: researchResult.confidence
        })
      }

      contextReady = researchResult != null || hasResearch(existing)
      // Action logged
      
    } catch (error) {
    console.error('❌ Lead research failed', error)
      // Continue without research results
      contextReady = false
    }

    // 🔧 MASTER FLOW: Return session info with proper context structure
    // Build snapshot from research result if present; otherwise from stored context (if any)
    const afterContext = await contextStorage.get(sessionId)
    const contextSnapshot = researchResult
      ? {
          lead: { email, name: name || email.split('@')[0] || 'Unknown' },
          company: researchResult.company,
          person: researchResult.person,
          role: researchResult.role,
          roleConfidence: researchResult.confidence,
          capabilities: []
        }
      : afterContext && hasResearch(afterContext)
      ? {
          lead: { email: afterContext.email || email, name: afterContext.name || name || 'Unknown' },
          company: afterContext?.company_context ?? null,
          person: afterContext?.person_context ?? null,
          role: afterContext?.role ?? null,
          roleConfidence: afterContext?.role_confidence ?? null,
          capabilities: afterContext?.ai_capabilities_shown || []
        }
      : null

    const response = {
      sessionId,
      contextReady,
      context: contextSnapshot, // Use 'context' key for consistency
      snapshot: contextSnapshot, // Keep 'snapshot' for backward compatibility
    }

    // Action logged
    return NextResponse.json(response, { headers: { 'X-Session-Id': sessionId, 'Cache-Control': 'no-store' } })

  } catch (error) {
    console.error('❌ Session init failed', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

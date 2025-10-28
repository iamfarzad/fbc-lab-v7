import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { ContextStorage } from '@/src/core/context/context-storage'

const contextStorage = new ContextStorage()

function normaliseCitations(raw: any): Array<{ url: string; title?: string; description?: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const uri = entry?.uri || entry?.url || entry?.href
      if (!uri || typeof uri !== 'string') return null
      return {
        url: uri,
        title: typeof entry?.title === 'string' && entry.title.length > 0 ? entry.title : undefined,
        description: typeof entry?.description === 'string' && entry.description.length > 0 ? entry.description : undefined,
      }
    })
    .filter(Boolean) as Array<{ url: string; title?: string; description?: string }>
}

function normaliseResearchSection(section: any | null | undefined) {
  if (!section) return null
  if (typeof section === 'string') {
    return { summary: section, citations: [] as Array<{ url: string; title?: string; description?: string }> }
  }

  const summary = typeof section.summary === 'string' ? section.summary : undefined
  const text = typeof section.text === 'string' ? section.text : undefined

  return {
    ...section,
    summary: summary ?? text ?? '',
    citations: normaliseCitations(section.citations),
  }
}

async function buildSnapshot(sessionId: string) {
  const context = await contextStorage.get(sessionId)
  if (!context) return null

  const rawStatus = ((context as any).research_status ?? 'pending') as string
  const researchStatus = rawStatus.toLowerCase() as 'completed' | 'pending' | 'skipped' | 'failed'
  const completedAt = (context as any).research_timestamp ?? null

  return {
    lead: {
      email: (context.email ?? '').toString(),
      name: (context.name ?? '').toString(),
    },
    company: (context as any).company_context ?? null,
    person: (context as any).person_context ?? null,
    research: {
      status: researchStatus,
      completedAt,
      professionalProfile: normaliseResearchSection((context as any).professional_profile),
      companyContext: normaliseResearchSection((context as any).company_context || (context as any).company_overview),
      companyOverview: normaliseResearchSection((context as any).company_overview),
      roleContext: normaliseResearchSection((context as any).role_context),
      industryInsights: normaliseResearchSection((context as any).industry_insights),
      relevantCases: normaliseResearchSection((context as any).relevant_cases),
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { sessionId?: string }
    const sessionId = body.sessionId?.trim()

    if (!sessionId) {
      return respond.badRequest('Missing required field: sessionId')
    }

    const snapshot = await buildSnapshot(sessionId)
    if (!snapshot) {
      return respond.notFound(`No intelligence context found for sessionId ${sessionId}`)
    }

    return respond.ok({ success: true, context: snapshot }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('❌ [intelligence/context] Failed to load session context', error)
    return respond.serverError('Failed to load intelligence context')
  }
}

export async function GET(req: NextRequest | Request) {
  try {
    const url = 'nextUrl' in req ? req.nextUrl : new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')?.trim()
    if (!sessionId) {
      return respond.badRequest('Missing required query parameter: sessionId')
    }

    const snapshot = await buildSnapshot(sessionId)
    if (!snapshot) {
      return respond.notFound(`No intelligence context found for sessionId ${sessionId}`)
    }

    return respond.ok({ success: true, context: snapshot }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('❌ [intelligence/context] GET failed', error)
    return respond.serverError('Failed to load intelligence context')
  }
}

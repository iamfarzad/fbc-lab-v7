import { NextRequest, NextResponse } from 'next/server'
import { handleIntelligence } from '@/src/api/intelligence/handler'
import type { ToolRunResult } from '@/src/core/types/intelligence'
import { validateRequest, leadResearchSchema } from '@/src/core/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request using the same pattern as FB-c_labV3-main
    const validation = validateRequest(leadResearchSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid request',
        } satisfies ToolRunResult,
        { status: 400 }
      )
    }

    const { sessionId, email, name, companyUrl, provider } = validation.data

    // Use the business logic handler
    const result: any = await handleIntelligence({
      action: 'research-lead',
      data: { email, name, companyUrl, sessionId, provider }
    })

    if (!result.success) {
      return NextResponse.json({ ok: false, error: 'Lead research failed' } satisfies ToolRunResult, { status: 500 })
    }

    return NextResponse.json({ ok: true, output: result.research } satisfies ToolRunResult)

  } catch (error) {
    console.error('❌ Lead research failed', error)
    return NextResponse.json({ ok: false, error: 'Lead research failed' } satisfies ToolRunResult, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { getFailedConversations } from '@/src/core/db/conversations'

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return respond.ok({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const minScore = searchParams.get('minScore')
    
    const failedConversations = await getFailedConversations(limit)
    
    // Filter by minScore if provided
    let filtered = failedConversations
    if (minScore !== null) {
      const minScoreNum = parseFloat(minScore)
      filtered = failedConversations.filter((fc: any) => 
        fc.lead_score !== null && fc.lead_score >= minScoreNum
      )
    }

    return respond.ok(filtered)
  } catch (error) {
    console.error('Admin failed conversations error:', error)
    return respond.serverError('Failed to fetch failed conversations')
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { supabaseService } from '@/src/core/supabase/client'

// Type definitions for database schema
interface ConversationRecord {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  lead_score: number | null
  research_json: Record<string, unknown> | null
  pdf_url: string | null
  email_status: string | null
  email_retries: number | null
  created_at: string
}

interface ConversationResponse {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  leadScore: number | null
  researchJson: Record<string, unknown> | null
  pdfUrl: string | null
  emailStatus: string | null
  emailRetries: number | null
  createdAt: string
}

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return NextResponse.json({ disabled: true, message: 'Admin features require Supabase configuration' })
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
    const supabase = ensureSupabase()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const period = searchParams.get('period') ?? 'last_30_days'

    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (period === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'last_90_days') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }

    let query = (supabase as any)
      .from('conversations')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,summary.ilike.%${search}%`)
    }

    const { data, error } = await query as { data: ConversationRecord[] | null; error: unknown }

    if (error) {
      console.error('Admin conversations fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    const conversations: ConversationResponse[] = (data ?? []).map((conv: ConversationRecord) => ({
      id: conv.id,
      name: conv.name,
      email: conv.email,
      summary: conv.summary,
      leadScore: conv.lead_score,
      researchJson: conv.research_json,
      pdfUrl: conv.pdf_url,
      emailStatus: conv.email_status,
      emailRetries: conv.email_retries,
      createdAt: conv.created_at
    }))

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Admin conversations error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

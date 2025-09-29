import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { adminChatService } from '@/src/core/admin/admin-chat-service'
import { supabaseService } from '@/src/core/supabase/client'

// Type definitions for admin sessions
interface AdminSessionRecord {
  id: string
  admin_id: string | null
  session_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AdminSessionResponse {
  id: string
  adminId: string | null
  sessionName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof supabase.from !== 'function') {
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
    ensureSupabase()
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId') ?? undefined
    const sessions = await adminChatService.getAdminSessions(adminId) as AdminSessionResponse[]
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Admin sessions GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    ensureSupabase()
    const { sessionId, adminId, sessionName } = (await request.json()) as {
      sessionId?: string
      adminId?: string
      sessionName?: string
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const session = await adminChatService.getOrCreateSession(sessionId, adminId, sessionName)
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Admin sessions POST error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    await supabase
      .schema('admin')
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin sessions DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}

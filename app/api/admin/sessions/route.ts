import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { adminChatService } from '@/src/core/admin/admin-chat-service'
import { supabaseService } from '@/src/core/supabase/client'

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
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

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
    ensureSupabase()
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId') ?? undefined
    const sessions = await adminChatService.getAdminSessions(adminId) as AdminSessionResponse[]
    return respond.ok({ sessions })
  } catch (error) {
    console.error('Admin sessions GET error:', error)
    return respond.serverError('Failed to retrieve sessions')
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
      return respond.badRequest('sessionId is required')
    }

    const session = await adminChatService.getOrCreateSession(sessionId, adminId, sessionName)
    return respond.ok({ session })
  } catch (error) {
    console.error('Admin sessions POST error:', error)
    return respond.serverError('Failed to create session')
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
      return respond.badRequest('sessionId is required')
    }

    await (supabase as any)
      .schema('admin')
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)

    return respond.ok({ success: true })
  } catch (error) {
    console.error('Admin sessions DELETE error:', error)
    return respond.serverError('Failed to delete session')
  }
}

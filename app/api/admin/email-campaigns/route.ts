import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { supabaseService } from '@/src/core/supabase/client'

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

// GET: List all campaigns
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
    const supabase = ensureSupabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching email campaigns:', error)
      return respond.serverError('Failed to fetch email campaigns')
    }

    // Get recipient counts for each campaign
    const campaignsWithStats = await Promise.all(
      (data || []).map(async (campaign: Record<string, unknown> & { id: string }) => {
        const { count } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        return {
          ...campaign,
          total_recipients: count || 0,
        }
      })
    )

    return respond.ok(campaignsWithStats)
  } catch (error) {
    console.error('Email campaigns GET error:', error)
    return respond.serverError('Failed to fetch email campaigns')
  }
}

// POST: Create new campaign
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { name, subject, template, target_segment, scheduled_at } = body

    if (!name || !subject || !template) {
      return respond.badRequest('Missing required fields: name, subject, template')
    }

    const supabase = ensureSupabase()
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        name,
        subject,
        template,
        target_segment: target_segment || null,
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: scheduled_at || null,
        sent_count: 0,
        total_recipients: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email campaign:', error)
      return respond.serverError('Failed to create email campaign')
    }

    return respond.ok({ success: true, campaign: data })
  } catch (error) {
    console.error('Email campaigns POST error:', error)
    return respond.serverError('Failed to create email campaign')
  }
}

// PATCH: Update campaign
export async function PATCH(request: NextRequest) {
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
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return respond.badRequest('Missing campaign ID')
    }

    const supabase = ensureSupabase()
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating email campaign:', error)
      return respond.serverError('Failed to update email campaign')
    }

    return respond.ok({ success: true, campaign: data })
  } catch (error) {
    console.error('Email campaigns PATCH error:', error)
    return respond.serverError('Failed to update email campaign')
  }
}

// DELETE: Delete campaign
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return respond.badRequest('Missing campaign ID')
    }

    const supabase = ensureSupabase()
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting email campaign:', error)
      return respond.serverError('Failed to delete email campaign')
    }

    return respond.ok({ success: true })
  } catch (error) {
    console.error('Email campaigns DELETE error:', error)
    return respond.serverError('Failed to delete email campaign')
  }
}


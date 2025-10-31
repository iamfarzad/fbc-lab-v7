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

// GET: List all meetings
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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('meetings')
      .select('*')
      .order('scheduled_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching meetings:', error)
      return respond.serverError('Failed to fetch meetings')
    }

    // Get participant counts for each meeting
    const meetingsWithParticipants = await Promise.all(
      (data || []).map(async (meeting: Record<string, unknown> & { id: string }) => {
        const { count } = await supabase
          .from('meeting_participants')
          .select('*', { count: 'exact', head: true })
          .eq('meeting_id', meeting.id)

        return {
          ...meeting,
          participant_count: count || 0,
        }
      })
    )

    return respond.ok(meetingsWithParticipants)
  } catch (error) {
    console.error('Meetings GET error:', error)
    return respond.serverError('Failed to fetch meetings')
  }
}

// POST: Create new meeting
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
    const { conversation_id, lead_email, lead_name, title, description, scheduled_at, duration_minutes, meeting_link, location, timezone, participants } = body

    if (!lead_email || !title || !scheduled_at) {
      return respond.badRequest('Missing required fields: lead_email, title, scheduled_at')
    }

    const supabase = ensureSupabase()
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        conversation_id: conversation_id || null,
        lead_email,
        lead_name: lead_name || null,
        title,
        description: description || null,
        scheduled_at,
        duration_minutes: duration_minutes || 30,
        meeting_link: meeting_link || null,
        location: location || null,
        timezone: timezone || 'UTC',
        status: 'scheduled',
      })
      .select()
      .single()

    if (meetingError) {
      console.error('Error creating meeting:', meetingError)
      return respond.serverError('Failed to create meeting')
    }

    // Add participants if provided
    if (participants && Array.isArray(participants) && participants.length > 0 && meeting) {
      const participantInserts = participants.map((p: { email: string; name?: string; role?: string }) => ({
        meeting_id: meeting.id,
        email: p.email,
        name: p.name || null,
        role: p.role || 'attendee',
        status: 'pending',
      }))

      await supabase.from('meeting_participants').insert(participantInserts)
    }

    return respond.ok({ success: true, meeting })
  } catch (error) {
    console.error('Meetings POST error:', error)
    return respond.serverError('Failed to create meeting')
  }
}

// PATCH: Update meeting
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
      return respond.badRequest('Missing meeting ID')
    }

    const supabase = ensureSupabase()
    const { data, error } = await supabase
      .from('meetings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meeting:', error)
      return respond.serverError('Failed to update meeting')
    }

    return respond.ok({ success: true, meeting: data })
  } catch (error) {
    console.error('Meetings PATCH error:', error)
    return respond.serverError('Failed to update meeting')
  }
}

// DELETE: Delete meeting
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
      return respond.badRequest('Missing meeting ID')
    }

    const supabase = ensureSupabase()
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meeting:', error)
      return respond.serverError('Failed to delete meeting')
    }

    return respond.ok({ success: true })
  } catch (error) {
    console.error('Meetings DELETE error:', error)
    return respond.serverError('Failed to delete meeting')
  }
}


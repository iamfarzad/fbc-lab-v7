import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'

export async function POST(req: NextRequest) {
  try {
    const { sessionId: providedSessionId, email } = await req.json()

    if (!email) {
      return respond.badRequest('Missing required field: email')
    }

    // Generate session ID
    const sessionId = providedSessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Simple response without Supabase dependencies
    const response = {
      sessionId,
      contextReady: false,
      context: null,
      snapshot: null,
    }

    return respond.ok(response, { headers: { 'X-Session-Id': sessionId, 'Cache-Control': 'no-store' } })

  } catch (error) {
    console.error('❌ Simple session init failed', error)
    return respond.serverError('Internal server error')
  }
}

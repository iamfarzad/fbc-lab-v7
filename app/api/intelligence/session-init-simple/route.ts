import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { sessionId: providedSessionId, email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
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

    return NextResponse.json(response, { 
      headers: { 
        'X-Session-Id': sessionId, 
        'Cache-Control': 'no-store' 
      } 
    })

  } catch (error) {
    console.error('❌ Simple session init failed', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

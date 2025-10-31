import { NextRequest } from 'next/server'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'

// In-memory activity log (in production, use Redis or database)
const activityLog: Array<{
  id: string
  timestamp: string
  type: 'api_call' | 'conversation' | 'tool_execution' | 'error' | 'system'
  message: string
  details?: Record<string, unknown>
}> = []

// Add activity helper (can be called from other parts of the app)
export function addActivity(
  type: 'api_call' | 'conversation' | 'tool_execution' | 'error' | 'system',
  message: string,
  details?: Record<string, unknown>
) {
  activityLog.push({
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
  })

  // Keep only last 1000 entries
  if (activityLog.length > 1000) {
    activityLog.shift()
  }
}

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return new Response(JSON.stringify({ disabled: true, message: 'Admin features require Supabase configuration' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  // Check if client wants SSE stream
  const acceptHeader = request.headers.get('accept') || ''
  const isSSE = acceptHeader.includes('text/event-stream')

  if (isSSE) {
    // Server-Sent Events stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let lastIndex = activityLog.length

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time activity stream connected' })}\n\n`))

        // Send existing activities
        const existingActivities = activityLog.slice(-50) // Last 50 activities
        for (const activity of existingActivities) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'activity', data: activity })}\n\n`))
        }

        // Poll for new activities
        const interval = setInterval(() => {
          if (lastIndex < activityLog.length) {
            const newActivities = activityLog.slice(lastIndex)
            for (const activity of newActivities) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'activity', data: activity })}\n\n`))
            }
            lastIndex = activityLog.length
          }

          // Send heartbeat every 30 seconds
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        }, 1000) // Check every second

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Regular JSON response (non-streaming)
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    return new Response(
      JSON.stringify({
        activities: activityLog.slice(-limit).reverse(),
        total: activityLog.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Real-time activity error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch activity' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}


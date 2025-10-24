import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { logJsonl } from '@/src/lib/jsonl-logger'

// Simple authentication check (in production, use proper auth)
function checkAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const token = authHeader.substring(7)
  return token === adminPassword
}

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    if (!checkAdminAuth(req)) {
      return respond.unauthorized('Admin authentication required')
    }

    console.log('🔍 Admin: Listing sessions')
    logJsonl('admin', 'sessions_listed')

    // Get active sessions
    const activeSessions = multimodalContextManager.getActiveSessions()
    
    // Get session details
    const sessionDetails = await Promise.all(
      activeSessions.map(async (sessionId) => {
        try {
          const context = await multimodalContextManager.getContext(sessionId)
          if (!context) return null
          
          return {
            sessionId,
            leadContext: context.leadContext,
            messageCount: context.conversationHistory.length,
            modalitiesUsed: context.metadata.modalitiesUsed,
            lastActivity: context.metadata.lastUpdated,
            createdAt: context.metadata.createdAt,
            totalTokens: context.metadata.totalTokens
          }
        } catch (err) {
          console.warn(`Failed to get context for session ${sessionId}:`, err)
          return null
        }
      })
    )

    const validSessions = sessionDetails.filter(Boolean)

    return respond.ok({
      sessions: validSessions,
      totalCount: validSessions.length,
      exportedAt: new Date().toISOString()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list sessions'
    console.error('❌ [Admin] Error:', message)
    logJsonl('admin', 'error', { message })
    return respond.serverError(message)
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    if (!checkAdminAuth(req)) {
      return respond.unauthorized('Admin authentication required')
    }

    const body = await req.json()
    const { sessionId, action } = body

    if (!sessionId || !action) {
      return respond.badRequest('Session ID and action required')
    }

    console.log('🔍 Admin: Session action', { sessionId, action })
    logJsonl('admin', 'session_action', { sessionId, action })

    switch (action) {
      case 'export':
        const context = await multimodalContextManager.getContext(sessionId)
        if (!context) {
          return respond.notFound('Session not found')
        }
        
        return respond.ok({
          sessionId,
          context,
          exportedAt: new Date().toISOString()
        })

      case 'clear':
        await multimodalContextManager.clearSession(sessionId)
        return respond.ok({ message: 'Session cleared' })

      case 'archive':
        await multimodalContextManager.archiveConversation(sessionId)
        return respond.ok({ message: 'Session archived' })

      default:
        return respond.badRequest('Invalid action')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process session action'
    console.error('❌ [Admin] Error:', message)
    logJsonl('admin', 'error', { message })
    return respond.serverError(message)
  }
}

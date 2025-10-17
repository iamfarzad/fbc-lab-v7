import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { getSupabaseService } from '@/src/lib/supabase'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { auditLog } from '@/core/security/audit-logger'
import { vercelCache } from '@/lib/vercel-cache'

/**
 * GDPR Data Deletion API
 * 
 * Handles "Right to be Forgotten" requests
 * Deletes all data associated with an email or sessionId:
 * - Multimodal context (memory + Redis)
 * - Database records (conversation_contexts, wal_log, activities, leads)
 * - PDFs in Supabase Storage
 * - Audit trail (logged then deleted)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, sessionId } = await req.json()

    if (!email && !sessionId) {
      return respond.badRequest('Email or sessionId required for data deletion')
    }

    const supabase = getSupabaseService()
    const deletedItems: string[] = []

    // Find all sessions for this user
    const query = supabase
      .from('conversation_contexts')
      .select('session_id')

    if (email) {
      query.eq('email', email)
    } else if (sessionId) {
      query.eq('session_id', sessionId)
    }

    const { data: sessions, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch sessions for deletion:', fetchError)
      return respond.error('Failed to fetch user data', 500)
    }

    if (!sessions || sessions.length === 0) {
      return respond.ok({
        deleted: 0,
        message: 'No data found for deletion'
      })
    }

    console.log(`🗑️ Deleting data for ${sessions.length} sessions...`)

    for (const session of sessions) {
      const sid = session.session_id

      try {
        // 1. Delete multimodal context from memory
        await multimodalContextManager.clearSession(sid)
        deletedItems.push(`memory:${sid}`)

        // 2. Delete from Redis
        try {
          await vercelCache.delete('multimodal', sid)
          deletedItems.push(`redis:${sid}`)
        } catch (err) {
          console.warn(`Failed to delete Redis cache for ${sid}:`, err)
        }

        // 3. Delete from Supabase tables
        await supabase.from('conversation_contexts').delete().eq('session_id', sid)
        deletedItems.push(`conversation_contexts:${sid}`)

        await supabase.from('wal_log').delete().eq('session_id', sid)
        deletedItems.push(`wal_log:${sid}`)

        await supabase.from('activities').delete().eq('session_id', sid)
        deletedItems.push(`activities:${sid}`)

        await supabase.from('leads').delete().eq('session_id', sid)
        deletedItems.push(`leads:${sid}`)

        // 4. Delete PDFs from Storage
        const { data: files } = await supabase.storage
          .from('conversation-pdfs')
          .list(sid)

        if (files && files.length > 0) {
          const filePaths = files.map((f: { name: string }) => `${sid}/${f.name}`)
          const { error: deleteError } = await supabase.storage
            .from('conversation-pdfs')
            .remove(filePaths)

          if (!deleteError) {
            deletedItems.push(`pdfs:${sid}:${files.length}`)
          }
        }

        // 5. Audit log BEFORE deleting audit entries
        await auditLog.logDataDeletion(sid, 'user_request', deletedItems)

        console.log(`✅ Deleted all data for session ${sid}`)
      } catch (err) {
        console.error(`❌ Failed to delete data for session ${sid}:`, err)
        // Continue with next session
      }
    }

    // 6. Delete audit logs last (after logging the deletion)
    // Wait a bit to ensure audit log is written
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    for (const session of sessions) {
      await supabase.from('audit_log').delete().eq('session_id', session.session_id)
      deletedItems.push(`audit:${session.session_id}`)
    }

    console.log(`✅ Completed GDPR deletion: ${deletedItems.length} items removed`)

    return respond.ok({
      deleted: sessions.length,
      items: deletedItems,
      message: `All data deleted successfully for ${sessions.length} session(s)`
    })
  } catch (error) {
    console.error('Data deletion failed:', error)
    return respond.error('Failed to delete data', 500, 'DELETION_FAILED')
  }
}


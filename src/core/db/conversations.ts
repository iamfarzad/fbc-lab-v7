import { supabaseService } from '../supabase/client'
import type { ConversationRecord } from '../types/conversations'

function ensureService() {
  if (!supabaseService) {
    throw new Error('Supabase service client is not configured')
  }

  return supabaseService
}

// Insert a new conversation record
export async function saveConversation(record: ConversationRecord) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .insert({
      name: record.name,
      email: record.email,
      summary: record.summary,
      lead_score: record.leadScore,
      research_json: record.researchJson,
      pdf_url: record.pdfUrl,
      email_status: record.emailStatus ?? 'pending',
      email_retries: record.emailRetries ?? 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving conversation:', error)
    throw error
  }

  return data
}

// Update only the PDF URL after generation
export async function updatePdfUrl(conversationId: string, pdfUrl: string) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .update({ pdf_url: pdfUrl })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating PDF URL:', error)
    throw error
  }

  return data
}

// Update only the email status after sending
export async function updateEmailStatus(
  conversationId: string,
  status: 'pending' | 'sent' | 'failed'
) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .update({ email_status: status })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating email status:', error)
    throw error
  }

  return data
}

// Increment email retry count
export async function incrementEmailRetries(conversationId: string) {
  const service = ensureService()
  const { data: current } = await service
    .from('conversations')
    .select('email_retries')
    .eq('id', conversationId)
    .single()

  const currentRetries = current?.email_retries ?? 0

  const { data, error } = await service
    .from('conversations')
    .update({ email_retries: currentRetries + 1 })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) {
    console.error('Error incrementing email retries:', error)
    throw error
  }

  return data
}

// Get conversation by ID
export async function getConversationById(id: string) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    console.error('Get conversation error:', error)
    throw error
  }

  return data
}

// Log failed email attempt
export async function logFailedEmail(
  conversationId: string,
  recipientEmail: string,
  failureReason: string,
  retries: number,
  emailContent?: any
) {
  const service = ensureService()
  const { data, error } = await service
    .from('failed_emails')
    .insert({
      conversation_id: conversationId,
      recipient_email: recipientEmail,
      failure_reason: failureReason,
      retries,
      email_content: emailContent,
      failed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error logging failed email:', error)
    throw error
  }

  return data
}

// Get failed conversations with full context
export async function getFailedConversations(limit: number = 50) {
  const service = ensureService()
  const { data, error } = await service
    .from('failed_conversations')
    .select('*')
    .limit(limit)
    .order('failed_at', { ascending: false })

  if (error) {
    console.error('Error fetching failed conversations:', error)
    throw error
  }

  return data || []
}

// Get failed conversations by conversation ID
export async function getFailedEmailsByConversation(conversationId: string) {
  const service = ensureService()
  const { data, error } = await service
    .from('failed_emails')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('failed_at', { ascending: false })

  if (error) {
    console.error('Error fetching failed emails:', error)
    throw error
  }

  return data || []
}

// Get conversations by email
export async function getConversationsByEmail(email: string) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get conversations by email error:', error)
    throw error
  }

  return data || []
}

// Get failed conversations for retry
export async function getFailedConversationsForRetry(maxRetries: number = 3) {
  const service = ensureService()
  const { data, error } = await service
    .from('conversations')
    .select('id, email, pdf_url, email_retries')
    .eq('email_status', 'failed')
    .lt('email_retries', maxRetries)
    .not('pdf_url', 'is', null)
    .limit(10)

  if (error) {
    console.error('Error fetching failed conversations:', error)
    throw error
  }

  return data || []
}

import { supabaseService } from '../supabase/client'
type AdminMessageType = 'user' | 'assistant' | 'system'

type AdminConversationRow = {
  id: string;
  created_at?: string | null;
  title?: string | null;
  metadata?: unknown;
};

type AdminSessionRow = {
  id: string;
  created_at?: string | null;
  admin_id?: string | null;
  session_name?: string | null;
  is_active?: boolean | null;
  last_activity?: string | null;
  context_summary?: string | null;
};

export interface AdminMessage {
  id?: string
  sessionId: string
  conversationId?: string
  adminId?: string
  type: AdminMessageType
  content: string
  metadata?: Record<string, any>
  contextLeads?: string[]
  embeddings?: number[]
}

export interface AdminChatContext {
  sessionId: string
  messages: AdminMessage[]
  relevantHistory: AdminMessage[]
  leadContext?: {
    conversationId: string
    name: string
    email: string
    summary: string
    leadScore: number
    researchData: any
  }[]
}

export class AdminChatService {
  private static instance: AdminChatService
  // Session cache for future use
  // private _sessionCache = new Map<string, AdminChatContext>()

  static getInstance(): AdminChatService {
    if (!AdminChatService.instance) {
      AdminChatService.instance = new AdminChatService()
    }
    return AdminChatService.instance
  }

  /**
   * Create or get admin session
   */
  async getOrCreateSession(sessionId: string, adminId?: string, sessionName?: string): Promise<AdminSessionRow> {
    // Check if session exists
    const { data: existingSession } = await supabaseService
      .from('admin_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (existingSession) {
      // Update last activity
      await supabaseService
        .from('admin_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', sessionId)

      return existingSession
    }

    // Create new session with explicit ID
    const { data: newSession, error } = await supabaseService
      .from('admin_sessions')
      .insert({
        id: sessionId,
        admin_id: adminId,
        session_name: sessionName || `Session ${new Date().toLocaleDateString()}`,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return newSession
  }

  /**
   * Save message to persistent storage with embeddings
   */
  async saveMessage(message: AdminMessage): Promise<AdminConversationRow> {
    console.log('Saving admin message:', { sessionId: message.sessionId, type: message.type, contentLength: message.content.length })

    // Generate embeddings for the message content (optional - don't fail if it doesn't work)
    let embeddings: number[] | undefined
    try {
      embeddings = await this.generateEmbeddings(message.content)
    } catch (embeddingError) {
      console.warn('Embeddings generation failed, saving without embeddings:', embeddingError)
    }

    const { data, error } = await supabaseService
      .from('admin_conversations')
      .insert({
        conversation_id: message.conversationId || message.sessionId, // Use sessionId as fallback (validates FK)
        admin_id: message.adminId,
        session_id: message.sessionId,
        message_type: message.type,
        message_content: message.content,
        message_metadata: message.metadata,
        embeddings: embeddings ? JSON.stringify(embeddings) : '[]', // Convert array to JSON string
        context_leads: message.contextLeads
      })
      .select()
      .single()

    if (error) {
      console.error('Database error saving admin message:', error)
      throw error
    }
    return data
  }

  /**
   * Get conversation context with semantic search
   */
  async getConversationContext(
    sessionId: string,
    currentMessage: string,
    limit: number = 20
  ): Promise<AdminChatContext> {
    // Get recent messages from current session
    const { data: recentMessages } = await supabaseService

      .from('admin_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Generate embeddings for current message and find semantically similar messages
    let similarMessages: unknown[] = []
    try {
      // Note: RPC expects text query, not embedding vector
      const { data } = await supabaseService

        .rpc('search_admin_conversations', {
          p_query: currentMessage, // Text query
          p_session_id: sessionId,
          p_limit: 5,
          p_thresh: 0.7
        })
      similarMessages = data || []
    } catch (error) {
      // Semantic search is optional - log but don't fail
      console.warn('Semantic search failed (optional):', error)
    }

    // Format messages
    const messages: AdminMessage[] = (recentMessages || []).map((msg: unknown) => {
      const m = msg as { id?: string; session_id?: string; conversation_id?: string; admin_id?: string; message_type?: string; message_content?: string; embeddings?: string; [k: string]: unknown }
      return {
        id: m.id,
        sessionId: m.session_id,
        conversationId: m.conversation_id,
        adminId: m.admin_id,
        type: m.message_type as AdminMessageType,
        content: m.message_content,
        metadata: m.message_metadata,
        contextLeads: m.context_leads,
        embeddings: typeof m.embeddings === 'string' ? JSON.parse(m.embeddings) : undefined
      }
    }).reverse() // Reverse to chronological order

    const relevantHistory: AdminMessage[] = (similarMessages || []).map((msg: unknown) => {
      const m = msg as { id?: string; session_id?: string; conversation_id?: string; admin_id?: string; message_type?: string; message_content?: string; message_metadata?: any; context_leads?: string[]; embeddings?: number[]; [k: string]: unknown }
      return {
        id: m.id,
        sessionId: m.session_id || sessionId,
        conversationId: m.conversation_id,
        adminId: m.admin_id,
        type: m.message_type as AdminMessageType,
        content: String(m.message_content ?? ''),
        metadata: m.message_metadata,
        contextLeads: m.context_leads,
        embeddings: typeof m.embeddings === 'string' ? JSON.parse(m.embeddings) : m.embeddings
      }
    })

    return {
      sessionId,
      messages,
      relevantHistory
    }
  }

  /**
   * Load lead context for admin conversation
   */
  async loadLeadContext(conversationIds: string[]): Promise<AdminChatContext['leadContext']> {
    if (!conversationIds.length) return []

    const { data: conversations } = await supabaseService
      .from('conversations')
      .select('id, name, email, summary, lead_score, research_json')
      .in('id', conversationIds)

    return (conversations || []).map((conv: unknown) => {
      const c = conv as { id?: string; name?: string; email?: string; summary?: string; lead_score?: number; research_json?: unknown }
      return {
        conversationId: c.id || '',
        name: c.name || 'Unknown',
        email: c.email || '',
        summary: c.summary || '',
        leadScore: c.lead_score || 0,
        researchData: c.research_json
      }
    })
  }

  /**
   * Build context for AI from conversation history and lead data
   */
  async buildAIContext(
    sessionId: string,
    currentMessage: string,
    conversationIds?: string[]
  ): Promise<string> {
    const context = await this.getConversationContext(sessionId, currentMessage)

    let contextString = `# Admin Conversation Context\n\n`

    // Add recent conversation history
    if (context.messages.length > 0) {
      contextString += `## Recent Conversation History\n`
      context.messages.forEach((msg: AdminMessage) => {
        contextString += `**${msg.type.toUpperCase()}:** ${msg.content}\n\n`
      })
    }

    // Add semantically relevant history
    if (context.relevantHistory.length > 0) {
      contextString += `## Relevant Historical Context\n`
      context.relevantHistory.forEach((msg: AdminMessage) => {
        contextString += `**${msg.type.toUpperCase()}:** ${msg.content}\n\n`
      })
    }

    // Add lead context if specific conversations requested
    if (conversationIds && conversationIds.length > 0) {
      const leadContext = await this.loadLeadContext(conversationIds)
      const list = Array.isArray(leadContext) ? leadContext : [];
      if (list.length > 0) {
        contextString += `## Lead Context\n`
        // ⬇️ implicit anys
        list.forEach((lead: any) => {
          contextString += `### Lead: ${lead.name} (${lead.email})\n`
          contextString += `**Lead Score:** ${lead.leadScore}/100\n`
          contextString += `**Summary:** ${lead.summary}\n\n`

          if (lead.researchData) {
            const company = lead.researchData.company || {}
            const person = lead.researchData.person || {}
            if (company.name) {
              contextString += `**Company:** ${company.name} (${company.industry || 'Unknown industry'})\n`
            }
            if (person.role) {
              contextString += `**Contact:** ${person.role} at ${company.name || 'company'}\n`
            }
          }
          contextString += `\n`
        })
      }
    }

    return contextString
  }

  /**
   * Generate embeddings using OpenAI (placeholder - implement based on your setup)
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Import the embeddings service dynamically to avoid circular dependencies
      const { embedText } = await import('../embeddings/gemini')

      // Generate embeddings using the Gemini service
      const embeddings = await embedText([text])

      // Return the first embedding array, or empty array if failed
      return embeddings?.[0] || []
    } catch (error) {
      console.warn('Embeddings generation failed:', error)
      // Return empty array to avoid breaking the admin chat
      return []
    }
  }

  /**
   * Search across all admin conversations
   */
  async searchAllConversations(
    query: string,
    limit: number = 10,
    adminId?: string
  ): Promise<AdminMessage[]> {
    // Try semantic search, fallback to empty array if RPC doesn't exist
    let rows: unknown[] = []
    try {
      const { data } = await supabaseService
        .rpc('search_admin_conversations', {
          p_query: query,
          p_session_id: '', // Search all sessions
          p_limit: limit,
          p_thresh: 0.6
        })
      
      rows = (data || []).filter((msg: unknown) => {
        if (!adminId) return true
        return (msg as { admin_id?: string }).admin_id === adminId
      })
    } catch (error) {
      console.warn('search_admin_conversations RPC failed:', error)
    }

    return rows.map((msg: unknown) => {
      const m = msg as { id?: string; session_id?: string; conversation_id?: string; admin_id?: string; message_type?: string; message_content?: string; message_metadata?: any; context_leads?: string[]; embeddings?: string; [k: string]: unknown }
      return {
        id: m.id,
        sessionId: m.session_id || '',
        conversationId: m.conversation_id,
        adminId: m.admin_id,
        type: m.message_type as AdminMessageType,
        content: String(m.message_content ?? ''),
        metadata: m.message_metadata,
        contextLeads: m.context_leads,
        embeddings: typeof m.embeddings === 'string' ? JSON.parse(m.embeddings) : undefined
      }
    })
  }

  /**
   * Get session list for admin
   */
  async getAdminSessions(adminId?: string, limit: number = 20): Promise<AdminSessionRow[]> {
    let query = supabaseService

      .from('admin_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(limit)

    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    const { data } = await query
    return data || []
  }

  /**
   * Update last activity timestamp for admin session
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    const { error } = await supabaseService
      .from('admin_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.warn('Failed to update admin session activity:', error)
    }
  }

  /**
   * Clean up old sessions (optional maintenance)
   */
  async cleanupOldSessions(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { count } = await supabaseService

      .from('admin_sessions')
      .delete({ count: 'exact' })
      .eq('is_active', false)
      .lt('last_activity', cutoffDate.toISOString())

    return count || 0
  }

  /**
   * Delete a specific admin session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Delete messages first (foreign key constraint)
    const { error: messagesError } = await supabaseService
      .from('admin_conversations')
      .delete()
      .eq('session_id', sessionId)

    if (messagesError) {
      console.error('Failed to delete admin messages:', messagesError)
      throw messagesError
    }

    // Delete session
    const { error: sessionError } = await supabaseService
      .from('admin_sessions')
      .delete()
      .eq('id', sessionId)

    if (sessionError) {
      console.error('Failed to delete admin session:', sessionError)
      throw sessionError
    }
  }
}

// Export singleton instance
export const adminChatService = AdminChatService.getInstance()

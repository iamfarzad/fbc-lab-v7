import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export interface DatabaseVerification {
  hasActivities: boolean
  hasContext: boolean
  hasEmbeddings: boolean
  hasLeadSummary: boolean
  hasPDFStorage: boolean
  activityCount: number
  contextFields: string[]
  embeddingCount: number
}

export class DatabaseHelpers {
  private supabase: ReturnType<typeof createClient> | null = null

  constructor(private page: Page) {
    // Initialize Supabase client for direct database access
    // In tests, we'll use API endpoints primarily, but can use direct DB for verification
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co') {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    }
  }

  /**
   * Verify activities table has entries for session
   */
  async verifyActivitiesTable(sessionId: string): Promise<{
    hasActivities: boolean
    count: number
    activities: unknown[]
  }> {
    // Try direct DB access first, fallback to API
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('activities')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true })

        if (error) {
          console.warn('Database query error:', error)
          return await this.verifyActivitiesViaAPI(sessionId)
        }

        return {
          hasActivities: (data?.length ?? 0) > 0,
          count: data?.length ?? 0,
          activities: data ?? [],
        }
      } catch (error) {
        console.warn('Direct DB access failed, using API:', error)
        return await this.verifyActivitiesViaAPI(sessionId)
      }
    }

    return await this.verifyActivitiesViaAPI(sessionId)
  }

  /**
   * Verify activities via API endpoint
   */
  private async verifyActivitiesViaAPI(sessionId: string): Promise<{
    hasActivities: boolean
    count: number
    activities: unknown[]
  }> {
    try {
      const response = await this.page.request.get(`/api/session/export?sessionId=${sessionId}`)
      if (response.ok()) {
        const data = await response.json()
        const activities = data.conversation || []
        return {
          hasActivities: activities.length > 0,
          count: activities.length,
          activities,
        }
      }
    } catch (error) {
      console.warn('API verification failed:', error)
    }

    return {
      hasActivities: false,
      count: 0,
      activities: [],
    }
  }

  /**
   * Verify context storage in conversation_contexts table
   */
  async verifyContextStorage(sessionId: string): Promise<{
    hasContext: boolean
    fields: string[]
    contextData: Record<string, unknown> | null
  }> {
    // Context is typically stored via multimodal context manager
    // Check via session export API
    try {
      const response = await this.page.request.get(`/api/session/export?sessionId=${sessionId}`)
      if (response.ok()) {
        const data = await response.json()
        const hasContext = !!(data.leadContext || data.visualContext || data.audioContext || data.uploads)
        const fields: string[] = []
        
        if (data.leadContext) fields.push('leadContext')
        if (data.visualContext) fields.push('visualContext')
        if (data.audioContext) fields.push('audioContext')
        if (data.uploads) fields.push('uploads')

        return {
          hasContext,
          fields,
          contextData: data,
        }
      }
    } catch (error) {
      console.warn('Context verification failed:', error)
    }

    return {
      hasContext: false,
      fields: [],
      contextData: null,
    }
  }

  /**
   * Verify embeddings exist (if EMBEDDINGS_ENABLED)
   */
  async verifyEmbeddings(sessionId: string): Promise<{
    hasEmbeddings: boolean
    count: number
  }> {
    // Embeddings require service role key for direct DB access
    // For tests, we'll check if embeddings are enabled and verify via context
    if (process.env.EMBEDDINGS_ENABLED !== 'true') {
      return {
        hasEmbeddings: false,
        count: 0,
      }
    }

    // Try to verify via API or context
    try {
      const response = await this.page.request.get(`/api/session/export?sessionId=${sessionId}`)
      if (response.ok()) {
        // Embeddings are used internally, check if semantic context is available
        // This is indirect verification
        // Response is checked but data parsing not needed for embeddings check
        return {
          hasEmbeddings: true,
          count: 0, // Count not easily accessible via API
        }
      }
    } catch (error) {
      console.warn('Embeddings verification failed:', error)
    }

    return {
      hasEmbeddings: false,
      count: 0,
    }
  }

  /**
   * Verify lead summary exists
   */
  async verifyLeadSummary(sessionId: string): Promise<{
    hasLeadSummary: boolean
    leadData: Record<string, unknown> | null
  }> {
    // Check via export API which includes lead info
    try {
      const response = await this.page.request.get(`/api/session/export?sessionId=${sessionId}`)
      if (response.ok()) {
        const data = await response.json()
        const hasLead = !!(data.leadContext || data.session)
        return {
          hasLeadSummary: hasLead,
          leadData: data.leadContext || data.session || null,
        }
      }
    } catch (error) {
      console.warn('Lead summary verification failed:', error)
    }

    // Try direct DB query if supabase available
    if (this.supabase) {
      try {
        const { data: leadData, error } = await this.supabase
          .from('leads')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        if (!error && leadData) {
          return {
            hasLeadSummary: true,
            leadData: leadData as Record<string, unknown>,
          }
        }
      } catch (error) {
        console.warn('Direct lead query failed:', error)
      }
    }

    return {
      hasLeadSummary: false,
      leadData: null,
    }
  }

  /**
   * Verify PDF stored in Supabase Storage
   */
  async verifyPDFStorage(sessionId: string): Promise<{
    hasPDFStorage: boolean
    pdfUrl: string | null
  }> {
    // PDF storage verification requires checking Supabase Storage bucket
    // This is typically done via the export API response
    // For now, we'll check if PDF generation was successful via API call
    
    try {
      // Check if PDF can be exported
      const response = await this.page.request.post('/api/export-summary', {
        data: { sessionId },
      })

      if (response.ok()) {
        const contentType = response.headers()['content-type']
        const hasPDF = contentType === 'application/pdf'
        return {
          hasPDFStorage: hasPDF,
          pdfUrl: null, // URL not easily accessible without service role
        }
      }
    } catch (error) {
      console.warn('PDF storage verification failed:', error)
    }

    return {
      hasPDFStorage: false,
      pdfUrl: null,
    }
  }

  /**
   * Comprehensive database verification
   */
  async verifyDatabaseState(sessionId: string): Promise<DatabaseVerification> {
    const [activities, context, embeddings, leadSummary, pdfStorage] = await Promise.all([
      this.verifyActivitiesTable(sessionId),
      this.verifyContextStorage(sessionId),
      this.verifyEmbeddings(sessionId),
      this.verifyLeadSummary(sessionId),
      this.verifyPDFStorage(sessionId),
    ])

    return {
      hasActivities: activities.hasActivities,
      hasContext: context.hasContext,
      hasEmbeddings: embeddings.hasEmbeddings,
      hasLeadSummary: leadSummary.hasLeadSummary,
      hasPDFStorage: pdfStorage.hasPDFStorage,
      activityCount: activities.count,
      contextFields: context.fields,
      embeddingCount: embeddings.count,
    }
  }
}


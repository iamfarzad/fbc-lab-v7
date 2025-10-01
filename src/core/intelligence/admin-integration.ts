/**
 * Admin Integration Handler
 * Server-side integration for intelligence system with admin chat
 * This file can safely import Node.js dependencies since it's server-side only
 */

import { intelligenceService } from './index'
import { supabaseService } from '../supabase/client'
import type { ResearchResult } from './lead-research'

export interface AdminIntelligenceContext {
  leadResearch: ResearchResult[]
  adminContext: string
  conversationIds: string[]
}

/**
 * Server-side handler for admin intelligence integration
 * This can be called from admin API routes (server-side, not Edge Runtime)
 */
export class AdminIntelligenceHandler {
  /**
   * Build intelligence context for admin chat
   */
  async buildAdminContext(
    conversationIds: string[],
    sessionId: string,
    userMessage?: string
  ): Promise<AdminIntelligenceContext> {
    void userMessage
    const leadResearch: ResearchResult[] = []
    let adminContext = ''

    // Research each lead
    for (const conversationId of conversationIds) {
      try {
        // Get lead data from database
        const { data: leadData } = await supabaseService
          .from('conversations')
          .select('email, name, company_url')
          .eq('id', conversationId)
          .single()

        if (leadData?.email) {
          // Use intelligence service to research this lead
          const researchResult = await intelligenceService.researchLead?.({
            sessionId,
            email: leadData.email,
            name: leadData.name
          })

          leadResearch.push(researchResult)

          // Build admin context string
          adminContext += `\n\nLead ${conversationId}:\n`
          adminContext += `- Company: ${researchResult.company?.name || 'Unknown'} (${researchResult.company?.industry || 'Unknown industry'})\n`
          adminContext += `- Person: ${researchResult.person?.fullName || 'Unknown'} (${researchResult.role || 'Unknown role'})\n`
          adminContext += `- Confidence: ${Math.round(researchResult.confidence * 100)}%\n`
          if (researchResult.citations && researchResult.citations.length > 0) {
            adminContext += `- Sources: ${researchResult.citations.length} citations\n`
          }
        }
      } catch (error) {
        console.warn(`Failed to research lead ${conversationId}:`, error)
        // Continue with other leads
      }
    }

    return {
      leadResearch,
      adminContext: adminContext.trim(),
      conversationIds
    }
  }

  /**
   * Get intelligence context for a single lead
   */
  async getLeadIntelligence(email: string, name?: string, companyUrl?: string): Promise<ResearchResult> {
    void companyUrl
    return intelligenceService.researchLead?.({ sessionId: 'temp', email, name } as any)
  }

  /**
   * Initialize intelligence session for admin
   */
  async initAdminIntelligenceSession(sessionId: string, email: string, name?: string, companyUrl?: string) {
    void companyUrl
    return intelligenceService.initSession({
      sessionId,
      email,
      name
    } as any)
  }

  /**
   * Analyze message intent for admin context
   */
  async analyzeAdminIntent(message: string) {
    return intelligenceService.analyzeMessage(message)
  }
}

// Export singleton instance
export const adminIntelligenceHandler = new AdminIntelligenceHandler()


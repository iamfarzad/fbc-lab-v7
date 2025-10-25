import { GEMINI_MODELS } from '@/config/constants'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export interface WorkflowContext {
  sessionId: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: string
    modality?: 'text' | 'voice' | 'image'
  }>
  multimodalContext: {
    hasRecentImages: boolean
    hasRecentAudio: boolean
    hasRecentUploads: boolean
    recentAnalyses: string[]
    recentUploads: string[]
  }
  intelligenceContext: any
  conversationFlow: any
  voiceActive: boolean
  timestamp: string
  requestId: string
}

export interface WorkflowResult {
  output: string
  agent: string
  metadata: {
    stage: string
    [key: string]: any
  }
}

export class WorkflowEngine {
  private workflowName: string
  
  constructor(workflowName: string) {
    this.workflowName = workflowName
  }
  
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    console.log(`[WORKFLOW_ENGINE] Executing ${this.workflowName} for session ${context.sessionId}`)
    
    try {
      // Step 1: Load conversation context
      const conversationContext = await this.loadConversationContext(context)
      
      // Step 2: Determine funnel stage
      const stage = await this.determineFunnelStage(context, conversationContext)
      
      // Step 3: Route to appropriate agent
      const result = await this.routeToAgent(stage, context, conversationContext)
      
      // Step 4: Update conversation context
      await this.updateConversationContext(context, result)
      
      console.log(`[WORKFLOW_ENGINE] Completed ${this.workflowName} - Agent: ${result.agent}, Stage: ${result.metadata.stage}`)
      
      return result
      
    } catch (error) {
      console.error(`[WORKFLOW_ENGINE] Error in ${this.workflowName}:`, error)
      throw error
    }
  }
  
  private async loadConversationContext(_context: WorkflowContext) {
    // Load from multimodal context manager
    try {
      // const { multimodalContextManager } = await import('@/core/context/multimodal-context')
      // const conversationContext = await multimodalContextManager.getConversationContext(
      //   _context.sessionId,
      //   _context.multimodalContext.hasRecentImages,
      //   _context.multimodalContext.hasRecentAudio
      // )
      
      return {
        conversationHistory: [],
        visualContext: [],
        audioContext: [],
        uploadContext: [],
        summary: { totalMessages: 0, modalitiesUsed: [], lastActivity: '', recentVisualAnalyses: 0, recentAudioEntries: 0, recentUploads: 0 }
      }
    } catch (error) {
      console.warn('[WORKFLOW_ENGINE] Failed to load conversation context:', error)
      return {
        conversationHistory: [],
        visualContext: [],
        audioContext: [],
        uploadContext: [],
        summary: { totalMessages: 0, modalitiesUsed: [], lastActivity: '', recentVisualAnalyses: 0, recentAudioEntries: 0, recentUploads: 0 }
      }
    }
  }
  
  private async determineFunnelStage(context: WorkflowContext, _conversationContext: any): Promise<string> {
    const { conversationFlow, intelligenceContext } = context
    
    // Admin queries
    if (context.requestId.includes('admin')) return 'ADMIN'
    
    // Discovery phase - if less than 4 categories covered
    if (!conversationFlow || Object.values(conversationFlow.covered || {}).filter(Boolean).length < 4) {
      return 'DISCOVERY'
    }
    
    // Scoring phase - 4+ categories covered, but no fit score yet
    if (!intelligenceContext?.fitScore) {
      return 'SCORING'
    }
    
    // Closing phase - pitch delivered but no booking
    if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
      return 'CLOSING'
    }
    
    // Sales pitch phase - fit determined
    const { workshop, consulting } = intelligenceContext.fitScore || {}
    if (workshop > consulting && workshop > 0.7) {
      return 'WORKSHOP_PITCH'
    }
    if (consulting > workshop && consulting > 0.7) {
      return 'CONSULTING_PITCH'
    }
    
    // Default back to discovery
    return 'DISCOVERY'
  }
  
  private async routeToAgent(stage: string, context: WorkflowContext, conversationContext: any): Promise<WorkflowResult> {
    console.log(`[WORKFLOW_ENGINE] Routing to agent for stage: ${stage}`)
    
    switch (stage) {
      case 'DISCOVERY':
        return await this.discoveryAgent(context, conversationContext)
        
      case 'SCORING':
        return await this.scoringAgent(context, conversationContext)
        
      case 'WORKSHOP_PITCH':
        return await this.workshopSalesAgent(context, conversationContext)
        
      case 'CONSULTING_PITCH':
        return await this.consultingSalesAgent(context, conversationContext)
        
      case 'CLOSING':
        return await this.closerAgent(context, conversationContext)
        
      case 'SUMMARY':
        return await this.summaryAgent(context, conversationContext)
        
      case 'ADMIN':
        return await this.adminAgent(context, conversationContext)
        
      default:
        return await this.discoveryAgent(context, conversationContext)
    }
  }
  
  private async discoveryAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext, voiceActive } = context
    
    // Build system prompt
    let systemPrompt = `You are F.B/c Discovery AI - a lead qualification specialist.

INTELLIGENCE CONTEXT:
${intelligenceContext?.name ? `Lead: ${intelligenceContext.name}` : ''}
${intelligenceContext?.company?.name ? `Company: ${intelligenceContext.company.name}` : ''}
${intelligenceContext?.company?.industry ? `Industry: ${intelligenceContext.company.industry}` : ''}
${intelligenceContext?.person?.role ? `Role: ${intelligenceContext.person.role}` : ''}

YOUR MISSION:
Systematically discover lead's needs across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

CONVERSATION FLOW STATUS:
${conversationFlow ? this.formatConversationStatus(conversationFlow) : 'Starting discovery'}

MULTIMODAL AWARENESS:`

    if (multimodalContext.hasRecentImages) {
      systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
      if (multimodalContext.recentAnalyses.length > 0) {
        systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
      }
    }

    if (multimodalContext.hasRecentUploads) {
      systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
    }

    if (voiceActive) {
      systemPrompt += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
    }

    systemPrompt += `

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language and build on latest turn
- Natural integration of multimodal context:
  ✅ GOOD: "I noticed your dashboard shows revenue declining..."
  ❌ BAD: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}

${conversationFlow?.shouldOfferRecap 
  ? 'Deliver a two-sentence recap of what you learned, then ask your next question.' 
  : ''}`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.7
    })

    return {
      output: result.text,
      agent: 'Discovery Agent',
      metadata: {
        stage: 'DISCOVERY',
        categoriesCovered: conversationFlow ? Object.values(conversationFlow.covered || {}).filter(Boolean).length : 0,
        recommendedNext: conversationFlow?.recommendedNext || null,
        multimodalUsed: multimodalContext.hasRecentImages || multimodalContext.hasRecentAudio
      }
    }
  }
  
  private async scoringAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext } = context
    
    const systemPrompt = `You are F.B/c Scoring AI - calculate lead scores.

LEAD INTELLIGENCE:
${JSON.stringify(intelligenceContext, null, 2)}

CONVERSATION DATA:
Categories covered: ${conversationFlow ? Object.values(conversationFlow.covered || {}).filter(Boolean).length : 0}/6
User turns: ${conversationFlow?.totalUserTurns || 0}

MULTIMODAL ENGAGEMENT:
Voice used: ${multimodalContext.hasRecentAudio ? 'Yes' : 'No'}
Screen shared: ${multimodalContext.hasRecentImages ? 'Yes' : 'No'}
Documents uploaded: ${multimodalContext.hasRecentUploads ? 'Yes' : 'No'}

SCORING CRITERIA:

1. Role Seniority (30 points max):
   - C-level/Founder: 30
   - VP/Director: 20
   - Manager: 10
   - Individual contributor: 5

2. Company Signals (25 points max):
   - Enterprise (500+ employees): 25
   - Mid-market (50-500): 15
   - Small (10-50): 10
   - Startup (<10): 5

3. Conversation Quality (25 points max):
   - All 6 categories covered: 25
   - 4-5 categories: 15
   - 2-3 categories: 10
   - 1 category: 5

4. Budget Signals (20 points max):
   - Explicit budget mentioned: 20
   - Timeline urgency (Q1/Q2): 15
   - Just exploring: 5

MULTIMODAL BONUSES:
- Voice used: +10 points (commitment signal)
- Screen shared: +15 points (HIGH INTENT - showing pain points)
- Webcam shown: +5 points (comfort/trust)
- Documents uploaded: +10 points (prepared/serious)

FIT SCORING (0.0 - 1.0):

Workshop fit indicators:
- Manager/Team Lead role (not C-level)
- Mid-size company (50-500 employees)
- Mentions: "training", "teach team", "upskilling", "workshop"
- Budget range: $5K-$15K signals

Consulting fit indicators:
- C-level/VP role
- Enterprise or well-funded startup
- Mentions: "custom build", "implementation", "integrate", "scale"
- Budget range: $50K+ signals

OUTPUT REQUIRED (JSON only, no explanation):
{
  "leadScore": <number 0-100>,
  "fitScore": {
    "workshop": <number 0.0-1.0>,
    "consulting": <number 0.0-1.0>
  },
  "reasoning": "<one sentence explanation>"
}`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Calculate the lead score and fit scores based on the provided context.' }
      ],
      temperature: 0.3
    })

    // Parse JSON from response
    let scores
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0])
      } else {
        scores = {
          leadScore: 50,
          fitScore: { workshop: 0.5, consulting: 0.5 },
          reasoning: 'Could not parse scores'
        }
      }
    } catch (error) {
      console.error('Failed to parse scoring result:', error)
      scores = {
        leadScore: 50,
        fitScore: { workshop: 0.5, consulting: 0.5 },
        reasoning: 'Parsing error'
      }
    }

    return {
      output: `Lead Score: ${scores.leadScore}/100\nWorkshop Fit: ${(scores.fitScore.workshop * 100).toFixed(0)}%\nConsulting Fit: ${(scores.fitScore.consulting * 100).toFixed(0)}%\n\n${scores.reasoning}`,
      agent: 'Scoring Agent',
      metadata: {
        stage: 'SCORING',
        leadScore: scores.leadScore,
        fitScore: scores.fitScore,
        reasoning: scores.reasoning
      }
    }
  }
  
  private async workshopSalesAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext } = context
    
    const systemPrompt = `You are F.B/c Workshop Sales AI - pitch hands-on AI workshops.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext.hasRecentUploads ? '- Reviewed their documents' : ''}

YOUR PITCH STRUCTURE:
1. Acknowledge pain from discovery
   "So you mentioned your team struggles with [X from discovery]..."

2. Position workshop as solution
   "We run hands-on AI workshops where your team learns to [solve X].
    For ${intelligenceContext?.company?.industry || 'your industry'}, we focus on [specific use case]."

3. Show ROI
   Example: "Training 10 people = $50K in productivity gains over 6 months"

4. Soft CTA
   "Want to see if a workshop makes sense? I can send you details and available dates."

CONSTRAINTS:
- Don't mention consulting (that's a different product)
- Keep pricing vague until they book call
- Create urgency: "Next workshop is in [timeframe], spots are limited"
- Reference multimodal moments naturally:
  ✅ "When you showed me your Excel dashboard, I noticed..."
  ❌ "Based on screen share analysis..."

STYLE: Conversational, no fluff, focus on value`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.7
    })

    return {
      output: result.text,
      agent: 'Workshop Sales Agent',
      metadata: {
        stage: 'WORKSHOP_PITCH',
        pitchDelivered: true,
        multimodalReferenced: multimodalContext.hasRecentImages
      }
    }
  }
  
  private async consultingSalesAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext } = context
    
    const systemPrompt = `You are F.B/c Consulting Sales AI - pitch custom AI implementations.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext.hasRecentUploads ? '- Reviewed their documents' : ''}

YOUR PITCH STRUCTURE:
1. Acknowledge enterprise needs from discovery
   "I see you're dealing with [X from discovery] at enterprise scale..."

2. Position consulting as solution
   "We build custom AI systems that integrate with your existing infrastructure.
    For ${intelligenceContext?.company?.industry || 'your industry'}, we focus on [specific enterprise use case]."

3. Show enterprise ROI
   Example: "Custom implementation = $200K+ in annual savings"

4. Soft CTA
   "Want to explore a custom solution? Let's schedule a strategy call with Farzad."

CONSTRAINTS:
- Don't mention workshops (that's a different product)
- Focus on enterprise scale and custom solutions
- Reference their specific pain points and scale
- Reference multimodal moments naturally:
  ✅ "When you showed me your enterprise dashboard, I noticed..."
  ❌ "Based on screen share analysis..."

STYLE: Enterprise-focused, consultative, high-value`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.7
    })

    return {
      output: result.text,
      agent: 'Consulting Sales Agent',
      metadata: {
        stage: 'CONSULTING_PITCH',
        pitchDelivered: true,
        multimodalReferenced: multimodalContext.hasRecentImages
      }
    }
  }
  
  private async closerAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext } = context
    
    const systemPrompt = `You are F.B/c Closer AI - handle objections and close deals.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 800) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext.hasRecentUploads ? '- Reviewed their documents' : ''}

YOUR CLOSING STRATEGY:
1. Acknowledge their hesitation
   "I understand your concern about [objection]..."

2. Address with multimodal evidence
   "But remember - you experienced our AI capabilities firsthand in this conversation.
    We had a voice discussion, I analyzed your dashboard in real-time, I understood your business plan.
    This is exactly what we build for clients."

3. Create urgency
   "The next available slot is [timeframe]. Would you like to secure that?"

4. Soft close
   "What would need to happen for this to make sense for you?"

CONSTRAINTS:
- Use multimodal context as proof of concept
- Address specific objections from their responses
- Create urgency without being pushy
- Reference their specific pain points

STYLE: Consultative, understanding, but confident`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.7
    })

    return {
      output: result.text,
      agent: 'Closer Agent',
      metadata: {
        stage: 'CLOSING',
        objectionHandled: true,
        multimodalReferenced: multimodalContext.hasRecentImages || multimodalContext.hasRecentAudio
      }
    }
  }
  
  private async summaryAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const { intelligenceContext, conversationFlow, multimodalContext } = context
    
    const systemPrompt = `You are F.B/c Summary AI - create post-conversation analysis.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

CONVERSATION SUMMARY:
0 messages across text modalities

DISCOVERY INSIGHTS:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 1000) : 'None'}

MULTIMODAL CONTEXT:
${multimodalContext.hasRecentImages ? '- Screen/webcam analysis available' : ''}
${multimodalContext.hasRecentUploads ? '- Document analysis available' : ''}
${multimodalContext.hasRecentAudio ? '- Voice transcript available' : ''}

YOUR SUMMARY STRUCTURE:
1. Executive Summary
   - Lead profile and company context
   - Key pain points identified
   - Recommended next steps

2. Discovery Analysis
   - Categories covered and evidence
   - Multimodal insights gained
   - Lead score and fit assessment

3. Recommended Actions
   - Specific next steps
   - Timeline recommendations
   - Resource requirements

STYLE: Professional, comprehensive, actionable`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.5
    })

    return {
      output: result.text,
      agent: 'Summary Agent',
      metadata: {
        stage: 'SUMMARY',
        summaryGenerated: true,
        totalMessages: 0,
        modalitiesUsed: ['text']
      }
    }
  }
  
  private async adminAgent(context: WorkflowContext, _conversationContext: any): Promise<WorkflowResult> {
    const systemPrompt = `You are F.B/c AI Admin Assistant, specialized in business intelligence and management.

Your capabilities:
- Analyze lead data and provide actionable insights
- Draft professional emails for campaigns
- Suggest meeting scheduling strategies
- Interpret analytics and performance metrics
- Provide business recommendations based on data
- Help with lead scoring and prioritization

Response style: Be concise, actionable, and data-driven.`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: context.messages,
      system: systemPrompt,
      temperature: 0.5
    })

    return {
      output: result.text,
      agent: 'Admin Agent',
      metadata: {
        stage: 'ADMIN',
        adminQuery: true
      }
    }
  }
  
  private async updateConversationContext(context: WorkflowContext, result: WorkflowResult) {
    try {
      const { multimodalContextManager } = await import('@/core/context/multimodal-context')
      
      // Add user message
      const lastUserMessage = context.messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        await multimodalContextManager.addConversationTurn(context.sessionId, {
          role: 'user',
          text: lastUserMessage.content,
          isFinal: true,
          modality: lastUserMessage.modality || 'text'
        })
      }
      
      // Add agent response
      await multimodalContextManager.addConversationTurn(context.sessionId, {
        role: 'agent',
        text: result.output,
        isFinal: true,
        modality: 'text'
      })
      
    } catch (error) {
      console.warn('[WORKFLOW_ENGINE] Failed to update conversation context:', error)
    }
  }
  
  private formatConversationStatus(flow: any): string {
    const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
    const covered = categories.filter(cat => flow.covered?.[cat])
    const pending = categories.filter(cat => !flow.covered?.[cat])
    
    return `
Covered (${covered.length}/6): ${covered.join(', ')}
Pending: ${pending.join(', ')}
Total user turns: ${flow.totalUserTurns || 0}
${flow.recommendedNext ? `Next recommended: ${flow.recommendedNext}` : 'All categories covered'}
`
  }
}
import { ContextStorage } from './context-storage'
import { MultimodalContext, ConversationEntry, VisualEntry, LeadContext, UploadEntry, AudioEntry, ConversationTurn } from './context-types'
import { vercelCache } from '@/lib/vercel-cache'
import { CONTEXT_CONFIG, SECURITY_CONFIG } from '@/config/constants'
import { walLog } from './write-ahead-log'
import { summarizeConversationWindow, shouldSummarize, extractSummaries } from './context-summarizer'
import { detectPII, shouldRedact, redactPII } from '@/core/security/pii-detector'
import { auditLog } from '@/core/security/audit-logger'

// Define a local alias for the allowed modalities so we don't widen to string[]
type Modality = 'text' | 'video' | 'image' | 'audio';

// Helper: coerce any array into a safe Modality[]
function coerceModalities(v: unknown): Modality[] {
  const allowed: Modality[] = ['text', 'video', 'image', 'audio'];
  if (!Array.isArray(v)) return [];
  return v
    .map(x => (typeof x === 'string' && (allowed as readonly string[]).includes(x)) ? (x as Modality) : 'text')
    .slice();
}

// Runtime guard for AudioEntry
function isAudioEntry(x: unknown): x is AudioEntry {
  const o = x as any;
  return !!o && typeof o === 'object'
    && typeof o.id === 'string'
    && typeof o.type === 'string'
    && typeof o.timestamp === 'string'
    && typeof o.data === 'object';
}

// Safely normalize a list that was previously unknown[]
function asAudioEntries(list: unknown): AudioEntry[] {
  if (!Array.isArray(list)) return [];
  const out: AudioEntry[] = [];
  for (const item of list) {
    if (isAudioEntry(item)) out.push(item);
  }
  return out;
}

export function createInitialContext(sessionId: string, leadContext?: Partial<LeadContext>): MultimodalContext {
  return {
    sessionId,
    conversationHistory: [],
    conversationTurns: [], // Google-style export format
    visualContext: [],
    audioContext: [],
    uploadContext: [],
    leadContext: {
      email: leadContext?.email ?? '',
      name: leadContext?.name ?? '',
      company: leadContext?.company ?? '',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      modalitiesUsed: [],
      totalTokens: 0,
    },
  };
}

export function makeTextEntry(text: string, metadata?: ConversationEntry['metadata']): ConversationEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    modality: 'text',
    content: text,
    metadata: metadata ?? {}, // never undefined
  };
}

// Coerce strings to a minimal MultimodalContext
function ensureContext(ctx: unknown): MultimodalContext {
  if (typeof ctx === 'string') {
    return {
      sessionId: 'unknown',
      conversationHistory: [],
      conversationTurns: [],
      visualContext: [],
      audioContext: [],
      uploadContext: [],
      leadContext: { email: '', name: '', company: '' },
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        modalitiesUsed: ['text'],
        totalTokens: 0,
      },
    };
  }
  const obj = (ctx ?? {}) as Partial<MultimodalContext>;
  return {
    sessionId: obj.sessionId || 'unknown',
    conversationHistory: obj.conversationHistory || [],
    conversationTurns: obj.conversationTurns || [],
    visualContext: obj.visualContext || [],
    audioContext: asAudioEntries(obj.audioContext || []),
    uploadContext: obj.uploadContext || [],
    leadContext: obj.leadContext || { email: '', name: '', company: '' },
    metadata: obj.metadata || {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      modalitiesUsed: [],
      totalTokens: 0,
    },
  };
}

export function makeVisualEntry(p: {
  type: VisualEntry['type'];
  analysis: string;
  imageData?: string;
  size?: number;
  confidence?: number;
  format?: VisualEntry['metadata']['format'];
}): VisualEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: p.type,
    analysis: p.analysis,
    imageData: p.imageData ?? '',
    metadata: {
      size: p.size ?? 0,
      format: p.format ?? p.type,
      confidence: p.confidence ?? 0,
    },
  };
}

export class MultimodalContextManager {
  private contextStorage: ContextStorage
  private activeContexts = new Map<string, MultimodalContext>()

  constructor() {
    this.contextStorage = new ContextStorage()
  }

  async initializeSession(sessionId: string, leadContext?: LeadContext): Promise<MultimodalContext> {
    const context: MultimodalContext = {
      sessionId,
      conversationHistory: [],
      conversationTurns: [],
      visualContext: [],
      audioContext: [],
      uploadContext: [],
      leadContext: leadContext ?? { name: '', email: '', company: '' },
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        modalitiesUsed: [],
        totalTokens: 0
      }
    }

    // Store in memory for fast access
    this.activeContexts.set(sessionId, context)

    // Note: Like FB-c_labV2, we don't store multimodal context in database
    // It's managed purely in memory for now to avoid schema complications
    // Action logged`)
    return context
  }

  async addTextMessage(sessionId: string, content: string, metadata?: ConversationEntry['metadata']): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)

    // Check for PII (security & compliance)
    let processedContent = content
    if (SECURITY_CONFIG.ENABLE_PII_DETECTION) {
      const detection = detectPII(content)
      
      if (detection.hasPII) {
        console.warn(`⚠️ PII detected in message: ${detection.types.join(', ')}`)
        
        // Log to audit trail
        if (SECURITY_CONFIG.ENABLE_AUDIT_LOGGING) {
          await auditLog.logPIIDetection(
            sessionId,
            detection.types,
            detection.matches.length,
            SECURITY_CONFIG.ENABLE_PII_REDACTION
          )
        }
        
        // Redact if enabled (production only)
        if (SECURITY_CONFIG.ENABLE_PII_REDACTION && shouldRedact(content)) {
          processedContent = redactPII(content)
          console.log(`🔒 PII redacted from message`)
        }
      }
    }

    const entry: ConversationEntry = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      modality: 'text',
      content: processedContent,
      metadata: metadata ?? {}
    }

    // Log to WAL first (critical path for data reliability)
    await walLog.logOperation(sessionId, 'add_text', entry)

    context.conversationHistory.push(entry)
    context.metadata.lastUpdated = entry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'text'])

    // Estimate tokens (rough approximation)
    context.metadata.totalTokens += Math.ceil(processedContent.length / 4)

    await this.saveContext(sessionId, context)
  }

  async addVoiceMessage(sessionId: string, transcription: string, duration: number, metadata?: { sampleRate?: number; format?: string; confidence?: number }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)

    // Add to conversation history
    const convEntry: ConversationEntry = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      modality: 'audio', // not 'voice'
      content: transcription,
      metadata: {
        duration,
        transcription,
        confidence: metadata?.confidence,
        ...(typeof metadata?.sampleRate === 'number' ? { sampleRate: metadata.sampleRate } : {}),
        ...(metadata?.format ? { format: metadata.format } : {}),
      }
    }

    context.conversationHistory.push(convEntry)

    // Add to audio context
    const audioEntry: AudioEntry = {
      id: convEntry.id,
      type: 'voice_transcript',
      timestamp: convEntry.timestamp,
      data: {
        transcript: transcription,
        isFinal: true,
        duration,
        languageCode: metadata?.format?.includes('nb-NO') ? 'nb-NO' : 'en-US',
      },
      metadata: {
        confidence: metadata?.confidence ?? 1,
        format: metadata?.format ?? 'pcm16@16000',
      }
    }

    context.audioContext.push(audioEntry)
    context.metadata.lastUpdated = convEntry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'audio']) // not 'voice'

    // Estimate tokens
    context.metadata.totalTokens += Math.ceil(transcription.length / 4)

    await this.saveContext(sessionId, context)
    // Action logged
  }

  async addVisualAnalysis(sessionId: string, analysis: string, type: 'webcam' | 'screen' | 'upload', imageSize?: number, imageData?: string): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)

    // Add to conversation history
    const convEntry: ConversationEntry = {
      id: `vision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      modality: 'image', // not 'vision'
      content: analysis,
      metadata: { ...(typeof imageSize === 'number' ? { imageSize } : {}) }
    }

    context.conversationHistory.push(convEntry)

    // Add to visual context
    const visualEntry: VisualEntry = {
      id: convEntry.id,
      timestamp: convEntry.timestamp,
      type,
      analysis,
      imageData: imageData ?? '',
      metadata: {
        size: imageSize || 0,
        format: type,
        confidence: 0.9 // Assume high confidence for now
      }
    }

    // Log to WAL (critical for visual analyses)
    await walLog.logOperation(sessionId, 'add_visual', visualEntry)

    context.visualContext.push(visualEntry)
    context.metadata.lastUpdated = convEntry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'image']) // not 'vision'

    // Estimate tokens for analysis
    context.metadata.totalTokens += Math.ceil(analysis.length / 4)

    await this.saveContext(sessionId, context)
  }

  async addUploadEntry(sessionId: string, payload: {
    id: string
    filename: string
    mimeType: string
    size: number
    analysis: string
    summary?: string
    dataUrl?: string
    pages?: number
  }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)

    const entryTimestamp = new Date().toISOString()
    const uploadEntry = {
      id: payload.id,
      timestamp: entryTimestamp,
      filename: payload.filename,
      mimeType: payload.mimeType,
      size: payload.size,
      analysis: payload.analysis,
      summary: payload.summary,
      dataUrl: payload.dataUrl,
      pages: payload.pages
    }

    // Log to WAL (critical for file uploads)
    await walLog.logOperation(sessionId, 'add_upload', uploadEntry)

    context.uploadContext = context.uploadContext || []
    context.uploadContext.push(uploadEntry)
    context.metadata.lastUpdated = entryTimestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'text'])
    context.metadata.totalTokens += Math.ceil(payload.analysis.length / 4)

    await this.saveContext(sessionId, context)
  }

  /**
   * Add conversation turn for Google-style export format
   * Tracks every user/AI message for clean transcript export
   */
  async addConversationTurn(sessionId: string, turn: Omit<ConversationTurn, 'timestamp'> & { timestamp?: string }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)
    
    const conversationTurn: ConversationTurn = {
      ...turn,
      timestamp: turn.timestamp || new Date().toISOString()
    }

    if (!context.conversationTurns) {
      context.conversationTurns = []
    }
    
    context.conversationTurns.push(conversationTurn)
    context.metadata.lastUpdated = conversationTurn.timestamp

    // Track modality usage
    if (turn.modality) {
      const modalityMap: Record<string, 'text' | 'image' | 'audio' | 'video'> = {
        'text': 'text',
        'voice': 'audio',
        'image': 'image'
      }
      const modality = modalityMap[turn.modality]
      if (modality) {
        context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, modality])
      }
    }

    // Estimate tokens
    context.metadata.totalTokens += Math.ceil(turn.text.length / 4)

    await this.saveContext(sessionId, context)
  }

  /**
   * Add tool call to the last conversation turn
   */
  async addToolCallToLastTurn(sessionId: string, toolCall: { name: string; args: Record<string, any>; id?: string }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)
    
    if (!context.conversationTurns) {
      context.conversationTurns = []
    }

    // Add as a separate turn or attach to last AI turn
    const lastTurn = context.conversationTurns[context.conversationTurns.length - 1]
    
    if (lastTurn && lastTurn.role === 'agent' && !lastTurn.isFinal) {
      // Attach tool call to in-progress AI turn
      lastTurn.toolCall = toolCall
    } else {
      // Create new turn for tool call
      context.conversationTurns.push({
        role: 'agent',
        text: `[Tool: ${toolCall.name}]`,
        isFinal: true,
        timestamp: new Date().toISOString(),
        toolCall
      })
    }

    context.metadata.lastUpdated = new Date().toISOString()
    await this.saveContext(sessionId, context)
  }

  /**
   * Add file upload info to conversation turn
   */
  async addFileUploadTurn(sessionId: string, fileInfo: { name: string; analysis?: string }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)
    
    if (!context.conversationTurns) {
      context.conversationTurns = []
    }

    context.conversationTurns.push({
      role: 'user',
      text: `[File Uploaded: ${fileInfo.name}] Please analyze this file.`,
      isFinal: true,
      timestamp: new Date().toISOString(),
      modality: 'text',
      fileUpload: fileInfo
    })

    context.metadata.lastUpdated = new Date().toISOString()
    await this.saveContext(sessionId, context)
  }

  /**
   * Add voice transcript to context (from real-time voice conversation)
   */
  async addVoiceTranscript(
    sessionId: string,
    transcript: string,
    role: 'user' | 'assistant',
    isFinal: boolean,
    metadata?: Partial<AudioEntry['metadata']>
  ): Promise<void> {
    try {
      const context = await this.getOrCreateContext(sessionId)
      const entryTimestamp = new Date().toISOString()

      const audioEntry: AudioEntry = {
        id: crypto.randomUUID(),
        type: role === 'user' ? 'voice_input' : 'voice_output',
        timestamp: entryTimestamp,
        data: {
          transcript,
          isFinal,
          languageCode: metadata?.format?.includes('nb-NO') ? 'nb-NO' : 'en-US',
        },
        metadata: {
          confidence: metadata?.confidence ?? 1.0,
          format: role === 'user' ? 'pcm16@16000' : 'pcm16@24000',
          size: metadata?.size,
          storedRaw: metadata?.storedRaw ?? false,
        }
      }

      // Log to WAL first (critical for voice transcripts)
      if (isFinal) {
        await walLog.logOperation(sessionId, 'add_voice', audioEntry)
      }

      context.audioContext = context.audioContext || []
      context.audioContext.push(audioEntry)
      
      // Add to conversation history if final
      if (isFinal && transcript.trim().length > 0) {
        const conversationEntryMetadata: ConversationEntry['metadata'] = {
          transcription: transcript,
          confidence: metadata?.confidence ?? 1,
          speaker: role === 'assistant' ? 'model' : 'user',
          languageCode: audioEntry.data.languageCode,
        }
        if (typeof metadata?.size === 'number') {
          conversationEntryMetadata.duration = metadata.size;
        }

        const conversationEntry: ConversationEntry = {
          id: audioEntry.id,
          timestamp: entryTimestamp,
          content: transcript,
          modality: 'audio',
          metadata: conversationEntryMetadata
        }
        context.conversationHistory.push(conversationEntry)
      }

      context.metadata.lastUpdated = entryTimestamp
      context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'audio'])
      context.metadata.totalTokens += Math.ceil(transcript.length / 4)

      await this.saveContext(sessionId, context)
    } catch (err) {
      console.error('Failed to add voice transcript to context (non-fatal):', err)
      // Don't throw - this is best-effort storage
    }
  }

  /**
   * Get voice transcripts from context
   */
  async getVoiceTranscripts(sessionId: string, limit?: number): Promise<string[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    return context.audioContext
      .filter(e => e.data.transcript && e.data.isFinal)
      .map(e => e.data.transcript!)
      .filter(Boolean)
      .slice(-(limit ?? 10))
  }

  /**
   * Get voice context entries
   */
  async getVoiceContext(sessionId: string): Promise<AudioEntry[]> {
    const context = await this.getContext(sessionId)
    return context?.audioContext ?? []
  }

  async getContext(sessionId: string): Promise<MultimodalContext | null> {
    // 1. Check memory first (fastest)
    if (this.activeContexts.has(sessionId)) {
      return this.activeContexts.get(sessionId)!
    }

    // 2. Check Redis (active sessions)
    try {
      const cached = await vercelCache.get<MultimodalContext>('multimodal', sessionId)
      if (cached) {
        this.activeContexts.set(sessionId, cached)
        console.log(`✅ Context loaded from Redis: ${sessionId}`)
        return cached
      }
    } catch (err) {
      console.error('Redis get failed:', err)
      // Continue to database fallback
    }

    // 3. Check Supabase (archived sessions)
    const stored = await this.contextStorage.get(sessionId)
    if (stored?.multimodal_context) {
      const context = ensureContext(stored.multimodal_context)
      this.activeContexts.set(sessionId, context)
      console.log(`✅ Context loaded from Supabase: ${sessionId}`)
      return context
    }

    return null
  }

  async getConversationHistory(sessionId: string, limit?: number): Promise<ConversationEntry[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    const history = context.conversationHistory
    return limit ? history.slice(-limit) : history
  }

  async getRecentVisualContext(sessionId: string, limit: number = 3): Promise<VisualEntry[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    return context.visualContext.slice(-limit)
  }

  async getRecentAudioContext(sessionId: string, limit: number = 3): Promise<AudioEntry[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    return asAudioEntries(context.audioContext).slice(-limit)
  }

  async getContextSummary(sessionId: string): Promise<{
    totalMessages: number
    modalitiesUsed: string[]
    lastActivity: string
    recentTopics: string[]
  }> {
    const context = await this.getContext(sessionId)
    if (!context) {
      return { totalMessages: 0, modalitiesUsed: [], lastActivity: '', recentTopics: [] }
    }

    const recentMessages = context.conversationHistory.slice(-5)
    const recentTopics = this.extractTopics(recentMessages)

    return {
      totalMessages: context.conversationHistory.length,
      modalitiesUsed: context.metadata.modalitiesUsed,
      lastActivity: context.metadata.lastUpdated,
      recentTopics
    }
  }

  private async getOrCreateContext(sessionId: string): Promise<MultimodalContext> {
    let context = await this.getContext(sessionId)
    if (!context) {
      context = await this.initializeSession(sessionId)
    }
    return context
  }

  // Enhanced method to get context for conversation
  async getConversationContext(sessionId: string, includeRecentVisual: boolean = true, includeRecentAudio: boolean = true): Promise<{
    conversationHistory: ConversationEntry[]
    visualContext: VisualEntry[]
    audioContext: AudioEntry[]
    uploadContext: UploadEntry[]
    summary: {
      totalMessages: number
      modalitiesUsed: Modality[]
      lastActivity: string
      recentVisualAnalyses: number
      recentAudioEntries: number
      recentUploads: number
    }
  }> {
    const context = await this.getOrCreateContext(sessionId)
    if (!context) {
      return {
        conversationHistory: [],
        visualContext: [],
        audioContext: [],
        uploadContext: [],
        summary: {
          totalMessages: 0,
          modalitiesUsed: [],
          lastActivity: '',
          recentVisualAnalyses: 0,
          recentAudioEntries: 0,
          recentUploads: 0
        }
      }
    }

    const recentVisual = includeRecentVisual ? context.visualContext.slice(-3) : []
    const recentAudio = includeRecentAudio ? asAudioEntries(context.audioContext).slice(-3) : []
    const recentUploads = context.uploadContext ? context.uploadContext.slice(-3) : []

    return {
      conversationHistory: context.conversationHistory.slice(-10), // Last 10 messages
      visualContext: recentVisual,
      audioContext: recentAudio,
      uploadContext: recentUploads,
      summary: {
        totalMessages: context.conversationHistory.length,
        modalitiesUsed: context.metadata.modalitiesUsed,
        lastActivity: context.metadata.lastUpdated,
        recentVisualAnalyses: recentVisual.length,
        recentAudioEntries: recentAudio.length,
        recentUploads: recentUploads.length
      }
    }
  }

  // Method to prepare context for AI chat
  async prepareChatContext(sessionId: string, includeVisual: boolean = true, includeAudio: boolean = false): Promise<{
    systemPrompt: string
    contextData: any
    multimodalContext: {
      hasRecentImages: boolean
      hasRecentAudio: boolean
      recentAnalyses: string[]
      recentUploads: string[]
      hasRecentUploads: boolean
    }
  }> {
    const context = await this.getConversationContext(sessionId, includeVisual, includeAudio)

    // Build system prompt with multimodal context
    let systemPrompt = "You are F.B/c AI, a helpful business assistant with multimodal capabilities."

    // Extract conversation summaries (for long conversations)
    const summaries = extractSummaries(context.conversationHistory)
    if (summaries.length > 0) {
      systemPrompt += "\n\n PREVIOUS CONVERSATION SUMMARY:\n" + summaries.join('\n\n')
    }

    if (context.summary.recentVisualAnalyses > 0 || context.summary.recentAudioEntries > 0 || context.summary.recentUploads > 0) {
      systemPrompt += "\n\nYou have access to recent multimodal context from this conversation:"
    }

    const multimodalContext = {
      hasRecentImages: context.visualContext.length > 0,
      hasRecentAudio: context.audioContext.length > 0,
      recentAnalyses: context.visualContext.map(v => v.analysis).slice(-2), // Last 2 analyses
      recentUploads: context.uploadContext.map(entry => entry.analysis).slice(-2),
      hasRecentUploads: context.uploadContext.length > 0
    }

    if (multimodalContext.hasRecentImages) {
      systemPrompt += `\n\nRecent visual analyses (${context.visualContext.length} items):`
      multimodalContext.recentAnalyses.forEach((analysis, i) => {
        systemPrompt += `\n${i + 1}. ${analysis.substring(0, 200)}${analysis.length > 200 ? '...' : ''}`
      })
    }

    if (multimodalContext.hasRecentUploads) {
      const formatSize = (size: number) => `${Math.round((size / 1024) * 10) / 10} KB`
      systemPrompt += `\n\nRecent document uploads (${context.uploadContext.length} items):`
      context.uploadContext.forEach((upload, index) => {
        const summarySnippet = upload.summary ? ` Summary sample: ${upload.summary.substring(0, 140)}${upload.summary.length > 140 ? '...' : ''}` : ''
        const pageInfo = upload.pages ? `, ${upload.pages} page${upload.pages === 1 ? '' : 's'}` : ''
        systemPrompt += `\n${index + 1}. ${upload.filename} (${upload.mimeType || 'unknown'}, ${formatSize(upload.size)}${pageInfo}) — ${upload.analysis}.${summarySnippet}`
      })
    }

    return {
      systemPrompt,
      contextData: context,
      multimodalContext
    }
  }

  private async saveContext(sessionId: string, context: MultimodalContext): Promise<void> {
    // 1. Update in-memory (fastest)
    this.activeContexts.set(sessionId, context)
    
    // 2. Check if conversation needs summarization (long conversations)
    if (shouldSummarize(context.conversationHistory.length)) {
      try {
        const summary = await summarizeConversationWindow(context.conversationHistory)
        
        if (summary) {
          // Store summary as special entry
          context.conversationHistory.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            modality: 'text',
            content: `[CONTEXT SUMMARY] ${summary}`,
            metadata: { speaker: 'assistant', type: 'summary' }
          })
          
          console.log(`✅ Summarized conversation at ${context.conversationHistory.length} messages for ${sessionId}`)
        }
      } catch (err) {
        console.error('Context summarization failed (non-fatal):', err)
        // Continue - summarization is optimization, not critical
      }
    }
    
    // 3. Persist to Redis (active session cache)
    try {
      await vercelCache.set('multimodal', sessionId, context, {
        ttl: CONTEXT_CONFIG.REDIS_TTL,
        tags: ['session', 'multimodal']
      })
      // Only log if Redis is actually configured (no false positives)
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        console.log(`✅ Context saved to Redis: ${sessionId}`)
      }
    } catch (err) {
      console.error('Redis save failed (non-fatal):', err)
      // Non-fatal - in-memory still works
    }
  }

  private extractTopics(messages: ConversationEntry[]): string[] {
    const topics = new Set<string>()
    const content = messages.map(m => m.content).join(' ').toLowerCase()

    // Simple keyword extraction (could be enhanced with NLP)
    const topicKeywords = {
      business: /\b(business|company|organization|enterprise|startup)\b/g,
      ai: /\b(ai|artificial.intelligence|machine.learning|automation)\b/g,
      analysis: /\b(analysis|analyze|research|study|investigation)\b/g,
      technical: /\b(technical|technology|software|development|code)\b/g,
      financial: /\b(financial|money|cost|budget|revenue|profit)\b/g,
      visual: /\b(image|photo|picture|screen|screenshot|camera)\b/g,
      audio: /\b(audio|voice|sound|speech|music|recording)\b/g
    }

    for (const [topic, pattern] of Object.entries(topicKeywords)) {
      if (pattern.test(content)) {
        topics.add(topic)
      }
    }

    return Array.from(topics)
  }

  /**
   * Archive conversation to Supabase for long-term storage
   * Called at conversation end before cleanup
   */
  async archiveConversation(sessionId: string): Promise<void> {
    const context = await this.getContext(sessionId)
    if (!context) {
      console.warn(`⚠️ No context to archive for session: ${sessionId}`)
      return
    }

    // Don't archive trivial conversations
    if (context.conversationHistory.length < CONTEXT_CONFIG.MIN_MESSAGES_FOR_ARCHIVE) {
      console.log(`⏭️ Skipping archive: only ${context.conversationHistory.length} messages`)
      return
    }

    try {
      // Store full context in Supabase conversation_contexts
      await this.contextStorage.store(sessionId, {
        session_id: sessionId,
        email: context.leadContext.email,
        name: context.leadContext.name,
        company_context: context.leadContext.company,
        multimodal_context: JSON.parse(JSON.stringify(context)) as any, // Serialize to JSON-compatible format
        updated_at: new Date().toISOString()
      })

      console.log(`✅ Archived conversation ${sessionId} to Supabase (${context.conversationHistory.length} messages, ${context.metadata.modalitiesUsed.join(', ')})`)
      
      // Audit log the archival
      if (SECURITY_CONFIG.ENABLE_AUDIT_LOGGING) {
        await auditLog.logContextArchived(
          sessionId,
          context.conversationHistory.length,
          context.metadata.modalitiesUsed
        )
      }
    } catch (err) {
      console.error('❌ Failed to archive conversation:', err)
      throw err // This is critical - we want to know if archival fails
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    // Clear from memory
    this.activeContexts.delete(sessionId)
    
    // Clear from Redis cache
    try {
      await vercelCache.delete('multimodal', sessionId)
      console.log(`✅ Cleared context from Redis: ${sessionId}`)
    } catch (err) {
      console.error('Failed to clear Redis cache:', err)
      // Non-fatal
    }
  }

  // Get all active sessions (for monitoring)
  getActiveSessions(): string[] {
    return Array.from(this.activeContexts.keys())
  }
}

// Export singleton instance
export const multimodalContextManager = new MultimodalContextManager()

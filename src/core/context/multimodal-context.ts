import { ContextStorage } from './context-storage'
import { MultimodalContext, ConversationEntry, VisualEntry, LeadContext, UploadEntry, AudioEntry, ConversationTurn } from './context-types'
import { vercelCache } from '@/lib/vercel-cache'
import { CONTEXT_CONFIG, SECURITY_CONFIG, GEMINI_CONFIG } from '@/config/constants'
import { walLog } from './write-ahead-log'
import { summarizeConversationWindow, shouldSummarize, extractSummaries } from './context-summarizer'
import { detectPII, shouldRedact, redactPII } from '@/core/security/pii-detector'
import { auditLog } from '@/core/security/audit-logger'
import {
  extractEntities,
  extractTopics,
  analyzeSentiment,
  calculateComplexity,
  calculateBusinessValue,
  calculatePriority,
  mergeEntities,
  mergeTopics,
  type ExtractedEntity,
  type ExtractedTopic,
  type Sentiment,
  type Priority,
  type Complexity,
  type BusinessValue
} from './context-intelligence'
import { embedTexts } from '@/core/embeddings/gemini'
import { queryTopK, upsertEmbeddings } from '@/core/embeddings/query'

const WAL_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    if (WAL_ENABLED) {
      // Log to WAL first (critical path for data reliability)
      await walLog.logOperation(sessionId, 'add_text', entry)
    }

    context.conversationHistory.push(entry)
    context.metadata.lastUpdated = entry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'text'])

    // Estimate tokens (rough approximation)
    context.metadata.totalTokens += Math.ceil(processedContent.length / 4)

    // Generate and store embedding for semantic search (if enabled)
    if (process.env.EMBEDDINGS_ENABLED === 'true' && processedContent.length > 20) {
      // Batch embedding generation (async, non-blocking)
      embedTexts([processedContent], 1536)
        .then(async (vectors) => {
          if (vectors && vectors.length > 0 && vectors[0]) {
            try {
              await upsertEmbeddings(sessionId, 'conversation', [processedContent], [vectors[0]])
              console.log(`✅ Embedding stored for conversation entry: ${entry.id.substring(0, 8)}...`)
            } catch (embedError) {
              console.warn('Failed to store embedding (non-fatal):', embedError)
            }
          }
        })
        .catch((embedError) => {
          // Non-fatal - embedding generation failures shouldn't block message saving
          console.warn('Embedding generation failed (non-fatal):', embedError)
        })
    }

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

    // Generate and store embedding for semantic search (if enabled)
    if (process.env.EMBEDDINGS_ENABLED === 'true' && transcription.length > 20) {
      // Batch embedding generation (async, non-blocking)
      embedTexts([transcription], 1536)
        .then(async (vectors) => {
          if (vectors && vectors.length > 0 && vectors[0]) {
            try {
              await upsertEmbeddings(sessionId, 'conversation', [transcription], [vectors[0]])
              console.log(`✅ Embedding stored for voice transcript: ${convEntry.id.substring(0, 8)}...`)
            } catch (embedError) {
              console.warn('Failed to store embedding (non-fatal):', embedError)
            }
          }
        })
        .catch((embedError) => {
          console.warn('Embedding generation failed (non-fatal):', embedError)
        })
    }

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

    if (WAL_ENABLED) {
      // Log to WAL (critical for visual analyses)
      await walLog.logOperation(sessionId, 'add_visual', visualEntry)
    }

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

    if (WAL_ENABLED) {
      // Log to WAL (critical for file uploads)
      await walLog.logOperation(sessionId, 'add_upload', uploadEntry)
    }

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

      // 🔄 Non-blocking WAL logging to prevent voice pipeline freeze
      if (isFinal && WAL_ENABLED) {
        // Fire-and-forget pattern (no await)
        walLog.logOperation(sessionId, 'add_voice', audioEntry)
          .then(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🪵 WAL logged voice entry for session ${sessionId}`)
            }
          })
          .catch((err) => {
            console.warn('⚠️ WAL logging failed (non-critical):', err)
          })
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

  /**
   * Get semantically relevant context from past conversations using vector search
   * @param sessionId - Session ID
   * @param query - Search query (current message or question)
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Array of relevant conversation entries with similarity scores
   */
  async getSemanticContext(sessionId: string, query: string, limit: number = 5): Promise<Array<ConversationEntry & { similarity?: number }>> {
    // Check if embeddings are enabled
    if (process.env.EMBEDDINGS_ENABLED !== 'true') {
      return []
    }

    try {
      // Generate embedding for the query
      const queryVectors = await embedTexts([query], 1536)
      if (!queryVectors || queryVectors.length === 0 || !queryVectors[0]) {
        return []
      }

      // Search for similar conversations
      const results = await queryTopK(sessionId, queryVectors[0], limit)
      if (!results || results.length === 0) {
        return []
      }

      // Map results to conversation entries
      // Handle both new format (similarity) and old format (distance) for backward compatibility
      const semanticEntries: Array<ConversationEntry & { similarity?: number }> = results.map((result: any) => {
        // Convert distance to similarity if needed (backward compatibility)
        // similarity = 1 - distance (for cosine similarity, distance 0 = similarity 1)
        let similarity: number | undefined = result.similarity
        if (similarity === undefined && typeof result.distance === 'number') {
          similarity = 1 - result.distance
          console.warn(`⚠️ [Embeddings] RPC returned 'distance' instead of 'similarity'. Converted: ${result.distance} → ${similarity}`)
        }
        
        // Default values for missing fields
        const kind = result.kind || 'conversation'
        const createdAt = result.created_at || new Date().toISOString()
        
        if (!result.kind) {
          console.warn(`⚠️ [Embeddings] Missing 'kind' field in result, defaulting to 'conversation'`)
        }
        if (!result.created_at) {
          console.warn(`⚠️ [Embeddings] Missing 'created_at' field in result, using current timestamp`)
        }
        
        return {
          id: result.id || crypto.randomUUID(),
          timestamp: createdAt,
          modality: 'text',
          content: result.text || '',
          metadata: {
            similarity,
            kind,
            semantic: true // Flag to indicate this came from semantic search
          },
          similarity
        }
      })

      return semanticEntries
    } catch (error) {
      console.warn('Semantic context retrieval failed (non-fatal):', error)
      // Return empty array on error - semantic search is enhancement, not critical
      return []
    }
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
  async prepareChatContext(sessionId: string, includeVisual: boolean = true, includeAudio: boolean = false, query?: string): Promise<{
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

    // Get semantically relevant context if query provided and embeddings enabled
    let semanticContext: Array<ConversationEntry & { similarity?: number }> = []
    if (query && process.env.EMBEDDINGS_ENABLED === 'true') {
      try {
        semanticContext = await this.getSemanticContext(sessionId, query, 5)
      } catch (error) {
        console.warn('Failed to retrieve semantic context (non-fatal):', error)
      }
    }

    // Build system prompt with multimodal context
    let systemPrompt = GEMINI_CONFIG.SYSTEM_PROMPT

    // Add semantically relevant context if available
    if (semanticContext.length > 0) {
      systemPrompt += "\n\nSEMANTICALLY RELEVANT PAST CONTEXT:\n"
      semanticContext.forEach((entry, i) => {
        const similarity = entry.similarity ? ` (similarity: ${(entry.similarity * 100).toFixed(1)}%)` : ''
        systemPrompt += `${i + 1}. ${entry.content.substring(0, 300)}${entry.content.length > 300 ? '...' : ''}${similarity}\n`
      })
    }

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

  /**
   * Extract entities from conversation history
   * Extracted from AdvancedContextManager - preserves entity extraction capability
   */
  async extractEntitiesFromContext(sessionId: string): Promise<ExtractedEntity[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    const allContent = context.conversationHistory
      .map(entry => entry.content)
      .join(' ')

    const entities = extractEntities(allContent)

    // Merge duplicates
    return mergeEntities(entities)
  }

  /**
   * Extract topics from conversation history with categorization
   * Enhanced version from AdvancedContextManager - better than simple regex
   */
  async extractTopicsFromContext(sessionId: string): Promise<ExtractedTopic[]> {
    const context = await this.getContext(sessionId)
    if (!context) return []

    const allContent = context.conversationHistory
      .map(entry => entry.content)
      .join(' ')

    const topics = extractTopics(allContent)

    // Merge duplicates
    return mergeTopics(topics)
  }

  /**
   * Analyze sentiment of conversation
   * Extracted from AdvancedContextManager
   */
  async analyzeConversationSentiment(sessionId: string): Promise<Sentiment> {
    const context = await this.getContext(sessionId)
    if (!context || context.conversationHistory.length === 0) return 'neutral'

    // Filter for user messages (where speaker is 'user' or not set, indicating user input)
    const userMessages = context.conversationHistory.filter(entry => {
      const speaker = entry.metadata.speaker
      return !speaker || speaker === 'user'
    })

    if (userMessages.length === 0) return 'neutral'

    const allContent = userMessages
      .map(entry => entry.content)
      .join(' ')

    return analyzeSentiment(allContent)
  }

  /**
   * Calculate conversation complexity, business value, and priority
   * Extracted from AdvancedContextManager
   */
  async analyzeConversationMetrics(sessionId: string): Promise<{
    complexity: Complexity
    businessValue: BusinessValue
    priority: Priority
    entityCount: number
    topicCount: number
    avgMessageLength: number
  }> {
    const context = await this.getContext(sessionId)
    if (!context) {
      return {
        complexity: 'simple',
        businessValue: 'low',
        priority: 'low',
        entityCount: 0,
        topicCount: 0,
        avgMessageLength: 0
      }
    }

    const entities = await this.extractEntitiesFromContext(sessionId)
    const topics = await this.extractTopicsFromContext(sessionId)
    const entityCount = entities.length
    const topicCount = topics.length

    const avgMessageLength = context.conversationHistory.length > 0
      ? context.conversationHistory.reduce((sum, entry) => sum + entry.content.length, 0) / context.conversationHistory.length
      : 0

    const complexity = calculateComplexity(entityCount, topicCount, avgMessageLength)

    const businessEntities = entities.filter(e => e.type === 'organization' || e.type === 'email').length
    const businessTopics = topics.filter(t => t.category === 'business').length
    const businessValue = calculateBusinessValue(businessEntities, businessTopics)

    const priority = calculatePriority(businessValue, complexity)

    return {
      complexity,
      businessValue,
      priority,
      entityCount,
      topicCount,
      avgMessageLength
    }
  }

  /**
   * Get conversation summary with intelligence metadata
   * Enhanced version that includes entities, topics, sentiment, and metrics
   */
  async getIntelligentContextSummary(sessionId: string): Promise<string | null> {
    const context = await this.getContext(sessionId)
    if (!context) return null

    const [entities, topics, sentiment, metrics] = await Promise.all([
      this.extractEntitiesFromContext(sessionId),
      this.extractTopicsFromContext(sessionId),
      this.analyzeConversationSentiment(sessionId),
      this.analyzeConversationMetrics(sessionId)
    ])

    const entitySummary = entities.length > 0
      ? `Discussed ${entities.length} entities including: ${entities.slice(0, 3).map(e => e.value).join(', ')}`
      : 'No specific entities discussed'

    const topicSummary = topics.length > 0
      ? `Covered ${topics.length} topics: ${topics.slice(0, 3).map(t => t.name).join(', ')}`
      : 'General conversation'

    const metricsSummary = `Priority: ${metrics.priority}, Complexity: ${metrics.complexity}, Business Value: ${metrics.businessValue}, Sentiment: ${sentiment}`

    return `${entitySummary}. ${topicSummary}. ${metricsSummary}.`
  }

  /**
   * Merge multiple session contexts (useful for cross-session analysis)
   * Extracted from AdvancedContextManager
   */
  async mergeSessionContexts(sessionIds: string[]): Promise<{
    mergedEntities: ExtractedEntity[]
    mergedTopics: ExtractedTopic[]
    combinedSentiment: Sentiment
    combinedPriority: Priority
    totalMessages: number
  } | null> {
    const contexts = await Promise.all(
      sessionIds.map(id => this.getContext(id))
    )

    const validContexts = contexts.filter((ctx): ctx is MultimodalContext => ctx !== null)
    if (validContexts.length === 0) return null

    const allEntities = await Promise.all(
      validContexts.map(ctx => this.extractEntitiesFromContext(ctx.sessionId))
    )
    const mergedEntities = mergeEntities(allEntities.flat())

    const allTopics = await Promise.all(
      validContexts.map(ctx => this.extractTopicsFromContext(ctx.sessionId))
    )
    const mergedTopics = mergeTopics(allTopics.flat())

    const sentiments = await Promise.all(
      validContexts.map(ctx => this.analyzeConversationSentiment(ctx.sessionId))
    )
    const combinedSentiment: Sentiment = sentiments.filter(s => s === 'positive').length > sentiments.filter(s => s === 'negative').length
      ? 'positive'
      : sentiments.filter(s => s === 'negative').length > sentiments.filter(s => s === 'positive').length
      ? 'negative'
      : 'neutral'

    const priorities = await Promise.all(
      validContexts.map(ctx => this.analyzeConversationMetrics(ctx.sessionId))
    )
    const priorityScores = { low: 1, medium: 2, high: 3 }
    const avgPriorityScore = priorities.reduce((sum, m) => sum + priorityScores[m.priority], 0) / priorities.length
    const combinedPriority: Priority = avgPriorityScore >= 2.5 ? 'high' : avgPriorityScore >= 1.5 ? 'medium' : 'low'

    const totalMessages = validContexts.reduce((sum, ctx) => sum + ctx.conversationHistory.length, 0)

    return {
      mergedEntities,
      mergedTopics,
      combinedSentiment,
      combinedPriority,
      totalMessages
    }
  }
}

// Export singleton instance
export const multimodalContextManager = new MultimodalContextManager()

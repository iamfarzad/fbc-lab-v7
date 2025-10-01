import { ContextStorage } from './context-storage'
import { MultimodalContext, ConversationEntry, VisualEntry, LeadContext } from './context-types'

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

// If you have an AudioEntry type imported, don't change it globally.
// Create a local guard to accept only known keys.
type AudioEntryLike = {
  mimeType?: unknown;
  data?: unknown;
  durationMs?: unknown;
  // some code elsewhere might *read* metadata/id — guard those reads.
  metadata?: unknown;
  id?: unknown;
};

export interface AudioEntry {
  mimeType: string;
  data: string;          // base64 or similar
  durationMs?: number;   // optional by spec
}

// runtime guard
function isAudioEntry(x: unknown): x is AudioEntry {
  const o = x as AudioEntryLike;
  return !!o && typeof o === 'object'
    && typeof o.mimeType === 'string'
    && typeof o.data === 'string'
    && (o.durationMs === undefined || typeof o.durationMs === 'number');
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
    visualContext: [],
    audioContext: [],
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
      visualContext: [],
      audioContext: [],
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
    visualContext: obj.visualContext || [],
    audioContext: asAudioEntries(obj.audioContext || []),
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
      visualContext: [],
      audioContext: [],
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

    const entry: ConversationEntry = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      modality: 'text',
      content,
      metadata: metadata ?? {}
    }

    context.conversationHistory.push(entry)
    context.metadata.lastUpdated = entry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'text'])

    // Estimate tokens (rough approximation)
    context.metadata.totalTokens += Math.ceil(content.length / 4)

    await this.saveContext(sessionId, context)
    // Action logged
  }

  async addVoiceMessage(sessionId: string, transcription: string, duration: number, metadata?: { sampleRate?: number; format?: string; confidence?: number }): Promise<void> {
    const context = await this.getOrCreateContext(sessionId)

    // Add to conversation history
    const convEntry: ConversationEntry = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      modality: 'audio', // not 'voice'
      content: transcription,
      metadata: { duration, transcription, ...(metadata ?? {}) }
    }

    context.conversationHistory.push(convEntry)

    // Add to audio context
    const audioEntry: AudioEntry = {
      mimeType: metadata?.format ?? 'audio/wav',
      data: transcription, // store transcription as data for now
      durationMs: duration
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

    context.visualContext.push(visualEntry)
    context.metadata.lastUpdated = convEntry.timestamp
    context.metadata.modalitiesUsed = coerceModalities([...context.metadata.modalitiesUsed, 'image']) // not 'vision'

    // Estimate tokens for analysis
    context.metadata.totalTokens += Math.ceil(analysis.length / 4)

    await this.saveContext(sessionId, context)
    // Action logged
  }

  async getContext(sessionId: string): Promise<MultimodalContext | null> {
    // Check memory first
    if (this.activeContexts.has(sessionId)) {
      return this.activeContexts.get(sessionId)!
    }

    // Check database
    const stored = await this.contextStorage.get(sessionId)
    if (stored?.multimodal_context) {
      const context = ensureContext(stored.multimodal_context)
      this.activeContexts.set(sessionId, context)
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
    summary: {
      totalMessages: number
      modalitiesUsed: Modality[]
      lastActivity: string
      recentVisualAnalyses: number
      recentAudioEntries: number
    }
  }> {
    const context = await this.getOrCreateContext(sessionId)
    if (!context) {
      return {
        conversationHistory: [],
        visualContext: [],
        audioContext: [],
        summary: {
          totalMessages: 0,
          modalitiesUsed: [],
          lastActivity: '',
          recentVisualAnalyses: 0,
          recentAudioEntries: 0
        }
      }
    }

    const recentVisual = includeRecentVisual ? context.visualContext.slice(-3) : []
    const recentAudio = includeRecentAudio ? asAudioEntries(context.audioContext).slice(-3) : []

    return {
      conversationHistory: context.conversationHistory.slice(-10), // Last 10 messages
      visualContext: recentVisual,
      audioContext: recentAudio,
      summary: {
        totalMessages: context.conversationHistory.length,
        modalitiesUsed: context.metadata.modalitiesUsed,
        lastActivity: context.metadata.lastUpdated,
        recentVisualAnalyses: recentVisual.length,
        recentAudioEntries: recentAudio.length
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
    }
  }> {
    const context = await this.getConversationContext(sessionId, includeVisual, includeAudio)

    // Build system prompt with multimodal context
    let systemPrompt = "You are F.B/c AI, a helpful business assistant with multimodal capabilities."

    if (context.summary.recentVisualAnalyses > 0 || context.summary.recentAudioEntries > 0) {
      systemPrompt += "\n\nYou have access to recent multimodal context from this conversation:"
    }

    const multimodalContext = {
      hasRecentImages: context.visualContext.length > 0,
      hasRecentAudio: context.audioContext.length > 0,
      recentAnalyses: context.visualContext.map(v => v.analysis).slice(-2) // Last 2 analyses
    }

    if (multimodalContext.hasRecentImages) {
      systemPrompt += `\n\nRecent visual analyses (${context.visualContext.length} items):`
      multimodalContext.recentAnalyses.forEach((analysis, i) => {
        systemPrompt += `\n${i + 1}. ${analysis.substring(0, 200)}${analysis.length > 200 ? '...' : ''}`
      })
    }

    return {
      systemPrompt,
      contextData: context,
      multimodalContext
    }
  }

  private async saveContext(sessionId: string, context: MultimodalContext): Promise<void> {
    // Update memory only (like FB-c_labV2 approach)
    this.activeContexts.set(sessionId, context)
    // Action logged`)
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

  async clearSession(sessionId: string): Promise<void> {
    // Clear from memory only (like FB-c_labV2 approach)
    this.activeContexts.delete(sessionId)
    // Action logged`)
  }

  // Get all active sessions (for monitoring)
  getActiveSessions(): string[] {
    return Array.from(this.activeContexts.keys())
  }
}

// Export singleton instance
export const multimodalContextManager = new MultimodalContextManager()

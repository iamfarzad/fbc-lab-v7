/** Basic lead/person/company context used across chat + intelligence layers. */
export interface LeadContext {
  email: string;
  name: string;
  company: string;
}

export interface CompanyContext {
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  summary?: string;
  website?: string;
  linkedin?: string;
}

export interface PersonContext {
  fullName: string;
  role?: string;
  seniority?: string;
  profileUrl?: string | null;
  company?: string;
}

/** Multimodal data captured during a session. */
export interface MultimodalData {
  imageData?: string;
  audioData?: Uint8Array | string;
  /** Added to fix unified-provider video length checks. */
  videoData?: Uint8Array | string;
}

/** Conversation entries: text modality with always-present metadata object. */
export interface ConversationEntry {
  id: string;
  timestamp: string; // ISO
  modality: 'text' | 'image' | 'audio' | 'video';
  content: string;
  metadata: {
    duration?: number;
    imageSize?: number;
    confidence?: number;
    transcription?: string;
  };
}

/** Visual analysis entries produced by image/video tools. */
export interface VisualEntry {
  id: string;
  timestamp: string; // ISO
  type: 'webcam' | 'screen' | 'upload';
  analysis: string;
  /** Required string (call-sites can pass empty string). */
  imageData: string;
  metadata: {
    size: number;                    // required number
    format: 'webcam' | 'screen' | 'upload';
    confidence: number;              // required number
  };
}

/** In-memory multimodal context stored per session. */
export interface MultimodalContext {
  sessionId: string;
  conversationHistory: ConversationEntry[];
  visualContext: VisualEntry[];
  audioContext: unknown[]; // refine later
  /** Required; callers can pass an empty object with empty strings. */
  leadContext: LeadContext;
  metadata: {
    createdAt: string;   // ISO
    lastUpdated: string; // ISO
    modalitiesUsed: Array<'text' | 'image' | 'audio' | 'video'>;
    totalTokens: number;
  };
}

/**
 * Snapshot passed to tool selection / intent logic.
 * NOTE: `role` is optional to avoid `string | undefined` → `string` errors.
 */
export interface ContextSnapshot {
  lead: { email: string; name: string };
  capabilities: string[];
  company?: CompanyContext;
  person?: PersonContext;
  role?: string;
}

/** Database conversation context interface */
export interface DatabaseConversationContext {
  // New optional fields used by analyze-image route:
  preferences?: Record<string, unknown>;
  webcamAnalysisCount?: number;
  lastWebcamAnalysis?: string; // ISO string or Date
}
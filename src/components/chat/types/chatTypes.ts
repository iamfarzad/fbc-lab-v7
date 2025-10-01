import { EnhancedChatMessage } from "@/types/chat-enhanced";

// Core chat message interface
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image' | 'screen';
  metadata?: {
    fileName?: string;
    fileType?: string;
  };
}

// Chat state management
export interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  isListening: boolean;
  showSettings: boolean;
}

// Component props interfaces
export interface ChatInterfaceProps {
  id?: string | null;
}

// Terms acceptance state
export interface TermsAcceptanceState {
  agreed: boolean;
  email: string;
  hasAcceptedTerms: boolean;
}

// Audio processing state
export interface AudioState {
  isListening: boolean;
  isVoiceSupported: boolean;
  voice: any; // WebSocket voice hook return type
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  processorRef: React.MutableRefObject<ScriptProcessorNode | AudioWorkletNode | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
}

// Intelligence and AI state
export interface IntelligenceState {
  contextReady: boolean;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
  suggestions: string[];
  isLoading: boolean;
}

// Enhanced messages state
export interface EnhancedMessagesState {
  messages: EnhancedChatMessage[];
  isMeetingOpen: boolean;
}


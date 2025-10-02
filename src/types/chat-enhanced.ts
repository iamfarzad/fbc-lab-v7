// Enhanced TypeScript types for chat functionality with AI elements integration
import type { ComponentType } from 'react';

export interface EnhancedChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image' | 'screen' | 'code' | 'reasoning';
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    duration?: number; // For voice messages
    sources?: Array<{
      id: string;
      title: string;
      url: string;
      snippet?: string;
      relevanceScore?: number;
    }>;
    reasoning?: string;
    reasoningDuration?: number;
    reasoningSteps?: Array<{
      step: number;
      content: string;
      duration?: number;
    }>;
    codeBlocks?: Array<{
      id: string;
      code: string;
      language: string;
      showLineNumbers?: boolean;
      title?: string;
      description?: string;
    }>;
    actions?: Array<{
      id: string;
      label: string;
      icon?: string | ComponentType<{ className?: string }>;
      tooltip?: string;
      variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      onClick: () => void;
      disabled?: boolean;
    }>;
    artifacts?: Array<{
      id: string;
      type: string;
      content: string;
      title?: string;
      description?: string;
      metadata?: Record<string, any>;
    }>;
    reactions?: Array<{
      emoji: string;
      count: number;
      users: string[];
    }>;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url: string;
      thumbnail?: string;
      analysis?: string;
      summary?: string;
      pages?: number;
      uploadedAt?: string;
    }>;
    researchSummary?: {
      query?: string;
      combinedAnswer?: string;
      urlsUsed?: string[];
      citationCount?: number;
      searchGroundingUsed?: number;
      urlContextUsed?: number;
      error?: string;
      [key: string]: any;
    };
    toolInvocations?: Array<{
      toolCallId?: string;
      name?: string;
      arguments?: Record<string, any>;
      result?: unknown;
      state?: string;
      [key: string]: any;
    }>;
    annotations?: Array<Record<string, any>>;
    // Added missing fields
    chainOfThought?: {
      steps?: Array<{
        label: string;
        description: string;
        content: string;
        status: 'completed' | string;
        icon: string;
      }>;
    };
    tools?: Array<{
      name: string;
      type: string;
      state: string;
      input?: Record<string, any>;
      output?: any;
      error?: string;
    }>;
    contextUsage?: {
      usedTokens: number;
      maxTokens: number;
      usage: number;
      modelId: string;
    };
    images?: Array<{
      base64: string;
      mediaType: string;
      alt: string;
    }>;
    inlineCitations?: Array<{
      url: string;
      title: string;
      text: string;
    }>;
    tasks?: Array<{
      title: string;
      description?: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      files?: Array<{
        name: string;
      }>;
    }>;
    webPreview?: {
      url: string;
      title: string;
      description?: string;
    };
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'failed';
  error?: string;
  isStreaming?: boolean;
  parentId?: string; // For threaded conversations
  branchId?: string; // For conversation branching
}

export interface AIElementConfig {
  showReasoning: boolean;
  showSources: boolean;
  showActions: boolean;
  showCodeBlocks: boolean;
  showArtifacts: boolean;
  enableInlineCitations: boolean;
  enableWebPreviews: boolean;
  enableTaskTracking: boolean;
  enableReactions: boolean;
  enableReadReceipts: boolean;
  enableTypingIndicators: boolean;
  enableMessageThreading: boolean;
  enableConversationBranching: boolean;
  maxCodeBlockHeight?: number;
  maxReasoningLength?: number;
  theme?: 'light' | 'dark' | 'auto';
}

export interface MessageAction {
  id: string;
  type: 'copy' | 'edit' | 'delete' | 'regenerate' | 'retry' | 'share' | 'download' | 'custom';
  label: string;
  icon?: string | ComponentType<{ className?: string }>;
  tooltip?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  relevanceScore?: number;
  type?: 'web' | 'document' | 'database' | 'api' | 'local';
  metadata?: Record<string, any>;
}

export interface CodeBlock {
  id: string;
  code: string;
  language: string;
  showLineNumbers?: boolean;
  title?: string;
  description?: string;
  isExecutable?: boolean;
  canCopy?: boolean;
  canDownload?: boolean;
  theme?: string;
}

export interface ReasoningStep {
  step: number;
  content: string;
  duration?: number;
  confidence?: number;
  type?: 'analysis' | 'planning' | 'execution' | 'verification';
}

export interface Artifact {
  id: string;
  type: 'file' | 'chart' | 'table' | 'diagram' | 'custom';
  content: string | object;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  downloadUrl?: string;
  previewUrl?: string;
}

export interface ChatContext {
  messages: EnhancedChatMessage[];
  currentMessage?: string;
  isTyping: boolean;
  hasError: boolean;
  selectedModel?: string;
  availableModels: string[];
  settings: AIElementConfig;
  userPreferences: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    language: string;
    timezone: string;
  };
}

export interface ChatState {
  messages: EnhancedChatMessage[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
  typingUsers: string[];
  settings: AIElementConfig;
  context: ChatContext;
}

export interface AIBaseElement {
  id: string;
  type: string;
  isVisible: boolean;
  position: 'inline' | 'block' | 'overlay';
  render: (props: any) => React.ReactElement;
  canToggle?: boolean;
  isExpanded?: boolean;
}

export interface ExtractedElements {
  reasoning?: string;
  sources?: Source[];
  codeBlocks?: CodeBlock[];
  actions?: MessageAction[];
  artifacts?: Artifact[];
  citations?: Array<{
    id: string;
    text: string;
    source: Source;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    description?: string;
  }>;
  tools?: Array<{
    id: string;
    name: string;
    parameters: Record<string, any>;
    result?: any;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }>;
}

export interface EnhancedInputData {
  text: string;
  attachments?: Array<{
    file: File;
    id: string;
    type: string;
    size: number;
  }>;
  voiceRecording?: {
    audioBlob: Blob;
    duration: number;
    transcript?: string;
  };
  screenShare?: {
    stream: MediaStream;
    isActive: boolean;
  };
  cameraCapture?: {
    imageBlob: Blob;
    width: number;
    height: number;
  };
}

export interface Suggestion {
  id: string;
  text: string;
  type: 'text' | 'command' | 'action' | 'template';
  icon?: string | ComponentType<{ className?: string }>;
  description?: string;
  category?: string;
  priority?: number;
  context?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  userReacted?: boolean; // For current user
}

export interface ReadReceipt {
  userId: string;
  userName: string;
  timestamp: Date;
  messageId: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

// Type guards
export function isEnhancedChatMessage(obj: any): obj is EnhancedChatMessage {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.content === 'string' && 
         (obj.role === 'user' || obj.role === 'assistant') &&
         obj.timestamp instanceof Date;
}

export function isSource(obj: any): obj is Source {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.title === 'string' && 
         typeof obj.url === 'string';
}

export function isCodeBlock(obj: any): obj is CodeBlock {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.code === 'string' && 
         typeof obj.language === 'string';
}

export function isArtifact(obj: any): obj is Artifact {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.type === 'string';
}

// Utility types
export type MessageStatus = EnhancedChatMessage['status'];
export type MessageRole = EnhancedChatMessage['role'];
export type MessageType = EnhancedChatMessage['type'];
export type ActionVariant = MessageAction['variant'];
export type SourceType = Source['type'];
export type ArtifactType = Artifact['type'];
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SuggestionType = Suggestion['type'];
export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';

// Enhanced TypeScript types for chat functionality with AI elements integration
// NOTE: Per .cursorrules, canonical types live in '@/types/core'.
// This file defines UI-only wrappers and re-exports core types to avoid duplication.
import type { ComponentType } from 'react';
import type { Message, Source, CodeBlock, Artifact, MessageAction } from '@/types/core';

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

// Re-export canonical content-related types from core to prevent duplication
export type { MessageAction, Source, CodeBlock, ReasoningStep, Artifact, MessageReaction } from '@/types/core';

// UI-only MessageAction extension (adds runtime callback typing and icon component support)
export interface UIMessageAction extends Omit<import('@/types/core').MessageAction, 'icon' | 'onClick'> {
  icon?: string | ComponentType<{ className?: string }>;
  onClick: () => void | Promise<void>;
}

// UI-only chat context for component state (distinct from core ChatContext)
export interface UIChatContext {
  messages: Message[];
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
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
  typingUsers: string[];
  settings: AIElementConfig;
  context: UIChatContext;
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
  sources?: import('@/types/core').Source[];
  codeBlocks?: import('@/types/core').CodeBlock[];
  actions?: import('@/types/core').MessageAction[];
  artifacts?: import('@/types/core').Artifact[];
  citations?: Array<{
    id: string;
    text: string;
    source: import('@/types/core').Source;
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
export type ActionVariant = MessageAction['variant'];
export type SourceType = Source['type'];
export type ArtifactType = Artifact['type'];
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SuggestionType = Suggestion['type'];
export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';

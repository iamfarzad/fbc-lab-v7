import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";

export interface ResearchSummary {
  messageId: string;
  timestamp: Date;
  query?: string;
  combinedAnswer?: string;
  urlsUsed?: string[];
  citationCount?: number;
  searchGroundingUsed?: number;
  urlContextUsed?: number;
  error?: string;
}

export interface ExportSummaryRequest {
  sessionId: string;
  artifacts?: Array<Record<string, any>>;
  research?: ResearchSummary[];
}

export function useChatMessages() {
  const [inputValue, setInputValue] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());

  // Use unified chat hook with store integration
  const unifiedChat = useUnifiedChat({
    sessionId,
    mode: 'standard',
    context: {
      sessionId,
      enhancedResearch: true
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    }
  });

  // Convert unified messages to chat messages
  const messages = useMemo<ChatMessage[]>(() =>
    unifiedChat.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role === 'system' ? 'assistant' : msg.role,
      timestamp: msg.timestamp,
      type: (msg.type as ChatMessage['type']) || 'text',
      metadata: msg.metadata
    })),
    [unifiedChat.messages]
  );

  const enhancedMessages = useMemo<EnhancedChatMessage[]>(() =>
    unifiedChat.messages.map(msg => {
      const timestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);

      const researchMetadata = (msg.metadata?.research ?? null) as Record<string, any> | null;
      const toolInvocations = Array.isArray(msg.metadata?.toolInvocations)
        ? (msg.metadata!.toolInvocations as Array<Record<string, any>>)
        : undefined;
      const annotations = Array.isArray(msg.metadata?.annotations)
        ? (msg.metadata!.annotations as Array<Record<string, any>>)
        : undefined;

      const mappedSources = Array.isArray(researchMetadata?.urlsUsed)
        ? researchMetadata!.urlsUsed.map((url: string, index: number) => ({
            id: `${msg.id}-source-${index}`,
            title: url.replace(/^https?:\/\//, ''),
            url
          }))
        : undefined;

      const metadata: EnhancedChatMessage['metadata'] | undefined = researchMetadata || toolInvocations || annotations
        ? {
            sources: mappedSources,
            researchSummary: researchMetadata || undefined,
            toolInvocations,
            annotations
          }
        : undefined;

      const status = msg.metadata?.error
        ? 'error'
        : msg.metadata?.isStreaming && !msg.metadata?.isComplete
          ? 'sending'
          : msg.metadata?.isComplete
            ? 'delivered'
            : 'sent';

      return {
        id: msg.id,
        content: msg.content,
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp,
        type: msg.type === 'tool' ? 'code' : 'text',
        metadata,
        status,
        error: msg.metadata?.error ? msg.metadata?.errorMessage || 'An error occurred' : undefined,
        isStreaming: Boolean(msg.metadata?.isStreaming && !msg.metadata?.isComplete)
      };
    }),
    [unifiedChat.messages]
  );

  const researchSummaries = useMemo<ResearchSummary[]>(() =>
    unifiedChat.messages
      .filter(message => message.metadata?.research)
      .map(message => {
        const research = message.metadata?.research as Record<string, any>;
        const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
        return {
          messageId: message.id,
          timestamp,
          query: research?.query,
          combinedAnswer: research?.combinedAnswer,
          urlsUsed: Array.isArray(research?.urlsUsed) ? research.urlsUsed : undefined,
          citationCount: typeof research?.citationCount === 'number' ? research.citationCount : undefined,
          searchGroundingUsed: typeof research?.searchGroundingUsed === 'number' ? research.searchGroundingUsed : undefined,
          urlContextUsed: typeof research?.urlContextUsed === 'number' ? research.urlContextUsed : undefined,
          error: typeof research?.error === 'string' ? research.error : undefined
        } satisfies ResearchSummary;
      }),
    [unifiedChat.messages]
  );

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || unifiedChat.isLoading) return;

    setInputValue('');
    await unifiedChat.sendMessage(content.trim());
  }, [unifiedChat]);

  // Handle PDF export
  const handleExportSummary = useCallback(async (request: ExportSummaryRequest | null | undefined) => {
    if (!request?.sessionId) return;
    try {
      const response = await fetch('/api/export-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fbc-ai-consultation-summary.pdf';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Summary exported successfully!');
      } else {
        toast.error('Export failed. Please try again.');
      }
    } catch (error) {
      toast.error('Export error. Check console.');
      console.error('PDF export error:', error);
    }
  }, []);

  return {
    messages,
    enhancedMessages,
    researchSummaries,
    isLoading: unifiedChat.isLoading || unifiedChat.isStreaming,
    inputValue,
    setInputValue,
    handleSendMessage,
    handleExportSummary,
    sessionId
  };
}



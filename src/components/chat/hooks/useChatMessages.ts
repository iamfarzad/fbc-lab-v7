import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import type { UnifiedContext } from "@/core/chat/unified-types";
import type { ConversationCategory } from "./useConversationFlow";
import { useConversationFlow } from "./useConversationFlow";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import type { PromptInputFile } from "@/components/ai-elements/interactive/prompt-input";
import type { AttachmentUploadResponse, ChatAttachment } from "@/types/attachments";
import { logConversationMilestone } from "@/lib/analytics/chat-flow";
import { detectSafetyCategory, logSafetyEvent } from "@/lib/analytics/safety";

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

type SendMessagePayload = string | {
  text?: string;
  attachments?: PromptInputFile[];
};

type SourceMetadata = {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  relevanceScore?: number;
  [key: string]: any;
};

export function useChatMessages(initialSessionId?: string) {
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(() => initialSessionId ?? crypto.randomUUID());
  const voiceAssistantMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialSessionId && initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
    }
  }, [initialSessionId, sessionId]);

  // Use unified chat hook with store integration
  const unifiedChat = useUnifiedChat({
    sessionId,
    mode: 'standard',
    context: {
      sessionId,
      enhancedResearch: false  // Smart triggers will override when needed
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

      // Extract AI elements metadata
      const reasoning = msg.metadata?.reasoning
      const chainOfThought = msg.metadata?.chainOfThought
      const contextUsage = msg.metadata?.contextUsage
      const codeBlocks = msg.metadata?.codeBlocks
      const aiSources = Array.isArray(msg.metadata?.sources)
        ? (msg.metadata!.sources as SourceMetadata[])
        : undefined
      const images = msg.metadata?.images
      const inlineCitations = msg.metadata?.inlineCitations
      const tasks = msg.metadata?.tasks
      const webPreview = msg.metadata?.webPreview
      const followUp =
        typeof msg.metadata?.followUp === 'string' && msg.metadata.followUp.trim().length > 0
          ? msg.metadata.followUp.trim()
          : undefined
      const attachments = Array.isArray(msg.metadata?.attachments)
        ? (msg.metadata!.attachments as ChatAttachment[])
        : undefined;

      const metadataPayload: Partial<NonNullable<EnhancedChatMessage['metadata']>> = {};

      const fallbackSources = (!aiSources && researchMetadata)
        ? (() => {
            if (Array.isArray(researchMetadata?.citations)) {
              const mapped = researchMetadata!.citations
                .map((citation: any, index: number) => {
                  const url = citation?.url || citation?.uri || '';
                  if (!url || typeof url !== 'string') return null;
                  const title = typeof citation?.title === 'string'
                    ? citation.title
                    : url.replace(/^https?:\/\//, '');
                  const snippet = typeof citation?.description === 'string'
                    ? citation.description
                    : undefined;
                  return {
                    id: citation?.id || `${msg.id}-source-${index}`,
                    title,
                    url,
                    snippet,
                    description: snippet,
                  };
                })
                .filter(Boolean) as SourceMetadata[];
              if (mapped.length > 0) return mapped;
            }
            if (Array.isArray(researchMetadata?.urlsUsed)) {
              const mapped = researchMetadata!.urlsUsed
                .map((url: string, index: number) => {
                  if (typeof url !== 'string' || url.length === 0) return null;
                  return {
                    id: `${msg.id}-source-${index}`,
                    title: url.replace(/^https?:\/\//, ''),
                    url,
                  };
                })
                .filter(Boolean) as SourceMetadata[];
              if (mapped.length > 0) return mapped;
            }
            return undefined;
          })()
        : undefined;

      const combinedSources = aiSources ?? fallbackSources;
      if (combinedSources) {
        metadataPayload.sources = combinedSources;
      }
      if (researchMetadata && typeof researchMetadata === 'object') {
        const researchSummary = {
          query: typeof researchMetadata.query === 'string' ? researchMetadata.query : undefined,
          combinedAnswer: typeof researchMetadata.combinedAnswer === 'string' ? researchMetadata.combinedAnswer : undefined,
          urlsUsed: Array.isArray(researchMetadata.urlsUsed) ? (researchMetadata.urlsUsed as string[]) : undefined,
          citationCount: typeof researchMetadata.citationCount === 'number' ? researchMetadata.citationCount : undefined,
          searchGroundingUsed: typeof researchMetadata.searchGroundingUsed === 'number' ? researchMetadata.searchGroundingUsed : undefined,
          urlContextUsed: typeof researchMetadata.urlContextUsed === 'number' ? researchMetadata.urlContextUsed : undefined,
          error: typeof researchMetadata.error === 'string' ? researchMetadata.error : undefined,
        };

        if (
          researchSummary.combinedAnswer ||
          researchSummary.urlsUsed?.length ||
          typeof researchSummary.citationCount === 'number' ||
          typeof researchSummary.searchGroundingUsed === 'number' ||
          typeof researchSummary.urlContextUsed === 'number' ||
          researchSummary.error
        ) {
          metadataPayload.researchSummary = researchSummary;
        }
      }
      if (toolInvocations) {
        metadataPayload.toolInvocations = toolInvocations;
      }
      if (annotations) {
        metadataPayload.annotations = annotations;
      }
      if (reasoning) {
        metadataPayload.reasoning = reasoning;
      }
      if (chainOfThought) {
        metadataPayload.chainOfThought = chainOfThought;
      }
      if (contextUsage) {
        metadataPayload.contextUsage = contextUsage;
      }
      if (codeBlocks) {
        metadataPayload.codeBlocks = codeBlocks;
      }
      if (images) {
        metadataPayload.images = images;
      }
      if (inlineCitations) {
        metadataPayload.inlineCitations = inlineCitations;
      }
      if (tasks) {
        metadataPayload.tasks = tasks;
      }
      if (webPreview) {
        metadataPayload.webPreview = webPreview;
      }
      if (followUp) {
        metadataPayload.followUp = followUp;
      }
      if (attachments && attachments.length > 0) {
        metadataPayload.attachments = attachments;
      }

      const metadata: EnhancedChatMessage['metadata'] | undefined =
        Object.keys(metadataPayload).length > 0 ? metadataPayload : undefined;

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

  const uploadAttachments = useCallback(async (files?: PromptInputFile[]): Promise<AttachmentUploadResponse> => {
    if (!files || files.length === 0) {
      return { ok: true, attachments: [] };
    }

    const formData = new FormData();
    formData.append('sessionId', sessionId);

    files.forEach((file) => {
      formData.append('files', file.file, file.filename ?? file.file.name);
    });

    const response = await fetch('/api/chat/attachments', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Attachment upload failed');
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const data = await response.json() as AttachmentUploadResponse;
    if (!data.ok) {
      throw new Error(data.error || 'Attachment upload failed');
    }

    return data;
  }, [sessionId]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (payload: SendMessagePayload) => {
    const normalized = typeof payload === 'string' ? { text: payload } : (payload ?? {});
    const text = normalized.text?.trim() ?? '';
    const attachments = normalized.attachments?.filter(Boolean) ?? [];

    if (!text && attachments.length === 0) return;
    if (unifiedChat.isLoading) return;

    let uploadResult: AttachmentUploadResponse | null = null;
    if (attachments.length > 0) {
      try {
        uploadResult = await uploadAttachments(attachments);
      } catch (error) {
        console.error('Attachment upload failed:', error);
        toast.error('Failed to upload attachments. Please try again.');
        throw error;
      }
    }

    const promptSegments: string[] = [];
    if (text) promptSegments.push(text);
    if (uploadResult?.prompt) promptSegments.push(uploadResult.prompt);

    const outgoingText = promptSegments.join('\n\n').trim() || 'Shared new attachments for analysis.';

    const existingAttachments: ChatAttachment[] = Array.isArray(unifiedChat.context.attachments)
      ? (unifiedChat.context.attachments as ChatAttachment[])
      : [];

    if (uploadResult?.attachments?.length) {
      unifiedChat.updateContext({
        attachments: [...existingAttachments, ...uploadResult.attachments]
      });
    }

    setInputValue('');

    await unifiedChat.sendMessage(outgoingText);
  }, [unifiedChat, uploadAttachments]);

  const updateChatContext = useCallback((context: Partial<UnifiedContext>) => {
    unifiedChat.updateContext(context);
  }, [unifiedChat.updateContext]);

  const conversationFlow = useConversationFlow(unifiedChat.messages);
  const loggedCategoriesRef = useRef<Set<ConversationCategory>>(new Set());
  const safetyLoggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    updateChatContext({
      sessionId,
      conversationFlow,
    });
  }, [conversationFlow, sessionId, updateChatContext]);

  useEffect(() => {
    if (!conversationFlow.coverageOrder.length) return;

    for (const insight of conversationFlow.coverageOrder) {
      if (loggedCategoriesRef.current.has(insight.category)) continue;
      loggedCategoriesRef.current.add(insight.category);

      const elapsedMs = insight.firstTimestamp && conversationFlow.firstUserTimestamp
        ? insight.firstTimestamp - conversationFlow.firstUserTimestamp
        : null;

      logConversationMilestone({
        sessionId,
        category: insight.category,
        firstTurnIndex: insight.firstTurnIndex,
        firstMessageId: insight.firstMessageId,
        firstTimestamp: insight.firstTimestamp,
        elapsedMs,
      });
    }
  }, [conversationFlow.coverageOrder, conversationFlow.firstUserTimestamp, sessionId]);

  useEffect(() => {
    const userMessages = unifiedChat.messages.filter((message) => message.role === 'user');
    if (userMessages.length === 0) return;

    const latest = userMessages[userMessages.length - 1];
    if (safetyLoggedRef.current.has(latest.id)) return;

    const category = detectSafetyCategory(latest.content.toLowerCase());
    if (!category) return;

    safetyLoggedRef.current.add(latest.id);
    logSafetyEvent({
      sessionId,
      category,
      messageId: latest.id,
      messageSnippet: latest.content.slice(0, 200),
      timestamp: Date.now(),
    });
  }, [sessionId, unifiedChat.messages]);

  const appendVoiceUserMessage = useCallback((text: string) => {
    const content = text.trim();
    if (!content) return;

    voiceAssistantMessageIdRef.current = null;
    unifiedChat.addMessage({
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'text',
      metadata: {
        source: 'voice',
        modality: 'audio',
        isComplete: true,
      },
    });

    // NOTE: Intent detection happens server-side when this message is sent to /api/chat/unified
    // The unified API route handles conversation flow analysis and intent detection
    console.log('🎤 Voice message added:', content.substring(0, 50) + '...')
  }, [unifiedChat, sessionId]);

  const appendVoiceAssistantChunk = useCallback((chunk: string) => {
    if (!chunk) return;

    const existingId = voiceAssistantMessageIdRef.current;
    if (!existingId) {
      const message = unifiedChat.addMessage({
        role: 'assistant',
        content: chunk,
        timestamp: new Date(),
        type: 'text',
        metadata: {
          source: 'voice',
          modality: 'audio',
          isStreaming: true,
        },
      });
      voiceAssistantMessageIdRef.current = message.id;
      return;
    }

    const nextMessages = unifiedChat.messages.map((message) => {
      if (message.id !== existingId) return message;
      return {
        ...message,
        content: `${message.content}${chunk}`,
        metadata: {
          ...message.metadata,
          source: 'voice',
          modality: 'audio',
          isStreaming: true,
        },
        timestamp: new Date(),
      };
    });

    unifiedChat.setMessages(nextMessages);
  }, [unifiedChat]);

  const finalizeVoiceAssistantMessage = useCallback((opts?: { error?: string }) => {
    const messageId = voiceAssistantMessageIdRef.current;
    if (!messageId) return;

    const nextMessages = unifiedChat.messages.map((message) => {
      if (message.id !== messageId) return message;
      return {
        ...message,
        metadata: {
          ...message.metadata,
          source: 'voice',
          modality: 'audio',
          isStreaming: false,
          isComplete: true,
          error: Boolean(opts?.error ?? message.metadata?.error),
        },
        timestamp: new Date(),
      };
    });

    unifiedChat.setMessages(nextMessages);
    voiceAssistantMessageIdRef.current = null;
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

  // Export voice transcript for summaries
  const exportVoiceTranscript = useCallback(() => {
    const voiceMessages = messages.filter(msg => msg.metadata?.source === 'voice');
    
    return {
      entries: voiceMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      stats: {
        total: voiceMessages.length,
        duration: voiceMessages.length > 0 
          ? new Date(voiceMessages[voiceMessages.length - 1].timestamp!).getTime() - 
            new Date(voiceMessages[0].timestamp!).getTime()
          : 0
      }
    };
  }, [messages]);

  return {
    messages,
    enhancedMessages,
    researchSummaries,
    isLoading: unifiedChat.isLoading || unifiedChat.isStreaming,
    inputValue,
    setInputValue,
    handleSendMessage,
    handleExportSummary,
    sessionId,
    updateChatContext,
    appendVoiceUserMessage,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    exportVoiceTranscript,
  };
}

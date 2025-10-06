import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import type { PromptInputFile } from "@/components/ai-elements/prompt-input";
import type { AttachmentUploadResponse, ChatAttachment } from "@/types/attachments";

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

export function useChatMessages() {
  const [inputValue, setInputValue] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const voiceAssistantMessageIdRef = useRef<string | null>(null);

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

      // Extract AI elements metadata
      const reasoning = msg.metadata?.reasoning
      const chainOfThought = msg.metadata?.chainOfThought
      const contextUsage = msg.metadata?.contextUsage
      const codeBlocks = msg.metadata?.codeBlocks
      const aiSources = msg.metadata?.sources
      const images = msg.metadata?.images
      const inlineCitations = msg.metadata?.inlineCitations
      const tasks = msg.metadata?.tasks
      const webPreview = msg.metadata?.webPreview
      const attachments = Array.isArray(msg.metadata?.attachments)
        ? (msg.metadata!.attachments as ChatAttachment[])
        : undefined;

      let metadata: EnhancedChatMessage['metadata'] | undefined = researchMetadata || toolInvocations || annotations || reasoning || chainOfThought || contextUsage || codeBlocks || aiSources || images || inlineCitations || tasks || webPreview
        ? {
            sources: mappedSources || aiSources,
            researchSummary: researchMetadata || undefined,
            toolInvocations,
            annotations,
            reasoning,
            chainOfThought,
            contextUsage,
            codeBlocks,
            images,
            inlineCitations,
            tasks,
            webPreview
          }
        : undefined;

      if (attachments && attachments.length > 0) {
        metadata = {
          ...(metadata ?? {}),
          attachments
        };
      }

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

    await unifiedChat.sendMessage(outgoingText, {
      metadata: uploadResult?.attachments?.length ? { attachments: uploadResult.attachments } : undefined,
    });
  }, [unifiedChat, uploadAttachments]);

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
  }, [unifiedChat]);

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
    appendVoiceUserMessage,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
  };
}

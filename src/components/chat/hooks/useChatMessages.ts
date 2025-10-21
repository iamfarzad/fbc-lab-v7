import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import type { UnifiedContext } from "@/core/chat/unified-types";
import { ChatMessage } from "../types/chatTypes";
import type { PromptInputFile } from "@/components/ai-elements/interactive/prompt-input";
import type { AttachmentUploadResponse } from "@/types/attachments";
import { useChatAnalytics } from "./useChatAnalytics";

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


export function useChatMessages(initialSessionId?: string) {
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(() => initialSessionId ?? crypto.randomUUID());
  const voiceAssistantMessageIdRef = useRef<string | null>(null);
  const partialUserMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialSessionId && initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
    }
  }, [initialSessionId, sessionId]);

  // Use unified chat hook with store integration
  const unifiedChat = useUnifiedChat({
    sessionId,
    // mode removed - HTTP transport implies text/multimodal
    context: {
      sessionId,
      enhancedResearch: false  // Smart triggers will override when needed
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    }
  });

  const { conversationFlow } = useChatAnalytics({
    sessionId,
    messages: unifiedChat.messages,
    updateContext: unifiedChat.updateContext,
  });

  // Convert unified messages to chat messages
  const messages = useMemo<ChatMessage[]>(() =>
    unifiedChat.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role === 'system' ? 'assistant' : msg.role,
      timestamp: msg.timestamp,
      metadata: msg.metadata
    })),
    [unifiedChat.messages]
  );

  // Removed EnhancedChatMessage view-model: components now derive UI from core Message.metadata

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
    if (unifiedChat.isLoading || unifiedChat.isStreaming) return;

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

    const existingAttachments = Array.isArray(unifiedChat.context.attachments)
      ? unifiedChat.context.attachments
      : [];

    if (uploadResult?.attachments?.length) {
      // Convert ChatAttachment[] to Attachment[] for core types
      const convertedAttachments = uploadResult.attachments.map(att => {
        const attachmentType: 'image' | 'audio' | 'video' | 'document' = 
          (att.type === 'image' || att.type === 'audio' || att.type === 'video' || att.type === 'document') 
            ? att.type 
            : 'document';
        return {
          id: att.id,
          type: attachmentType,
          url: att.url,
          mimeType: att.type, // Use type as mimeType for now
          size: att.size,
          name: att.name
        };
      });
      unifiedChat.updateContext({
        attachments: [...existingAttachments, ...convertedAttachments]
      });
    }

    setInputValue('');

    await unifiedChat.sendMessage(outgoingText);
  }, [unifiedChat, uploadAttachments]);

  const updateChatContext = useCallback((context: Partial<UnifiedContext>) => {
    unifiedChat.updateContext(context);
  }, [unifiedChat]);

  const updatePartialUserTranscript = useCallback((text: string) => {
    if (!text.trim()) {
      // Remove partial if empty
      if (partialUserMessageIdRef.current) {
        const filtered = unifiedChat.messages.filter(
          m => m.id !== partialUserMessageIdRef.current
        );
        unifiedChat.setMessages(filtered);
        partialUserMessageIdRef.current = null;
      }
      return;
    }

    const existingId = partialUserMessageIdRef.current;
    
    if (!existingId) {
      // Create new partial message
      const message = unifiedChat.addMessage({
        role: 'user',
        content: text,
        timestamp: new Date(),
        metadata: {
          type: 'text',
          source: 'voice',
          modality: 'audio',
          isPartial: true,
          isStreaming: true,
        },
      });
      partialUserMessageIdRef.current = message.id;
    } else {
      // Update existing partial
      const nextMessages = unifiedChat.messages.map((message) => {
        if (message.id !== existingId) return message;
        return {
          ...message,
          content: text,
          timestamp: new Date(),
        };
      });
      unifiedChat.setMessages(nextMessages);
    }
  }, [unifiedChat]);

  const appendVoiceUserMessage = useCallback((text: string) => {
    const content = text.trim();
    if (!content) return;

    // Clear partial message if exists
    if (partialUserMessageIdRef.current) {
      const filtered = unifiedChat.messages.filter(
        m => m.id !== partialUserMessageIdRef.current
      );
      unifiedChat.setMessages(filtered);
      partialUserMessageIdRef.current = null;
    }

    voiceAssistantMessageIdRef.current = null;
    unifiedChat.addMessage({
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: {
        type: 'text',
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
        metadata: {
          type: 'text',
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

    const nextMessages = unifiedChat.messages.map((message): ChatMessage => {
      if (message.id !== messageId) return message;
      return {
        ...message,
        metadata: {
          ...message.metadata,
          source: 'voice',
          modality: 'audio',
          isStreaming: false,
          isComplete: true,
          error: opts?.error ? { code: 'voice_error', message: opts.error } : message.metadata?.error,
        },
        timestamp: new Date(),
      };
    });

    unifiedChat.setMessages(nextMessages);
    voiceAssistantMessageIdRef.current = null;
  }, [unifiedChat]);

  // Explicitly append an assistant message (for one-shot analysis results)
  const appendAssistantMessage = useCallback((content: string, metadata?: Record<string, unknown>) => {
    if (typeof content !== 'string' || content.trim().length === 0) return;
    unifiedChat.addMessage({
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: {
        type: 'text',
        ...metadata,
      },
    });
  }, [unifiedChat]);

  // Handle PDF export (with conversation end archival and inline summary)
  const handleExportSummary = useCallback(async (request: ExportSummaryRequest | null | undefined) => {
    if (!request?.sessionId) return;
    try {
      console.log('🏁 Initiating conversation end and summary generation...')
      
      // 1. Trigger conversation_end to archive context
      const endResponse = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          context: {
            sessionId: request.sessionId,
            trigger: 'conversation_end'
          }
        })
      })

      if (!endResponse.ok) {
        console.error('Failed to archive conversation')
        // Continue anyway - summary might still work
      } else {
        console.log('✅ Conversation archived')
      }

      // 2. Generate summary text for inline display
      toast.info('Generating conversation summary...')
      const summaryResponse = await fetch('/api/generate-summary-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: request.sessionId })
      })

      if (!summaryResponse.ok) {
        throw new Error('Summary generation failed')
      }

      const { summary, metadata: summaryMetadata } = await summaryResponse.json()
      
      // 3. Display summary as inline artifact with GDPR notice
      unifiedChat.addMessage({
        role: 'assistant',
        content: 'Here\'s a comprehensive summary of our conversation. You can download it as a PDF or have it emailed to you.',
        timestamp: new Date(),
        metadata: {
          type: 'multimodal',
          artifacts: [{
            id: crypto.randomUUID(),
            type: 'summary',
            title: 'Conversation Summary',
            content: summary,
            metadata: {
              sessionId: request.sessionId,
              leadEmail: summaryMetadata.leadEmail,
              gdprNotice: {
                message: 'After downloading, raw conversation data (voice transcripts, screen captures, uploaded files) will be permanently deleted from our servers within 7 days. Only this PDF summary will be retained for 90 days for follow-up purposes.',
                dataRetained: ['PDF summary', 'Your contact information (name, email, company)', 'Audit trail of our interaction'],
                dataDeleted: ['Voice transcripts and audio data', 'Screen share captures', 'Webcam images', 'Original uploaded files', 'Raw chat messages']
              }
            }
          }]
        }
      })

      toast.success('Summary ready! Scroll down to view, download, or email.')
      console.log('✅ Summary artifact displayed inline')
    } catch (error) {
      toast.error('Export error. Check console.');
      console.error('Summary generation error:', error);
    }
  }, [messages, unifiedChat]);

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
    // enhancedMessages removed – use messages and metadata in components
    researchSummaries,
    isLoading: unifiedChat.isLoading || unifiedChat.isStreaming,
    sseError: unifiedChat.error || null,
    inputValue,
    setInputValue,
    handleSendMessage,
    handleExportSummary,
    sessionId,
    updateChatContext,
    appendVoiceUserMessage,
    updatePartialUserTranscript,
    appendVoiceAssistantChunk,
    finalizeVoiceAssistantMessage,
    appendAssistantMessage,
    exportVoiceTranscript,
    conversationFlow,
  };
}

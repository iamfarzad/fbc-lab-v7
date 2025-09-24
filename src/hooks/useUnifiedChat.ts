import { useCallback, useMemo, useState } from 'react';
import { generateId } from 'ai';
import type {
  UnifiedChatOptions,
  UnifiedChatReturn,
  UnifiedMessage,
  UnifiedContext,
} from '@/core/chat/unified-types';

type MessageInit = Pick<UnifiedMessage, 'role' | 'content'> & Partial<Pick<UnifiedMessage, 'id' | 'timestamp' | 'type' | 'metadata'>>;

const createMessage = (input: MessageInit): UnifiedMessage => ({
  id: input.id ?? generateId(),
  role: input.role,
  content: input.content,
  timestamp: input.timestamp ?? new Date(),
  type: input.type,
  metadata: input.metadata,
});

export function useUnifiedChat(options: UnifiedChatOptions = {}): UnifiedChatReturn {
  const [messages, setMessages] = useState<UnifiedMessage[]>(options.initialMessages ?? []);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [context, setContext] = useState<UnifiedContext>(options.context ?? {});

  const addMessage = useCallback(
    (message: MessageInit): UnifiedMessage => {
      const full = createMessage(message);
      setMessages((prev) => [...prev, full]);
      return full;
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const updateContext = useCallback((partial: Partial<UnifiedContext>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsLoading(true);
      setError(null);
      const userMessage = createMessage({ role: 'user', content });
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch('/api/chat/unified', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.sessionId ? { 'x-intelligence-session-id': context.sessionId } : {}),
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
            context,
            mode: options.mode ?? 'standard',
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Unified chat request failed with status ${response.status}`);
        }

        const data = await response.json();
        const assistant = typeof data === 'string' ? data : data?.content;
        if (assistant) {
          setMessages((prev) => [
            ...prev,
            createMessage({ role: 'assistant', content: assistant }),
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send unified chat message'));
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [context, messages, options.mode]
  );

  return useMemo(
    () => ({
      messages,
      isLoading,
      isStreaming,
      error,
      sendMessage,
      addMessage,
      clearMessages,
      updateContext,
    }),
    [messages, isLoading, isStreaming, error, sendMessage, addMessage, clearMessages, updateContext]
  );
}

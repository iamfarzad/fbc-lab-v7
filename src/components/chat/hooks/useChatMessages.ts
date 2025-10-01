import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { generateId } from "ai";
import { useAIElements } from "@/hooks/useAIElements";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { CHAT_CONSTANTS } from "../constants/chatConstants";

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [enhancedMessages, setEnhancedMessages] = useState<EnhancedChatMessage[]>([]);

  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionIdRef = useRef<string>(generateId());

  // Enhanced AI elements for advanced features
  const aiElements = useAIElements({
    showReasoning: true,
    showSources: true,
    showActions: true,
    showCodeBlocks: true,
    showArtifacts: true,
    enableReactions: true,
    enableReadReceipts: true,
    enableTypingIndicators: true
  });

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmed = content.trim();
    const normalized = trimmed.toLowerCase();

    const userMessage: ChatMessage = {
      id: generateId(),
      content: trimmed,
      role: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    const enhancedUserMessage = aiElements.createEnhancedMessage(trimmed, 'user');

    const priorMessages = messagesRef.current;
    const nextMessages = [...priorMessages, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setEnhancedMessages(prev => [...prev, enhancedUserMessage]);
    setInputValue('');
    setIsLoading(true);
    aiElements.setLoading(true);

    try {
      const payload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        context: {
          sessionId: sessionIdRef.current,
          enhancedResearch: true
        },
        mode: 'standard',
        stream: false
      };

      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-intelligence-session-id': sessionIdRef.current
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = (typeof data === 'string' ? data : data?.content) || '';

      const aiResponse: ChatMessage = {
        id: data?.id ?? generateId(),
        content: assistantContent || 'I had trouble generating a response. Could you try again?',
        role: 'assistant',
        timestamp: new Date(),
      };

      const enhancedAiMessage = aiElements.createEnhancedMessage(aiResponse.content, 'assistant');

      setMessages(prev => {
        const updated = [...prev, aiResponse];
        messagesRef.current = updated;
        return updated;
      });
      setEnhancedMessages(prev => [...prev, enhancedAiMessage]);
      aiElements.setLoading(false);
      setIsLoading(false);

      setTimeout(() => {
        aiElements.updateMessageStatus(enhancedAiMessage.id, 'delivered');
        setTimeout(() => {
          aiElements.updateMessageStatus(enhancedAiMessage.id, 'read');
        }, 500);
      }, 300);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I apologize, but I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      const enhancedErrorMessage = aiElements.createEnhancedMessage(
        'I apologize, but I encountered an error. Please try again.',
        'assistant'
      );

      setMessages(prev => {
        const updated = [...prev, errorMessage];
        messagesRef.current = updated;
        return updated;
      });
      setEnhancedMessages(prev => [...prev, enhancedErrorMessage]);
      aiElements.setLoading(false);
      setIsLoading(false);
      aiElements.setError('Failed to process message');
    }
  }, [aiElements, isLoading]);

  // Handle PDF export
  const handleExportSummary = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch('/api/export-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
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
    isLoading,
    inputValue,
    setInputValue,
    handleSendMessage,
    handleExportSummary,
    sessionId: sessionIdRef.current,
  };
}




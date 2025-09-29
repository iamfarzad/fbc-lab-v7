import { useState, useCallback } from 'react';
import {
  EnhancedChatMessage,
  AIElementConfig,
  ExtractedElements,
  MessageAction,
  Source,
  CodeBlock,
  AIBaseElement,
  ChatState
} from '@/types/chat-enhanced';

const defaultConfig: AIElementConfig = {
  showReasoning: true,
  showSources: true,
  showActions: true,
  showCodeBlocks: true,
  showArtifacts: true,
  enableInlineCitations: true,
  enableWebPreviews: true,
  enableTaskTracking: true,
  enableReactions: true,
  enableReadReceipts: true,
  enableTypingIndicators: true,
  enableMessageThreading: true,
  enableConversationBranching: true,
  maxCodeBlockHeight: 400,
  maxReasoningLength: 1000,
  theme: 'auto'
};

export function useAIElements(initialConfig: Partial<AIElementConfig> = {}) {
  const [config] = useState<AIElementConfig>({ ...defaultConfig, ...initialConfig });
  const [elements, setElements] = useState<Map<string, AIBaseElement>>(new Map());
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    isStreaming: false,
    typingUsers: [],
    settings: config,
    context: {
      messages: [],
      isTyping: false,
      hasError: false,
      availableModels: [],
      settings: config,
      userPreferences: {
        theme: 'auto',
        fontSize: 'medium',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  });

  // Removed problematic ref pattern that could cause infinite loops

  // Register AI elements
  const registerElement = useCallback((element: AIBaseElement) => {
    setElements(prev => new Map(prev).set(element.id, element));
  }, []);

  // Unregister AI elements
  const unregisterElement = useCallback((elementId: string) => {
    setElements(prev => {
      const newMap = new Map(prev);
      newMap.delete(elementId);
      return newMap;
    });
  }, []);

  // Get element by ID
  const getElement = useCallback((elementId: string): AIBaseElement | undefined => {
    // Use elements state directly instead of ref to prevent infinite loops
    const currentElements = new Map(elements);
    return currentElements.get(elementId);
  }, [elements]);

  // Extract AI elements from message content
  const extractElements = useCallback((content: string): ExtractedElements => {
    const extracted: ExtractedElements = {};

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: CodeBlock[] = [];
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        id: `code-${Date.now()}-${Math.random()}`,
        code: match[2].trim(),
        language: match[1] || 'text',
        showLineNumbers: true,
        canCopy: true
      });
    }
    if (codeBlocks.length > 0) {
      extracted.codeBlocks = codeBlocks;
    }

    // Extract sources (simple URL detection)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const sources: Source[] = [];
    while ((match = urlRegex.exec(content)) !== null) {
      sources.push({
        id: `source-${Date.now()}-${Math.random()}`,
        title: match[1],
        url: match[1],
        type: 'web'
      });
    }
    if (sources.length > 0) {
      extracted.sources = sources;
    }

    // Extract reasoning (look for patterns like "Thinking:" or "Reasoning:")
    const reasoningRegex = /(Thinking:|Reasoning:|Analysis:)([\s\S]*?)(?=\n\n[A-Z]|$)/i;
    const reasoningMatch = content.match(reasoningRegex);
    if (reasoningMatch) {
      extracted.reasoning = reasoningMatch[2].trim();
    }

    return extracted;
  }, []);

  // Create enhanced message
  const createEnhancedMessage = useCallback((
    content: string, 
    role: 'user' | 'assistant', 
    metadata?: EnhancedChatMessage['metadata']
  ): EnhancedChatMessage => {
    const extracted = role === 'assistant' ? extractElements(content) : undefined;
    
    // Transform artifacts to ensure content is string
    const transformedExtracted = extracted ? {
      ...extracted,
      artifacts: extracted.artifacts?.map(artifact => ({
        ...artifact,
        content: typeof artifact.content === 'object' ? JSON.stringify(artifact.content) : artifact.content
      }))
    } : undefined;
    
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      role,
      timestamp: new Date(),
      type: 'text',
      status: 'sending',
      metadata: {
        ...metadata,
        ...transformedExtracted
      }
    };
  }, [extractElements]);

  // Update message status
  const updateMessageStatus = useCallback((messageId: string, status: EnhancedChatMessage['status'], error?: string) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, status, error }
          : msg
      )
    }));
  }, []);

  // Add message to chat
  const addMessage = useCallback((message: EnhancedChatMessage) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      context: {
        ...prev.context,
        messages: [...prev.context.messages, message]
      }
    }));
  }, []);

  // Remove message from chat
  const removeMessage = useCallback((messageId: string) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId),
      context: {
        ...prev.context,
        messages: prev.context.messages.filter(msg => msg.id !== messageId)
      }
    }));
  }, []);

  // Update message content
  const updateMessage = useCallback((messageId: string, updates: Partial<EnhancedChatMessage>) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, ...updates }
          : msg
      ),
      context: {
        ...prev.context,
        messages: prev.context.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, ...updates }
            : msg
        )
      }
    }));
  }, []);

  // Set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    setChatState(prev => ({ ...prev, isLoading }));
  }, []);

  // Set error state
  const setError = useCallback((error: string | null) => {
    setChatState(prev => ({ 
      ...prev, 
      error,
      context: { ...prev.context, hasError: error !== null }
    }));
  }, []);

  // Set streaming state
  const setStreaming = useCallback((isStreaming: boolean) => {
    setChatState(prev => ({ ...prev, isStreaming }));
  }, []);

  // Add typing user
  const addTypingUser = useCallback((userId: string, userName: string) => {
    setChatState(prev => ({
      ...prev,
      typingUsers: [...prev.typingUsers.filter(u => u !== userId), userId]
    }));
  }, []);

  // Remove typing user
  const removeTypingUser = useCallback((userId: string) => {
    setChatState(prev => ({
      ...prev,
      typingUsers: prev.typingUsers.filter(u => u !== userId)
    }));
  }, []);

  // Toggle AI element visibility
  const toggleElement = useCallback((elementId: string) => {
    setElements(prev => {
      const element = prev.get(elementId);
      if (element && element.canToggle) {
        const newMap = new Map(prev);
        newMap.set(elementId, {
          ...element,
          isExpanded: !element.isExpanded
        });
        return newMap;
      }
      return prev;
    });
  }, []);

  // Execute message action
  const executeAction = useCallback(async (action: MessageAction) => {
    if (action.requiresConfirmation && action.confirmationMessage) {
      const confirmed = window.confirm(action.confirmationMessage);
      if (!confirmed) return;
    }
    
    try {
      await action.onClick();
    } catch (error) {
      console.error('Error executing action:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [setError]);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<AIElementConfig>) => {
    setChatState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newConfig },
      context: {
        ...prev.context,
        settings: { ...prev.context.settings, ...newConfig }
      }
    }));
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      messages: [],
      context: {
        ...prev.context,
        messages: []
      }
    }));
  }, []);

  // Get message by ID
  const getMessage = useCallback((messageId: string): EnhancedChatMessage | undefined => {
    return chatState.messages.find(msg => msg.id === messageId);
  }, [chatState.messages]);

  // Get messages by role
  const getMessagesByRole = useCallback((role: EnhancedChatMessage['role']): EnhancedChatMessage[] => {
    return chatState.messages.filter(msg => msg.role === role);
  }, [chatState.messages]);

  // Get last message
  const getLastMessage = useCallback((): EnhancedChatMessage | undefined => {
    return chatState.messages[chatState.messages.length - 1];
  }, [chatState.messages]);

  // Get typing indicators
  const getTypingIndicators = useCallback(() => {
    return chatState.typingUsers.map(userId => ({
      userId,
      userName: userId, // Could be enhanced with user data
      isTyping: true,
      timestamp: new Date()
    }));
  }, [chatState.typingUsers]);

  return {
    // State
    chatState,
    config,
    elements,
    
    // Actions
    registerElement,
    unregisterElement,
    getElement,
    createEnhancedMessage,
    addMessage,
    removeMessage,
    updateMessage,
    updateMessageStatus,
    setLoading,
    setError,
    setStreaming,
    addTypingUser,
    removeTypingUser,
    toggleElement,
    executeAction,
    updateConfig,
    clearChat,
    
    // Utilities
    extractElements,
    getMessage,
    getMessagesByRole,
    getLastMessage,
    getTypingIndicators
  };
}

export type UseAIElementsReturn = ReturnType<typeof useAIElements>;

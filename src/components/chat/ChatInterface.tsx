"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Import AI Elements components
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { EnhancedMessage } from "@/components/ai-elements/enhanced-message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { generateId } from "ai";
import { useAIElements } from "@/hooks/useAIElements";
import { EnhancedChatMessage } from "@/types/chat-enhanced";

// UI Components
import { Button } from "@/components/ui/button";
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";

// Icons
import {
  MessageCircle,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Settings,
  Minimize2,
  Expand,
  Shrink,
  Plus,
  RotateCcw,
  FileText,
} from "lucide-react";

const DEFAULT_SUGGESTIONS = [
  "What AI consulting services do you offer?",
  "Tell me about your workshops",
  "How can AI help my business?",
  "What's your implementation process?",
  "Do you offer custom AI solutions?",
  "Schedule a strategy call"
];

const MEETING_KEYWORDS = [
  "book",
  "schedule",
  "meeting",
  "call",
  "consultation",
  "strategy call",
  "calendar",
  "cal.com",
  "calendly"
];

// Types - Using EnhancedChatMessage from chat-enhanced.ts
interface ChatMessage {
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

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  isListening: boolean;
  showSettings: boolean;
}

interface Props {
  id?: string | null;
}

// Voice recognition hook (simplified)
const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const startListening = () => {
    if (!isSupported) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }
    setIsListening(true);
    // Simulate voice input
    setTimeout(() => {
      setTranscript("Hello, I'd like to learn more about AI consulting services.");
      setIsListening(false);
    }, 2000);
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    interimTranscript: '',
    isSupported,
    error: null,
    startListening,
    stopListening,
    clearTranscript
  };
};

// Camera service hook (simplified)
const useCameraService = () => {
  const [cameraState, setCameraState] = useState({
    isActive: false,
    availableDevices: ['default', 'front'],
    currentDevice: 'default'
  });

  const startCamera = async () => {
    setCameraState(prev => ({ ...prev, isActive: true }));
  };

  const stopCamera = () => {
    setCameraState(prev => ({ ...prev, isActive: false }));
  };

  const switchCamera = () => {
    setCameraState(prev => ({
      ...prev,
      currentDevice: prev.currentDevice === 'default' ? 'front' : 'default'
    }));
  };

  return {
    cameraState,
    startCamera,
    stopCamera,
    switchCamera
  };
};

export function ChatInterface({ id }: Props) {
  // Enhanced AI elements hook
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

  // Chat state
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    isMinimized: false,
    isExpanded: false,
    isScreenSharing: false,
    isCameraActive: false,
    isListening: false,
    showSettings: false
  });

  // Messages and loading state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [contextReady, setContextReady] = useState(false);
  const sessionIdRef = useRef<string>(id || generateId());
  const hasInitialisedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  
  // Enhanced messages state
  const [enhancedMessages, setEnhancedMessages] = useState<EnhancedChatMessage[]>([]);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);

  // Hooks
  const { 
    isListening, 
    transcript, 
    interimTranscript, 
    isSupported: isVoiceSupported, 
    startListening, 
    stopListening, 
    clearTranscript 
  } = useVoice();
  
  const { 
    cameraState, 
    startCamera, 
    stopCamera, 
    switchCamera 
  } = useCameraService();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch('/api/intelligence/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      });

      if (!response.ok) {
        setSuggestions(DEFAULT_SUGGESTIONS);
        return;
      }

      const data = await response.json();
      const raw = Array.isArray(data?.suggestions) ? data.suggestions : data?.output?.suggestions;
      if (!Array.isArray(raw) || raw.length === 0) {
        setSuggestions(DEFAULT_SUGGESTIONS);
        return;
      }

      setSuggestions(
        raw.map((item: any) =>
          (item?.label || item?.text || '').toString().trim() || 'Ask another question'
        )
      );
    } catch (error) {
      console.warn('Suggestion fetch failed', error);
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, []);

  const initialiseSession = useCallback(async () => {
    if (hasInitialisedRef.current) return;
    try {
      setContextReady(false);
      const response = await fetch('/api/intelligence/session-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          email: 'guest@farzadbayat.com',
          name: 'Website Visitor'
        })
      });

      if (!response.ok) {
        console.warn('Failed to initialise intelligence session', await response.text());
        return;
      }

      hasInitialisedRef.current = true;
      setContextReady(true);
      await fetchSuggestions();
    } catch (error) {
      console.warn('Session initialisation failed', error);
    }
  }, [fetchSuggestions]);

  useEffect(() => {
    if (chatState.isOpen) {
      void initialiseSession();
    }
  }, [chatState.isOpen, initialiseSession]);

  // Sync refs and auto-scroll when messages update
  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatState.isOpen && inputRef.current && !chatState.isMinimized) {
      inputRef.current.focus();
    }
  }, [chatState.isOpen, chatState.isMinimized]);

  // Cleanup when chat closes
  useEffect(() => {
    if (!chatState.isOpen) {
      if (cameraState.isActive) {
        stopCamera();
      }
      if (isListening) {
        stopListening();
      }
    }
  }, [chatState.isOpen, cameraState.isActive, isListening, stopCamera, stopListening]);

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
      type: isListening ? 'voice' : 'text'
    };

    const enhancedUserMessage = aiElements.createEnhancedMessage(trimmed, 'user', {
      fileName: isListening ? 'voice-recording' : undefined,
      fileType: isListening ? 'audio/wav' : undefined
    });

    if (MEETING_KEYWORDS.some(keyword => normalized.includes(keyword))) {
      setIsMeetingOpen(true);
    }

    const priorMessages = messagesRef.current;
    const nextMessages = [...priorMessages, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setEnhancedMessages(prev => [...prev, enhancedUserMessage]);
    setInputValue('');
    setIsLoading(true);
    aiElements.setLoading(true);

    if (isListening) {
      clearTranscript();
    }

    try {
      const payload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        context: { sessionId: sessionIdRef.current },
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
        timestamp: new Date()
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

      void fetchSuggestions();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I apologize, but I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
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
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, [aiElements, clearTranscript, fetchSuggestions, isListening, isLoading]);

  // Handle voice transcript completion
  useEffect(() => {
    if (transcript && !isListening) {
      void handleSendMessage(transcript);
    }
  }, [handleSendMessage, transcript, isListening]);

  // Toggle functions
  const toggleChat = () => {
    setChatState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  const openMeeting = () => {
    setIsMeetingOpen(true);
  };

  const toggleMinimize = () => {
    setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized, isExpanded: false }));
  };

  const toggleExpand = () => {
    setChatState(prev => ({ ...prev, isExpanded: !prev.isExpanded, isMinimized: false }));
  };

  const toggleVoice = () => {
    if (!isVoiceSupported) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  const toggleCamera = async () => {
    try {
      if (cameraState.isActive) {
        stopCamera();
      } else {
        await startCamera();
      }
    } catch (error) {
      toast.error("Camera access failed", {
        description: "Please check camera permissions and try again"
      });
    }
  };

  const toggleScreenShare = () => {
    setChatState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
  };

  const toggleSettings = () => {
    setChatState(prev => ({ ...prev, showSettings: !prev.showSettings }));
  };

  // Get current input display value
  const getInputDisplayValue = () => {
    if (isListening) {
      return transcript + interimTranscript;
    }
    return inputValue;
  };

  // Get appropriate placeholder text
  const getPlaceholder = () => {
    if (isListening) {
      return "Listening... speak now";
    }
    return "Ask about AI consulting...";
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.div 
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={toggleChat}
          data-chat-trigger
          className="h-12 w-12 sm:h-14 sm:w-14 midday-bg-primary midday-chat-user-text hover:bg-primary/90 shadow-lg relative touch-manipulation midday-transition midday-hover-lift"
        >
          {chatState.isOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse bg-primary"></div>
            </>
          )}
        </Button>
      </motion.div>

      {/* Chat Interface */}
      <AnimatePresence>
        {chatState.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${
              chatState.isMinimized 
                ? 'bottom-16 right-4 sm:bottom-24 sm:right-6 w-72 sm:w-80 h-12' 
                : chatState.isExpanded
                  ? 'top-0 left-0 right-0 bottom-0 w-full'
                  : 'bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 h-[70vh] sm:h-[600px] max-h-[600px]'
            } z-[100] midday-bg-card border border-border midday-shadow-lg flex flex-col transition-all duration-300 safe-area-inset-bottom`}
          >
            {chatState.isMinimized ? (
              /* Minimized State */
              <motion.div
                className="h-full flex items-center justify-between px-4 cursor-pointer"
                onClick={toggleMinimize}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full midday-bg-primary"></div>
                  <span className="text-sm truncate midday-font-sans">
                    F.B/c AI
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChat();
                  }}
                  className="h-6 w-6 p-0 midday-transition-colors"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ) : (
              /* Normal and Expanded Layout */
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className={`${chatState.isExpanded ? 'pt-10 sm:pt-16' : 'pt-4'} pb-4 px-4 sm:px-6 border-b border-border/60 midday-bg-card/95 flex items-center justify-between backdrop-blur ${chatState.isExpanded ? 'safe-area-inset-top' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center midday-rounded-full border border-border/50 text-xs font-medium midday-text-primary">
                      F•B
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold midday-font-sans">F.B/c Assistant</p>
                      <p className="text-xs text-muted-foreground midday-font-sans">Strategic AI guidance tailored to your session</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="hidden sm:inline-flex h-8 px-3 font-medium"
                      onClick={openMeeting}
                    >
                      Book a call
                    </Button>
                    <div className="flex items-center gap-1">
                      {!chatState.isExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleExpand}
                          className="h-6 w-6 p-0 touch-manipulation midday-transition-colors"
                          title="Expand"
                        >
                          <Expand className="h-3 w-3" />
                        </Button>
                      )}
                      {chatState.isExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleExpand}
                          className="h-8 w-8 sm:h-6 sm:w-6 p-0 touch-manipulation midday-transition-colors"
                          title="Exit Fullscreen"
                        >
                          <Shrink className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMinimize}
                        className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation midday-transition-colors`}
                        title="Minimize"
                      >
                        <Minimize2 className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleChat}
                        className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation midday-transition-colors`}
                        title="Close"
                      >
                        <X className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Video/Screen Area for expanded mode */}
                {chatState.isExpanded && (cameraState.isActive || chatState.isScreenSharing) && (
                  <div className="relative">
                    {cameraState.isActive ? (
                      <div className="relative h-64 sm:h-80 border-b border-border bg-muted/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                              CAMERA ACTIVE
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={stopCamera}
                            className="h-6 w-6 p-0 bg-background/80"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : chatState.isScreenSharing ? (
                      <div className="relative h-64 sm:h-80 bg-muted/20 border-b border-border">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Monitor className="h-12 w-12 text-muted-foreground mx-auto" />
                            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                              SCREEN SHARING
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setChatState(prev => ({ ...prev, isScreenSharing: false }))}
                            className="h-6 w-6 p-0 bg-background/80"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden relative">
                  <Conversation className="h-full">
                    <ConversationContent className="px-6 py-8 space-y-6">
                      {messages.length === 0 ? (
                        <ConversationEmptyState
                          title="Welcome to F.B/c AI"
                          description={contextReady
                            ? 'Ask about consulting, workshops, or implementation to begin.'
                            : 'Gathering company intelligence tailored to you...'}
                          icon={<MessageCircle className="h-6 w-6 text-muted-foreground" />}
                        >
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {suggestions.map((suggestion, index) => (
                            <Suggestion
                              key={index}
                              suggestion={suggestion}
                              onClick={() => {
                                if (suggestion.toLowerCase().includes("schedule")) {
                                  openMeeting();
                                } else {
                                  void handleSendMessage(suggestion);
                                }
                              }}
                            />
                            ))}
                          </div>
                        </ConversationEmptyState>
                      ) : (
                        enhancedMessages.map((message) => (
                          <EnhancedMessage
                            key={message.id}
                            message={message}
                            config={aiElements.config}
                            onAction={aiElements.executeAction}
                            onReaction={(emoji) => {
                              console.log('Reaction:', emoji, 'for message:', message.id);
                            }}
                          />
                        ))
                      )}

                      {messages.length > 0 && (
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">Ready to explore next steps?</p>
                              <p>Book a live strategy session with Farzad to map out your AI roadmap.</p>
                            </div>
                            <Button onClick={openMeeting} className="sm:self-start">
                              Schedule a call
                            </Button>
                          </div>
                        </div>
                      )}

                      {isLoading && (
                        <div className="flex justify-center py-6">
                          <Loader />
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </ConversationContent>
                    <ConversationScrollButton className="shadow-md" />
                  </Conversation>
                </div>

                {/* Input Area */}
                <div className="border-t border-border/60 midday-bg-card/80 safe-area-inset-bottom">
                  <PromptInput
                    className="mx-4 my-4 flex flex-col gap-2 midday-rounded-3xl border border-border/60 midday-bg-background/95 px-3 pb-2 pt-3 midday-shadow-lg midday-shadow-md backdrop-blur"
                    accept="image/*,.pdf"
                    onSubmit={async (message, event) => {
                      event.preventDefault();

                      if (message.files && message.files.length > 0) {
                        toast.info('File analysis is coming soon. The attachment was noted but not yet processed.');
                      }

                      if (message.text) {
                        await handleSendMessage(message.text);
                      }
                    }}
                  >
                    <PromptInputBody className="flex flex-col gap-2">
                      <PromptInputAttachments className="px-2">
                        {(attachment) => (
                          <PromptInputAttachment key={attachment.id} data={attachment} />
                        )}
                      </PromptInputAttachments>

                      <PromptInputTextarea
                        className="midday-rounded-2xl bg-transparent px-4 text-base leading-relaxed placeholder:text-muted-foreground/70 midday-font-sans"
                        value={getInputDisplayValue()}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={getPlaceholder()}
                        disabled={isLoading || isListening}
                        ref={inputRef}
                      />

                      <PromptInputToolbar className="items-center px-2 pb-1 pt-0">
                        <PromptInputTools className="gap-1.5">
                          <PromptInputButton
                            variant={isListening ? 'default' : 'ghost'}
                            className="h-9 midday-rounded-full px-3 text-sm midday-transition-colors"
                            onClick={toggleVoice}
                            disabled={!isVoiceSupported}
                            title={!isVoiceSupported ? 'Voice recognition not supported in this browser' : isListening ? 'Stop voice input' : 'Start voice input'}
                          >
                            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                          </PromptInputButton>

                          <PromptInputButton
                            variant={cameraState.isActive ? 'default' : 'ghost'}
                            className="h-9 midday-rounded-full px-3 text-sm midday-transition-colors"
                            onClick={toggleCamera}
                            title={`${cameraState.isActive ? 'Disable' : 'Enable'} camera`}
                          >
                            {cameraState.isActive ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                          </PromptInputButton>

                          <PromptInputButton
                            variant={chatState.isScreenSharing ? 'default' : 'ghost'}
                            className="h-9 midday-rounded-full px-3 text-sm midday-transition-colors"
                            onClick={toggleScreenShare}
                            title="Toggle screen share"
                          >
                            {chatState.isScreenSharing ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
                          </PromptInputButton>

                          <PromptInputButton
                            variant={chatState.showSettings ? 'default' : 'ghost'}
                            className="h-9 midday-rounded-full px-3 text-sm midday-transition-colors"
                            onClick={toggleSettings}
                            title="Chat settings"
                          >
                            <Settings className="h-4 w-4" />
                          </PromptInputButton>

                          <PromptInputActionMenu>
                            <PromptInputActionMenuTrigger className="midday-rounded-full border border-border/60 midday-bg-background px-3 py-2 text-sm font-medium text-muted-foreground midday-shadow-sm midday-transition-colors">
                              <Plus className="h-4 w-4" />
                            </PromptInputActionMenuTrigger>
                            <PromptInputActionMenuContent align="end" className="midday-rounded-2xl border border-border/40 midday-bg-background/95 midday-shadow-lg midday-shadow-xl">
                              <PromptInputActionAddAttachments label="Add photos & files" />
                              <PromptInputActionMenuItem
                                onClick={() => toast.info('PDF summaries are on the roadmap. Stay tuned!')}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Generate summary (soon)
                              </PromptInputActionMenuItem>
                            </PromptInputActionMenuContent>
                          </PromptInputActionMenu>

                          {cameraState.isActive && cameraState.availableDevices.length > 1 && (
                            <PromptInputButton
                              variant="ghost"
                              className="h-9 midday-rounded-full px-3 text-sm midday-transition-colors"
                              onClick={switchCamera}
                              title="Switch camera"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </PromptInputButton>
                          )}
                        </PromptInputTools>

                        <PromptInputSubmit
                          className="h-10 w-10 midday-rounded-full midday-bg-primary midday-chat-user-text hover:bg-primary/90 midday-transition-colors"
                          variant="ghost"
                          status={isLoading ? 'submitted' : undefined}
                          disabled={isLoading || !getInputDisplayValue().trim()}
                        />
                      </PromptInputToolbar>
                    </PromptInputBody>
                  </PromptInput>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI SDK Devtools */}
      {process.env.NODE_ENV === "development" && (
        <AIDevtools
          config={{
            streamCapture: {
              enabled: true,
              endpoint: "/api/demo-chat",
              autoConnect: true,
            },
          }}
        />
      )}
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />
    </>
  );
}

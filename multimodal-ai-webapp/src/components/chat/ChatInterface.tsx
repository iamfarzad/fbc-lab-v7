"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Import AI Elements components
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputTextarea, PromptInputToolbar, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { EnhancedMessage } from "@/components/ai-elements/enhanced-message";
import { AIDevtools } from "@ai-sdk-tools/devtools";
import { generateId } from "ai";
import { useAIElements } from "@/hooks/useAIElements";
import { EnhancedChatMessage, AIElementConfig } from "@/types/chat-enhanced";

// UI Components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import { 
  MessageCircle, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Monitor, 
  MonitorOff, 
  Settings, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Expand, 
  Shrink, 
  Plus, 
  RotateCcw, 
  FileText,
  MoreVertical,
  Volume2,
  Video,
  Share2,
  Settings2
} from "lucide-react";

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
  
  // Enhanced messages state
  const [enhancedMessages, setEnhancedMessages] = useState<EnhancedChatMessage[]>([]);

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

  // Generate chat ID
  const chatId = id || generateId();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatState.isOpen && inputRef.current && !chatState.isMinimized) {
      inputRef.current.focus();
    }
  }, [chatState.isOpen, chatState.isMinimized]);

  // Handle voice transcript completion
  useEffect(() => {
    if (transcript && !isListening) {
      handleSendMessage(transcript);
    }
  }, [transcript, isListening]);

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
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      type: isListening ? 'voice' : 'text'
    };

    // Create enhanced message using the AI elements hook
    const enhancedUserMessage = aiElements.createEnhancedMessage(
      content.trim(),
      'user',
      {
        fileName: isListening ? 'voice-recording' : undefined,
        fileType: isListening ? 'audio/wav' : undefined
      }
    );

    setMessages(prev => [...prev, userMessage]);
    setEnhancedMessages(prev => [...prev, enhancedUserMessage]);
    setInputValue('');
    setIsLoading(true);
    aiElements.setLoading(true);

    // Clear voice transcript if this was a voice message
    if (isListening) {
      clearTranscript();
    }

    try {
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: generateId(),
          content: `I understand you're interested in AI consulting services. As an AI consultant and workshop facilitator, I can help you with:\n\n• AI strategy development\n• Team training and workshops\n• Implementation support\n• Custom AI solutions\n\nWould you like me to elaborate on any of these areas or discuss your specific needs?\n\n**Thinking:** I should provide a comprehensive overview that covers the main service areas while keeping it concise and engaging. The user seems interested in consulting services, so I'll highlight the key offerings and invite follow-up questions.\n\nHere's a simple code example showing how AI can be integrated:\n\n\`\`\`javascript\n// AI Strategy Implementation\nconst aiStrategy = {\n  assessment: analyzeBusinessNeeds(),\n  roadmap: createImplementationPlan(),\n  training: developTeamProgram(),\n  metrics: defineSuccessCriteria()\n};\n\`\`\`\n\n**Sources:**\n- [AI Consulting Best Practices](https://example.com/ai-consulting)\n- [Workshop Methodology](https://example.com/workshops)\n- [Implementation Framework](https://example.com/framework)`,
          role: 'assistant',
          timestamp: new Date()
        };

        // Create enhanced AI message with AI elements
        const enhancedAiMessage = aiElements.createEnhancedMessage(
          aiResponse.content,
          'assistant',
          {
            reasoningDuration: 250,
            reasoningSteps: [
              {
                step: 1,
                content: "Analyze user inquiry about AI consulting services",
                duration: 100
              },
              {
                step: 2,
                content: "Structure comprehensive response covering key service areas",
                duration: 80
              },
              {
                step: 3,
                content: "Add code example and sources for enhanced value",
                duration: 70
              }
            ]
          }
        );

        setMessages(prev => [...prev, aiResponse]);
        setEnhancedMessages(prev => [...prev, enhancedAiMessage]);
        setIsLoading(false);
        aiElements.setLoading(false);
        
        // Update message status to delivered/read
        setTimeout(() => {
          aiElements.updateMessageStatus(enhancedAiMessage.id, 'delivered');
          setTimeout(() => {
            aiElements.updateMessageStatus(enhancedAiMessage.id, 'read');
          }, 500);
        }, 300);
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: "I apologize, but I encountered an error. Please try again.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      const enhancedErrorMessage = aiElements.createEnhancedMessage(
        "I apologize, but I encountered an error. Please try again.",
        'assistant'
      );
      
      setMessages(prev => [...prev, errorMessage]);
      setEnhancedMessages(prev => [...prev, enhancedErrorMessage]);
      setIsLoading(false);
      aiElements.setLoading(false);
      aiElements.setError("Failed to process message");
    }
  };

  // Toggle functions
  const toggleChat = () => {
    setChatState(prev => ({ ...prev, isOpen: !prev.isOpen }));
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

  // Demo suggestions
  const demoSuggestions = [
    "What AI consulting services do you offer?",
    "Tell me about your workshops",
    "How can AI help my business?",
    "What's your implementation process?",
    "Do you offer custom AI solutions?"
  ];

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
          className="h-12 w-12 sm:h-14 sm:w-14 bg-black text-white hover:bg-gray-800 shadow-lg relative touch-manipulation"
        >
          {chatState.isOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse bg-[#FF6B35]"></div>
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
            } z-[100] bg-background border border-border shadow-2xl flex flex-col transition-all duration-300 safe-area-inset-bottom`}
          >
            {chatState.isMinimized ? (
              /* Minimized State */
              <motion.div
                className="h-full flex items-center justify-between px-4 cursor-pointer"
                onClick={toggleMinimize}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'hsl(var(--orange))' }}></div>
                  <span className="text-sm truncate" style={{ fontFamily: 'var(--font-display)' }}>
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
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ) : (
              /* Normal and Expanded Layout */
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className={`${chatState.isExpanded ? 'pt-12 sm:pt-20' : 'pt-4'} pb-3 px-4 sm:px-6 bg-background border-b border-border flex items-center justify-between ${chatState.isExpanded ? 'safe-area-inset-top' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
                    <h4 className="text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                      F.B/c AI
                    </h4>
                    <div className="ml-2 px-2 py-1 rounded-full" style={{ backgroundColor: 'hsl(var(--orange-muted))' }}>
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'hsl(var(--orange-muted-foreground))' }}>
                        MULTIMODAL
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!chatState.isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleExpand}
                        className="h-6 w-6 p-0 touch-manipulation"
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
                        className="h-8 w-8 sm:h-6 sm:w-6 p-0 touch-manipulation"
                        title="Exit Fullscreen"
                      >
                        <Shrink className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMinimize}
                      className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation`}
                      title="Minimize"
                    >
                      <Minimize2 className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleChat}
                      className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation`}
                      title="Close"
                    >
                      <X className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} />
                    </Button>
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
                  <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsl(var(--orange-muted))' }}>
                          <MessageCircle className="h-6 w-6" style={{ color: 'hsl(var(--orange-muted-foreground))' }} />
                        </div>
                        <div className="text-lg font-medium mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                          Welcome to F.B/c AI
                        </div>
                        <div className="text-sm text-muted-foreground mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
                          Your AI consultant for strategy, workshops, and implementation
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {demoSuggestions.map((suggestion, index) => (
                            <Suggestion
                              key={index}
                              suggestion={suggestion}
                              onClick={() => handleSendMessage(suggestion)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      enhancedMessages.map((message) => (
                        <EnhancedMessage
                          key={message.id}
                          message={message}
                          config={aiElements.config}
                          onAction={aiElements.executeAction}
                          onReaction={(emoji) => {
                            // Handle message reactions
                            console.log('Reaction:', emoji, 'for message:', message.id);
                          }}
                          className="mb-4"
                        />
                      ))
                    )}

                    {/* Loading state */}
                    {isLoading && (
                      <div className="flex justify-center py-4">
                        <Loader />
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-border bg-card safe-area-inset-bottom">
                  <div className="flex items-center gap-2 p-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <PromptInput
                        onSubmit={async (message, event) => {
                          event.preventDefault()
                          if (message.text) {
                            await handleSendMessage(message.text)
                          }
                        }}
                      >
                        <PromptInputBody>
                          <PromptInputTextarea
                            value={getInputDisplayValue()}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={getPlaceholder()}
                            disabled={isLoading || isListening}
                            ref={inputRef}
                          />
                        </PromptInputBody>
                      </PromptInput>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
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
    </>
  );
}

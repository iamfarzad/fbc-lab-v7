"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Monitor, X, MessageCircle } from "lucide-react";

// Core chat components - clean imports
import { ChatContainer } from "./components/ChatContainer";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";

// Hooks - extracted logic
import { useChatState } from "./hooks/useChatState";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatAudio } from "./hooks/useChatAudio";
import { useChatIntelligence } from "./hooks/useChatIntelligence";

// Constants - centralized configuration
import { CHAT_CONSTANTS } from "./constants/chatConstants";

// Utils
import { useAIElements } from "@/hooks/useAIElements";
import { MeetingOverlay } from "@/components/meeting/MeetingOverlay";
import { AIDevtools } from "@ai-sdk-tools/devtools";

// Main chat interface - clean and structured
export function ChatInterface({ id }: { id?: string | null }) {
  // Extract state management to hooks
  const chatStateHook = useChatState();
  const messagesHook = useChatMessages();
  const audioHook = useChatAudio();
  const intelligenceHook = useChatIntelligence(id);

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

  // Meeting overlay state
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);

  // Handle opening meeting booking
  const openMeeting = useCallback(() => {
    setIsMeetingOpen(true);
  }, []);

  // Main render - clean and organized
  return (
    <ErrorBoundary>
      {/* Chat Toggle Button */}
      <motion.div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={chatStateHook.toggleChat}
          data-chat-trigger
          aria-label={chatStateHook.chatState.isOpen ? "Close chat" : "Open chat"}
          aria-expanded={chatStateHook.chatState.isOpen}
          className="h-12 w-12 sm:h-14 sm:w-14 bg-black text-white hover:bg-gray-800 shadow-lg relative"
        >
          {chatStateHook.chatState.isOpen ? (
            <X className={CHAT_CONSTANTS.ICONS.MEDIUM} aria-hidden="true" />
          ) : (
            <>
              <MessageCircle className={CHAT_CONSTANTS.ICONS.MEDIUM} />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#FF6B35]"></div>
              <span className="sr-only">Unread messages</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Main Chat Interface */}
      <ChatContainer chatState={chatStateHook.chatState}>
        {chatStateHook.chatState.isMinimized ? (
          /* Minimized State */
          <motion.div
            className="h-full flex items-center justify-between px-4 cursor-pointer"
            onClick={chatStateHook.toggleMinimize}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              <span className="text-sm truncate font-mono">
                F.B/c AI
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                chatStateHook.toggleChat();
              }}
              className="h-6 w-6 p-0 transition-colors"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : (
          /* Full Chat Interface */
          <div className={`flex flex-col h-full ${chatStateHook.chatState.isExpanded ? 'max-w-4xl w-full' : ''}`}>
            {/* Header */}
            <ChatHeader
              chatState={chatStateHook.chatState}
              onToggleMinimize={chatStateHook.toggleMinimize}
              onToggleExpand={chatStateHook.toggleExpand}
              onToggleChat={chatStateHook.toggleChat}
              onOpenMeeting={openMeeting}
              currentContext={intelligenceHook.currentContext}
            />

            {/* Video/Screen Area for expanded mode */}
            {chatStateHook.chatState.isExpanded && (chatStateHook.chatState.isCameraActive || chatStateHook.chatState.isScreenSharing) && (
              <div className="relative">
                {chatStateHook.chatState.isCameraActive ? (
                  <div className="relative h-64 sm:h-80 border-b border-border bg-muted/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                        <span className="text-sm text-muted-foreground font-mono">
                          CAMERA ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                ) : chatStateHook.chatState.isScreenSharing ? (
                  <div className="relative h-64 sm:h-80 bg-muted/20 border-b border-border">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Monitor className="h-12 w-12 text-muted-foreground mx-auto" />
                        <span className="text-sm text-muted-foreground font-mono">
                          SCREEN SHARING
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Enhanced Research Status Indicator */}
            {intelligenceHook.sessionId && (
              <div className={`px-4 py-2 ${CHAT_CONSTANTS.COLORS.SUCCESS} border-b border-green-200 dark:border-green-800`}>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Enhanced Research Active</span>
                  <Badge variant="secondary" className="text-xs">
                    Auto-grounding + URL context
                  </Badge>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <ChatMessages
              messages={messagesHook.messages}
              enhancedMessages={messagesHook.enhancedMessages}
              researchSummaries={messagesHook.researchSummaries}
              isLoading={messagesHook.isLoading}
              contextReady={intelligenceHook.contextReady}
              currentContext={intelligenceHook.currentContext}
              hasAcceptedTerms={intelligenceHook.hasAcceptedTerms}
              onSendMessage={messagesHook.handleSendMessage}
              onOpenMeeting={openMeeting}
              sessionId={messagesHook.sessionId || intelligenceHook.sessionId || ''}
              onExportSummary={messagesHook.handleExportSummary}
              aiElements={aiElements}
            />

            {/* Input Area */}
            <ChatInput
              inputValue={messagesHook.inputValue}
              isLoading={messagesHook.isLoading}
              isListening={chatStateHook.chatState.isListening}
              voiceTranscript={audioHook.voiceTranscript}
              voicePartialTranscript={audioHook.voicePartialTranscript}
              voiceError={audioHook.voiceError}
              cameraState={chatStateHook.chatState.isCameraActive}
              isScreenSharing={chatStateHook.chatState.isScreenSharing}
              onInputChange={messagesHook.setInputValue}
              onSendMessage={messagesHook.handleSendMessage}
              onToggleVoice={audioHook.toggleVoice}
              onToggleCamera={() => chatStateHook.setCameraActive(!chatStateHook.chatState.isCameraActive)}
              onToggleScreenShare={chatStateHook.toggleScreenShare}
              onToggleSettings={chatStateHook.toggleSettings}
            />
          </div>
        )}
      </ChatContainer>

      {/* Meeting Overlay */}
      <MeetingOverlay
        open={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
      />

      {/* AI SDK Devtools - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <AIDevtools
          config={{
            streamCapture: {
              enabled: true,
              endpoint: '/api/chat/unified',
              autoConnect: true
            }
          }}
        />
      )}
    </ErrorBoundary>
  );
}

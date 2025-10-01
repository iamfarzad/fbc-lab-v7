import React from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";
import { EnhancedMessage } from "@/components/ai-elements/enhanced-message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { MessageCircle, FileText } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  enhancedMessages: EnhancedChatMessage[];
  isLoading: boolean;
  contextReady: boolean;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
  hasAcceptedTerms: boolean;
  onSendMessage: (message: string) => void;
  onOpenMeeting: () => void;
  onExportSummary: (sessionId: string) => void;
  aiElements: any;
}

export function ChatMessages({
  messages,
  enhancedMessages,
  isLoading,
  contextReady,
  currentContext,
  hasAcceptedTerms,
  onSendMessage,
  onOpenMeeting,
  onExportSummary,
  aiElements,
}: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-hidden relative">
      <Conversation className="h-full">
        <ConversationContent className="px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <ConversationEmptyState
                title={`Welcome to F.B/c AI${contextReady && currentContext?.person?.fullName ? `, ${currentContext.person.fullName}` : ''}`}
                description={contextReady
                  ? `I'm here to help you navigate AI strategy and implementation. Based on your ${currentContext?.company?.name || 'organization'}, I can provide tailored guidance.`
                  : 'Gathering company intelligence tailored to you...'}
                icon={<MessageCircle className="h-6 w-6 text-muted-foreground" />}
              />

              {/* Show suggestions only after terms acceptance */}
              {hasAcceptedTerms && (
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    What would you like to explore today?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {contextReady && currentContext?.person?.role && (
                      <button
                        onClick={() => onSendMessage(`As ${currentContext.person.role} at ${currentContext.company?.name}, what AI strategy would you recommend?`)}
                        className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                      >
                        🤖 AI strategy for {currentContext.person.role}s
                      </button>
                    )}
                    <button
                      onClick={() => onSendMessage('What AI consulting services do you offer?')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      💼 Consulting services overview
                    </button>
                    <button
                      onClick={() => onSendMessage('Tell me about your workshops')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      🎓 Workshop and training options
                    </button>
                    <button
                      onClick={() => onSendMessage('How can AI help my business?')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      🚀 AI implementation guidance
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                <div className="flex gap-2">
                  <Button onClick={onOpenMeeting} className="sm:self-start">
                    Schedule a call
                  </Button>
                  <Button
                    onClick={() => onExportSummary('')} // Pass session ID from props
                    variant="outline"
                    className="sm:self-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Summary
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          )}

          <div id="messages-end" />
        </ConversationContent>
        <ConversationScrollButton className="shadow-md" />
      </Conversation>
    </div>
  );
}

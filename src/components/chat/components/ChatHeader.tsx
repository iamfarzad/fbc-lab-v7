import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatState } from "../types/chatTypes";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import {
  Minimize2,
  Expand,
  Shrink,
  X,
  Settings,
} from "lucide-react";

interface ChatHeaderProps {
  chatState: ChatState;
  onToggleMinimize: () => void;
  onToggleExpand: () => void;
  onToggleChat: () => void;
  onOpenMeeting: () => void;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
}

export function ChatHeader({
  chatState,
  onToggleMinimize,
  onToggleExpand,
  onToggleChat,
  onOpenMeeting,
  currentContext
}: ChatHeaderProps) {
  return (
    <div className={`${
      chatState.isExpanded ? 'pt-10 sm:pt-16' : 'pt-4'
    } pb-4 px-4 sm:px-6 border-b border-border/60 bg-card/95 flex items-center justify-between backdrop-blur ${
      chatState.isExpanded ? 'safe-area-inset-top' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-xs font-medium text-primary font-mono">
          F•B
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold font-mono">F.B/c Assistant</p>
          <p className="text-xs text-muted-foreground font-sans">
            Strategic AI guidance tailored to your session
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Button
          variant="secondary"
          size="sm"
          className="hidden sm:inline-flex h-8 px-3 font-medium hover-scale focus-ring-offset interactive"
          onClick={onOpenMeeting}
          aria-label="Book a strategy call"
        >
          Book a call
        </Button>

        <div className="flex items-center gap-1">
          {!chatState.isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-6 w-6 p-0 touch-manipulation transition-colors hover-scale focus-ring-offset interactive"
              title="Expand chat interface"
              aria-label="Expand chat"
            >
              <Expand className={CHAT_CONSTANTS.ICONS.SMALL} aria-hidden="true" />
            </Button>
          )}

          {chatState.isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-8 w-8 sm:h-6 sm:w-6 p-0 touch-manipulation transition-colors hover-scale focus-ring-offset interactive"
              title="Exit fullscreen mode"
              aria-label="Exit fullscreen"
            >
              <Shrink className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation transition-colors hover-scale focus-ring-offset interactive`}
            title="Minimize chat"
            aria-label="Minimize chat"
          >
            <Minimize2 className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleChat}
            className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation transition-colors hover-scale focus-ring-offset interactive`}
            title="Close chat"
            aria-label="Close chat"
          >
            <X className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}




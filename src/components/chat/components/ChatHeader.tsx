import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatState } from "../types/chatTypes";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import {
  Minimize2,
  Expand,
  Shrink,
  X,
} from "lucide-react";
interface ChatHeaderProps {
  chatState: ChatState;
  onToggleMinimize: () => void;
  onToggleExpand: () => void;
  onToggleChat: () => void;
}

export function ChatHeader({
  chatState,
  onToggleMinimize,
  onToggleExpand,
  onToggleChat
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        chatState.isExpanded
          ? "safe-area-inset-top px-8 sm:px-12 pt-12 sm:pt-16 pb-6"
          : chatState.isMinimized
          ? "px-4 sm:px-6 py-3 border-b border-border/40 bg-card"
          : "px-5 py-4 border-b border-border/40 bg-card"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[11px] font-semibold tracking-[0.3em] text-[hsl(var(--background))]",
          chatState.isMinimized ? "h-7 w-7" : "h-9 w-9"
        )}>
          F•B
        </div>
        <div className={cn(
          "space-y-1",
          chatState.isMinimized && "hidden sm:block"
        )}>
          <p className="text-sm font-semibold tracking-[0.28em] uppercase text-foreground/80">
            F.B/c Assistant
          </p>
          {!chatState.isMinimized && (
            <p className="text-xs text-muted-foreground/80 max-w-[16rem] leading-relaxed">
              Strategic AI guidance, tailored to your current session.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-1">
          {!chatState.isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className={`h-6 w-6 p-0 touch-manipulation transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
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
              className={`h-8 w-8 sm:h-6 sm:w-6 p-0 touch-manipulation transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
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
            className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
            title="Minimize chat"
            aria-label="Minimize chat"
          >
            <Minimize2 className={`${chatState.isExpanded ? 'h-4 w-4 sm:h-3 sm:w-3' : 'h-3 w-3'}`} aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleChat}
            className={`${chatState.isExpanded ? 'h-8 w-8 sm:h-6 sm:w-6' : 'h-6 w-6'} p-0 touch-manipulation transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.FOCUS_RING} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
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

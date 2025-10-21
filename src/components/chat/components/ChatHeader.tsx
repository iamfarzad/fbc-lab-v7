import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatState } from "../types/chatTypes";
import { StatusIndicator } from "./StatusIndicator";
import { BackendPill } from "./BackendPill";
import { COLORS } from "../design-tokens";
import { NextStepsMenu } from "../NextStepsMenu";
import {
  Minimize2,
  Expand,
  Shrink,
  X,
  Menu,
  Subtitles,
  Monitor
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { LiveStatusBadge } from './LiveStatusBadge'
import type { LiveClientWS } from '@/core/live/client'
interface ChatHeaderProps {
  chatState: ChatState;
  onToggleMinimize: () => void;
  onToggleExpand: () => void;
  onToggleChat: () => void;
  sessionId?: string;
  showNextSteps?: boolean;
  isVoiceActive?: boolean;
  showTranscript?: boolean;
  onToggleTranscript?: () => void;
  onOpenMedia?: () => void;
  backend?: {
    voiceConnected: boolean;
    voiceActive: boolean;
    voiceError?: string | null;
    sseReady: boolean;
    sseStreaming: boolean;
    sseError?: string | null;
  };
  liveClient?: LiveClientWS;
  onRunDiagnostics?: () => void;
}

export function ChatHeader({
  chatState,
  onToggleMinimize,
  onToggleExpand,
  onToggleChat,
  sessionId,
  showNextSteps = false,
  isVoiceActive = false,
  showTranscript = false,
  onToggleTranscript,
  onOpenMedia,
  backend,
  onRunDiagnostics,
  liveClient
}: ChatHeaderProps) {
  return (
    <>
      {/* Mobile header - minimal design */}
      <div
        className={cn(
          "flex items-center justify-between",
          // Mobile: minimal header with safe area
          "px-4 py-3 safe-area-inset-top border-b border-border/20",
          // Desktop: show full header
          "md:px-5 md:py-4 md:border-b md:border-border/40",
          // Hide in monochrome
          "[.monochrome_&]:hidden"
        )}
      >
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[11px] font-semibold tracking-[0.3em] text-[hsl(var(--background))]",
            "h-8 w-8" // Consistent size on mobile
          )}>
            F•B
          </div>
          
          {/* Desktop: Show full branding */}
          <div className="hidden md:block space-y-1">
            <p className="text-sm font-semibold tracking-[0.28em] uppercase font-mono">
              <span className="text-foreground/80">F.B/</span><span className={COLORS.ORANGE.text}>c</span> <span className="text-foreground/80">Assistant</span>
            </p>
            {!chatState.isMinimized && (
              <p className="text-xs text-muted-foreground/80 max-w-[16rem] leading-relaxed">
                Strategic AI guidance, tailored to your current session.
              </p>
            )}
          </div>
          
          {/* Mobile: Just show title */}
          <div className="md:hidden">
            <p className="text-sm font-semibold tracking-wide font-mono">
              <span className="text-foreground">F.B/</span><span className={COLORS.ORANGE.text}>c</span>
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
                  {/* Mobile live status */}
                  {liveClient && (
                    <div className="md:hidden mr-1">
                      {/* dot only on mobile to save space */}
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                    </div>
                  )}
                  {/* Mobile: Menu, expand/minimize, and close */}
                  <div className="flex items-center gap-1 md:hidden">
                    {showNextSteps && sessionId && (
                      <NextStepsMenu sessionId={sessionId} show={showNextSteps} />
                    )}
                    {/* Media button (mobile opens drawer via ChatInput ref) */}
                    {onOpenMedia && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onOpenMedia}
                              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
                              aria-label="Open media panel"
                            >
                              <Monitor className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Open media panel</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Transcript toggle button - only show when voice is active */}
                    {isVoiceActive && onToggleTranscript && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleTranscript}
                        className={cn(
                          "h-8 w-8 p-0 touch-manipulation transition-colors",
                          showTranscript 
                            ? "bg-blue-600/20 text-blue-400" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Toggle transcript"
                        aria-label="Toggle transcript"
                      >
                        <Subtitles className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 touch-manipulation"
                      aria-label="Menu"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                    
                    {!chatState.isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleExpand}
                        className="h-8 w-8 p-0 touch-manipulation"
                        title="Expand chat interface"
                        aria-label="Expand chat"
                      >
                        <Expand className="h-4 w-4" />
                      </Button>
                    )}

                    {chatState.isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleExpand}
                        className="h-8 w-8 p-0 touch-manipulation"
                        title="Exit fullscreen mode"
                        aria-label="Exit fullscreen"
                      >
                        <Shrink className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleMinimize}
                      className="h-8 w-8 p-0 touch-manipulation"
                      title="Minimize chat"
                      aria-label="Minimize chat"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleChat}
                      className="h-8 w-8 p-0 touch-manipulation"
                      title="Close chat"
                      aria-label="Close chat"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

          {/* Desktop: Full controls */}
          <div className="hidden md:flex items-center gap-1">
            {showNextSteps && sessionId && (
              <NextStepsMenu sessionId={sessionId} show={showNextSteps} />
            )}
            
            {/* Transcript toggle button - only show when voice is active */}
            {isVoiceActive && onToggleTranscript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTranscript}
                className={cn(
                  "h-6 w-6 p-0 touch-manipulation transition-colors",
                  showTranscript 
                    ? "bg-blue-600/20 text-blue-400" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Toggle transcript"
                aria-label="Toggle transcript"
              >
                <Subtitles className="h-3 w-3" />
              </Button>
            )}
            
            {!chatState.isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 touch-manipulation transition-colors"
                title="Expand chat interface"
                aria-label="Expand chat"
              >
                <Expand className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            {chatState.isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 touch-manipulation transition-colors"
                title="Exit fullscreen mode"
                aria-label="Exit fullscreen"
              >
                <Shrink className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimize}
              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 touch-manipulation transition-colors"
              title="Minimize chat"
              aria-label="Minimize chat"
            >
              <Minimize2 className="h-3 w-3" aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleChat}
              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 touch-manipulation transition-colors"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>

          {/* Status indicator - only on desktop for now */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Media button (desktop opens side panel) */}
            {onOpenMedia && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onOpenMedia}
                      className="h-6 w-6 p-0 touch-manipulation transition-colors"
                      aria-label="Open media panel"
                    >
                      <Monitor className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Open media panel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {backend && (
              <BackendPill
                voice={{ connected: backend.voiceConnected, active: backend.voiceActive, error: backend.voiceError }}
                sse={{ ready: backend.sseReady, streaming: backend.sseStreaming, error: backend.sseError }}
                className="ml-1"
              />
            )}
            {liveClient && (
              <LiveStatusBadge client={liveClient} className="ml-2" />
            )}
            {process.env.NODE_ENV !== 'production' && onRunDiagnostics && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[11px]"
                onClick={onRunDiagnostics}
                aria-label="Run voice diagnostics"
                title="Run voice diagnostics"
              >
                Diagnostics
              </Button>
            )}
            <StatusIndicator />
          </div>
        </div>
      </div>

      {/* Terminal header - only in monochrome */}
      <div
        className={cn(
          "hidden [.monochrome_&]:flex items-center justify-between px-4 py-2 border-b-2 border-border bg-transparent"
        )}
      >
        <div className="flex items-center gap-2">
          {/* macOS-style dots */}
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            F.B/<span className="text-[#ff5b04]">c</span> AI Terminal - user@fbc:~/consulting
          </span>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-1">
          {!chatState.isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-6 w-6 p-0"
              title="Expand"
            >
              <Expand className="h-3 w-3" />
            </Button>
          )}
          {chatState.isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-6 w-6 p-0"
              title="Exit fullscreen"
            >
              <Shrink className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="h-6 w-6 p-0"
            title="Minimize"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleChat}
            className="h-6 w-6 p-0"
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatState } from "../types/chatTypes";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { StatusIndicator } from "./StatusIndicator";
import {
  Minimize2,
  Expand,
  Shrink,
  X,
  Menu,
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
            <p className="text-sm font-semibold tracking-[0.28em] uppercase text-foreground/80">
              F.B/c Assistant
            </p>
            {!chatState.isMinimized && (
              <p className="text-xs text-muted-foreground/80 max-w-[16rem] leading-relaxed">
                Strategic AI guidance, tailored to your current session.
              </p>
            )}
          </div>
          
          {/* Mobile: Just show title */}
          <div className="md:hidden">
            <p className="text-sm font-semibold tracking-wide text-foreground">
              AI Consultant
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
                  {/* Mobile: Menu, expand/minimize, and close */}
                  <div className="flex items-center gap-1 md:hidden">
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
            {!chatState.isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-6 w-6 p-0 touch-manipulation transition-colors"
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
                className="h-6 w-6 p-0 touch-manipulation transition-colors"
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
              className="h-6 w-6 p-0 touch-manipulation transition-colors"
              title="Minimize chat"
              aria-label="Minimize chat"
            >
              <Minimize2 className="h-3 w-3" aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleChat}
              className="h-6 w-6 p-0 touch-manipulation transition-colors"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>

          {/* Status indicator - only on desktop for now */}
          <div className="hidden lg:block">
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
            F.B/c AI Terminal - user@fbc:~/consulting
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

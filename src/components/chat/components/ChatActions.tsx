"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, Download, Image as ImageIcon, Paperclip, Plus } from "lucide-react";

import { PromptInputButton } from "@/components/ai-elements/interactive/prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MediaToggle } from "@/components/ui/media-toggle";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet, BottomSheetListItem } from "./BottomSheet";
import { VISUAL } from "../design-tokens";

interface MediaToggleConfig {
  isActive: boolean;
  isProcessing?: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

interface ChatActionsProps {
  onScheduleCall?: () => void;
  onExportSummary?: () => void;
  canExportSummary?: boolean;
  onUploadFiles?: () => void;
  onUploadImages?: () => void;
  voice: MediaToggleConfig;
  camera: MediaToggleConfig;
  screen: MediaToggleConfig;
  className?: string;
  disabled?: boolean;
  analyticsId?: string;
}

export function ChatActions({
  onScheduleCall,
  onExportSummary,
  canExportSummary = true,
  onUploadFiles,
  onUploadImages,
  voice,
  camera,
  screen,
  className,
  disabled = false,
  analyticsId,
}: ChatActionsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile(768);

  const closeAll = useCallback(() => {
    setPopoverOpen(false);
    setSheetOpen(false);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setPopoverOpen(false);
    } else {
      setSheetOpen(false);
    }
  }, [isMobile]);

  const triggerProps = {
    className: cn(
      "flex items-center justify-center border border-border/40 bg-muted transition-all duration-150 hover:scale-105 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40",
      "h-11 w-11 min-h-[44px] min-w-[44px] shadow-sm",
      VISUAL.CORNER_RADIUS,
      "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
      className
    ),
    "aria-label": "Actions, Tools & Media",
    title: "Actions, Tools & Media",
    "data-analytics-id": analyticsId,
    disabled,
  } as const;

  const actionButtonClass = cn(
    "flex items-start gap-3 min-h-[44px] px-2 py-2 text-left transition-colors duration-150 hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed",
    VISUAL.CORNER_RADIUS
  );

  const createHandler = useCallback(
    (handler?: () => void) => () => {
      closeAll();
      handler?.();
    },
    [closeAll]
  );

  const actionButtons = (
    <div className="flex flex-col">
      <button
        className={actionButtonClass}
        onClick={createHandler(onScheduleCall)}
        disabled={!onScheduleCall}
      >
        <Calendar className="h-5 w-5 text-[hsl(var(--accent))]" />
        <span>
          <div className="text-sm font-medium">Schedule a call</div>
          <div className="text-xs text-muted-foreground">Book a consultation session</div>
        </span>
      </button>
      <button
        className={actionButtonClass}
        onClick={createHandler(onExportSummary)}
        disabled={!canExportSummary || !onExportSummary}
      >
        <Download className="h-5 w-5 text-[hsl(var(--accent))]" />
        <span>
          <div className="text-sm font-medium">Export summary</div>
          <div className="text-xs text-muted-foreground">Download conversation summary</div>
        </span>
      </button>

      <div className="my-1 h-px bg-border/30" />

      <button
        className={actionButtonClass}
        onClick={createHandler(onUploadFiles)}
        disabled={!onUploadFiles}
      >
        <Paperclip className="h-5 w-5 text-muted-foreground" />
        <span>
          <div className="text-sm font-medium">Upload files</div>
          <div className="text-xs text-muted-foreground">Attach documents or PDFs</div>
        </span>
      </button>
      <button
        className={actionButtonClass}
        onClick={createHandler(onUploadImages)}
        disabled={!onUploadImages}
      >
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
        <span>
          <div className="text-sm font-medium">Upload images</div>
          <div className="text-xs text-muted-foreground">Share photos or screenshots</div>
        </span>
      </button>

      <div className="my-1 h-px bg-border/30" />

      <MediaToggle
        type="voice"
        variant="list"
        isActive={voice.isActive}
        isProcessing={voice.isProcessing}
        disabled={voice.disabled}
        onClick={createHandler(voice.onToggle)}
      />
      <MediaToggle
        type="camera"
        variant="list"
        isActive={camera.isActive}
        isProcessing={camera.isProcessing}
        disabled={camera.disabled}
        onClick={createHandler(camera.onToggle)}
      />
      <MediaToggle
        type="screen"
        variant="list"
        isActive={screen.isActive}
        isProcessing={screen.isProcessing}
        disabled={screen.disabled}
        onClick={createHandler(screen.onToggle)}
      />
    </div>
  );

  return (
    <>
      <Popover
        open={!isMobile && popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <PopoverTrigger asChild>
          <PromptInputButton
            variant="ghost"
            className={triggerProps.className}
            aria-label={triggerProps["aria-label"]}
            title={triggerProps.title}
            data-analytics-id={triggerProps["data-analytics-id"]}
            disabled={triggerProps.disabled}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
                return;
              }
              if (isMobile) {
                event.preventDefault();
                setSheetOpen(true);
                return;
              }
              setPopoverOpen((prev) => !prev);
            }}
          >
            <Plus className="h-4 w-4 text-foreground/70" aria-hidden="true" />
          </PromptInputButton>
        </PopoverTrigger>
        <PopoverContent className={cn("w-72 p-1 space-y-1", VISUAL.CORNER_RADIUS)}>
          {actionButtons}
        </PopoverContent>
      </Popover>

      <BottomSheet
        isOpen={sheetOpen && isMobile}
        onClose={() => setSheetOpen(false)}
        title="Actions & Tools"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <BottomSheetListItem
              icon={<Calendar className="h-5 w-5 text-primary" />}
              label="Schedule a call"
              description="Book a consultation session"
              onClick={createHandler(onScheduleCall)}
              disabled={!onScheduleCall}
            />
            <BottomSheetListItem
              icon={<Download className="h-5 w-5 text-primary" />}
              label="Export summary"
              description="Download conversation summary"
              onClick={createHandler(onExportSummary)}
              disabled={!canExportSummary || !onExportSummary}
            />
          </div>

          <div className="space-y-2">
            <BottomSheetListItem
              icon={<Paperclip className="h-5 w-5 text-accent" />}
              label="Upload files"
              description="Attach documents or PDFs"
              onClick={createHandler(onUploadFiles)}
              disabled={!onUploadFiles}
            />
            <BottomSheetListItem
              icon={<ImageIcon className="h-5 w-5 text-accent" />}
              label="Upload images"
              description="Share photos or screenshots"
              onClick={createHandler(onUploadImages)}
              disabled={!onUploadImages}
            />
          </div>

          <div className="space-y-2">
            <MediaToggle
              type="voice"
              variant="list"
              className="px-3 py-3"
              isActive={voice.isActive}
              isProcessing={voice.isProcessing}
              disabled={voice.disabled}
              onClick={createHandler(voice.onToggle)}
            />
            <MediaToggle
              type="camera"
              variant="list"
              className="px-3 py-3"
              isActive={camera.isActive}
              isProcessing={camera.isProcessing}
              disabled={camera.disabled}
              onClick={createHandler(camera.onToggle)}
            />
            <MediaToggle
              type="screen"
              variant="list"
              className="px-3 py-3"
              isActive={screen.isActive}
              isProcessing={screen.isProcessing}
              disabled={screen.disabled}
              onClick={createHandler(screen.onToggle)}
            />
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

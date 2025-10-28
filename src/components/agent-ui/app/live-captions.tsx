"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useLiveApi } from "@/hooks/useLiveApi";

export function LiveCaptions({ className }: { className?: string }) {
  const live = useLiveApi();

  const userText = live.partialTranscript?.trim()
    ? live.partialTranscript
    : live.transcript?.trim() || "";
  const assistantText = live.outputTranscript?.trim?.() || "";

  if (!userText && !assistantText) return null;

  return (
    <div className={cn("pointer-events-none w-full", className)}>
      <div className="mx-auto max-w-2xl space-y-1 px-2">
        {userText && (
          <div className="bg-primary/10 text-primary border-primary/30 pointer-events-auto inline-block max-w-full rounded-md border text-[12px]">
            <div className="px-2 py-1">
              <span className="font-medium mr-1">You:</span>
              <span className="opacity-90">{userText}</span>
            </div>
          </div>
        )}
        {assistantText && (
          <div className="bg-muted/60 text-foreground/90 border-muted/50 pointer-events-auto inline-block max-w-full rounded-md border text-[12px]">
            <div className="px-2 py-1">
              <span className="font-medium mr-1">Assistant:</span>
              <span className="opacity-90">{assistantText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

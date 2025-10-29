"use client";

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
    <div className={cn("pointer-events-none w-full z-10", className)}>
      <div className="mx-auto max-w-2xl space-y-2 px-2">
        {userText && (
          <div className="bg-primary text-primary-foreground shadow-lg pointer-events-auto inline-block max-w-full rounded-lg border-2 border-primary/50 px-3 py-1.5 text-sm font-medium">
            <span className="mr-2 opacity-80">You:</span>
            <span>{userText}</span>
          </div>
        )}
        {assistantText && (
          <div className="bg-card text-foreground shadow-lg border-2 border-foreground/20 pointer-events-auto inline-block max-w-full rounded-lg px-3 py-1.5 text-sm font-medium">
            <span className="mr-2 opacity-80">Assistant:</span>
            <span>{assistantText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

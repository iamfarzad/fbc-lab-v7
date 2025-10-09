import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VISUAL } from "../design-tokens";

interface ChatSuggestionsProps {
  suggestions: string[];
  contextReady: boolean;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
  onSendMessage: (message: string) => Promise<void> | void;
}

export function ChatSuggestions({
  suggestions,
  contextReady,
  currentContext,
  onSendMessage,
}: ChatSuggestionsProps) {
  const enhancedSuggestions = contextReady && currentContext?.person?.role
    ? [
        `As ${currentContext.person.role} at ${currentContext.company?.name || "my company"}, what AI strategy would you recommend?`,
        ...suggestions,
      ]
    : suggestions;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground text-center">
        Start with a prompt
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {enhancedSuggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => onSendMessage(suggestion)}
            className={cn(
              "min-h-[44px] px-5 py-2.5 text-xs font-medium tracking-wide",
              VISUAL.CORNER_RADIUS,
              "border border-border/40 bg-card/90",
              "shadow-sm hover:shadow-md",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-border/60",
              "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2",
              "active:translate-y-0 active:scale-[0.98]",
              "[.monochrome_&]:rounded-none [.monochrome_&]:font-mono",
              "[.monochrome_&]:shadow-none [.monochrome_&]:hover:translate-y-0",
              "[.monochrome_&]:hover:border-foreground"
            )}
          >
            <span className="hidden [.monochrome_&]:inline mr-1">$</span>
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

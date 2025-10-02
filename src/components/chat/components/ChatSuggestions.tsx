import React from "react";
interface ChatSuggestionsProps {
  suggestions: string[];
  contextReady: boolean;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
  onSendMessage: (message: string) => void;
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
    <div className="w-full max-w-xl mx-auto">
      <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground text-center mb-6">
        Start with a prompt
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {enhancedSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSendMessage(suggestion)}
            className="rounded-full border border-border/40 bg-card/90 px-5 py-2.5 text-xs font-medium tracking-wide text-foreground/80 shadow-[0_12px_32px_-20px_rgba(12,18,26,0.35)] transition-transform duration-200 hover:-translate-y-1 hover:text-foreground hover:shadow-[0_24px_60px_-32px_rgba(12,18,26,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/40 focus-visible:ring-offset-2"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

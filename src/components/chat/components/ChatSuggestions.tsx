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
  return (
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
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSendMessage(suggestion)}
            className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}



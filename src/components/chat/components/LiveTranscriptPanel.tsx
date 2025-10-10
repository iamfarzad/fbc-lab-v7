'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TranscriptEntry {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  isPartial?: boolean;
  timestamp: number;
}

interface LiveTranscriptPanelProps {
  isVisible: boolean;
  transcripts: TranscriptEntry[];
  className?: string;
}

export function LiveTranscriptPanel({ 
  isVisible, 
  transcripts, 
  className 
}: LiveTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (scrollRef.current && isVisible) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none",
      "md:fixed md:bottom-4 md:right-4 md:top-auto md:left-auto md:w-96 md:h-80",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className="w-full max-w-lg bg-black/85 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium text-sm">Live Transcript</span>
          </div>
          <div className="text-xs text-white/60">
            {transcripts.length} messages
          </div>
        </div>

        {/* Transcript Content */}
        <div 
          ref={scrollRef}
          className="h-48 md:h-60 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {transcripts.length === 0 ? (
            <div className="text-center text-white/40 text-sm py-8">
              Waiting for conversation...
            </div>
          ) : (
            transcripts.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex flex-col space-y-1 animate-in slide-in-from-bottom-2 duration-300",
                  entry.type === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span className="font-medium">
                    {entry.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    entry.type === 'user' 
                      ? cn(
                          "bg-blue-600/80 text-white",
                          entry.isPartial && "bg-blue-600/40 italic"
                        )
                      : "bg-white/10 text-white border border-white/20"
                  )}
                >
                  {entry.text}
                  {entry.isPartial && (
                    <span className="inline-block w-2 h-4 bg-white/60 animate-pulse ml-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-center text-xs text-white/40">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

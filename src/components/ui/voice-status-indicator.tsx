"use client";

import { cn } from "@/lib/utils";
import { LiveWaveform } from "./live-waveform";

export interface VoiceStatusIndicatorProps {
  isActive: boolean;
  isProcessing: boolean;
  className?: string;
}

export function VoiceStatusIndicator({
  isActive,
  isProcessing,
  className,
}: VoiceStatusIndicatorProps) {
  const showWaveform = isActive || isProcessing;
  const statusText = isProcessing ? 'Processing' : 'Recording';

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5",
        "rounded-full border backdrop-blur-sm shadow-sm",
        "transition-all duration-300 ease-out",
        "border-accent/30 bg-accent/10 text-accent",
        className
      )}
      aria-live="polite"
    >
      {/* Combined Waveform + Status Dot */}
      <div className="flex items-center gap-1.5">
        {/* Status Dot */}
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        
        {/* Mini Waveform */}
        {showWaveform && (
          <div className="h-3 w-8">
            <LiveWaveform
              active={isActive}
              processing={isProcessing}
              height={12}
              barWidth={1.5}
              barGap={0.5}
              barRadius={0.75}
              mode="static"
              className="h-full w-full"
            />
          </div>
        )}
      </div>
      
      {/* Status Text */}
      <span className="text-[10px] font-medium">
        {statusText}
      </span>
    </div>
  );
}

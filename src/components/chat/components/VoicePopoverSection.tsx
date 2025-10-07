import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { VISUAL } from '../design-tokens';

// Sound Wave Component
const SoundWave = ({ 
  isRecording, 
  isProcessing, 
  volume = 0.5 
}: { 
  isRecording: boolean; 
  isProcessing: boolean; 
  volume?: number; 
}) => {
  const bars = Array.from({ length: 8 }, (_, i) => {
    const height = isRecording ? Math.random() * 16 + 4 : 4;
    const delay = i * 0.1;
    
    return (
      <div
        key={i}
        className="bg-current w-1 rounded-full transition-all duration-200"
        style={{ 
          height: `${height}px`,
          opacity: isRecording ? 0.8 : 0.3,
          animationDelay: `${delay}s`
        }}
      />
    );
  });

  return (
    <div className="flex items-center gap-1 h-6">
      {bars}
      {isProcessing && (
        <div className="ml-2 text-xs text-muted-foreground animate-pulse">
          Processing...
        </div>
      )}
    </div>
  );
};

interface VoicePopoverSectionProps {
  isActive: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  isMuted: boolean;
  transcript?: string;
  partialTranscript?: string;
  error?: string | null;
  onToggle: () => void;
  onMute?: () => void;
  onSettings?: () => void;
}

export function VoicePopoverSection({
  isActive,
  isProcessing,
  isSupported,
  isMuted,
  transcript,
  partialTranscript,
  error,
  onToggle,
  onMute,
  onSettings
}: VoicePopoverSectionProps) {
  const displayText = partialTranscript || transcript || '';
  
  if (!isSupported) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MicOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Voice</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Not Supported
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
          Voice recording is not supported in this browser yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          <span className="text-sm font-medium">🎤 Voice</span>
          {isActive && (
            <Badge variant="secondary" className="text-xs">
              {isProcessing ? "Processing" : "Recording"}
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          className="h-7 px-3"
        >
          {isActive ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Sound Wave Visualization */}
      {isActive && (
        <div className="flex justify-center py-2">
          <SoundWave 
            isRecording={isActive} 
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Live Transcript */}
      {isActive && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            Live Transcript
          </div>
          <div className="bg-muted/50 rounded p-3 text-sm min-h-[60px] max-h-[100px] overflow-y-auto">
            {displayText ? (
              <span className="text-foreground">
                {displayText}
                {isActive && !isProcessing && (
                  <span className="animate-pulse">█</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground italic">
                {isProcessing ? "Processing..." : "Listening..."}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {isActive && (
        <div className="flex gap-2">
          {onMute && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onMute}
              className="flex items-center gap-1 h-7 px-2"
            >
              {isMuted ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
          )}
          {onSettings && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onSettings}
              className="flex items-center gap-1 h-7 px-2"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          )}
        </div>
      )}

      {/* Instructions when inactive */}
      {!isActive && !error && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          Click "Start" to begin voice recording. Speak clearly and the transcript will appear here.
        </div>
      )}
    </div>
  );
}

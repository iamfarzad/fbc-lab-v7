"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { fbcPatterns } from '@/lib/elevenlabs-patterns'
import type { VoiceState as OrbVoiceState } from '@/lib/orb-patterns'

export type Frame = number[][]
export type VoiceState = OrbVoiceState

interface MatrixProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  cols?: number;
  pattern?: Frame;
  frames?: Frame[];
  fps?: number;
  autoplay?: boolean;
  loop?: boolean;
  size?: number;
  gap?: number;
  palette?: { on: string; off: string };
  brightness?: number;
  ariaLabel?: string;
  onFrame?: (frame: number) => void;
  mode?: 'default' | 'vu' | 'voice-state';
  levels?: number[];
  voiceState?: VoiceState;
  audioData?: Uint8Array;
}

export const digits: Frame[] = [
  // 0
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 1
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  // 2
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  // 3
  [
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  // 4
  [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  // 5
  [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  // 6
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 7
  [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  // 8
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  // 9
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
];

export const loader: Frame[] = [
  // Frame 1 - top
  [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 2 - top-right
  [
    [0, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 3 - right-top
  [
    [0, 0, 0, 0, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 4 - right
  [
    [0, 0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 5 - right-bottom
  [
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 6 - bottom-right
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1],
  ],
  // Frame 7 - bottom
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0],
  ],
  // Frame 8 - bottom-left
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0],
  ],
  // Frame 9 - left-bottom
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0],
  ],
  // Frame 10 - left
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 11 - left-top
  [
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 12 - top-left
  [
    [1, 1, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
];

export const pulse: Frame[] = [
  // Frame 1 - center dot
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 2 - small cross
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Frame 3 - small diamond
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Add more frames expanding to full grid and fading
  // Total 16 frames
  ...Array(13).fill([
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ]).map((frame: number[][], index: number) => frame.map((row: number[]) => row.map((cell: number) => cell * (1 - index / 13)))), // Fade out
];

export const wave: Frame[] = [
  // Example wave frames - implement full 24
  [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ],
  // Add 23 more...
  ...Array(23).fill([
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ]),
];

export const snake: Frame[] = [
  // Example snake - implement full ~40
  [
    [1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Add more frames moving the '1' in snake pattern
  ...Array(39).fill([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]),
];

export const chevronLeft: Frame = [
  [0, 1, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0],
];

export const chevronRight: Frame = [
  [0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 1, 0],
];

export function vu(cols: number, levels: number[], rows: number = 7): Frame {
  const frame: Frame = Array(rows).fill(null).map(() => Array(cols).fill(0));
  
  levels.forEach((level, col) => {
    const height = Math.round(level * rows);
    for (let row = rows - 1; row >= rows - height; row--) {
      frame[row][col] = 1;
    }
  });
  
  return frame;
}


export const Matrix = React.forwardRef<HTMLDivElement, MatrixProps>(({
  rows,
  cols,
  pattern,
  frames,
  fps = 12,
  autoplay = true,
  loop = true,
  size = 4,
  gap = 1,
  palette = { on: 'hsl(var(--primary))', off: 'hsl(var(--muted))' },
  brightness = 1,
  ariaLabel = 'Matrix display',
  onFrame,
  mode = 'default',
  levels,
  className,
  voiceState,  // Destructure to prevent spreading to DOM
  audioData,   // Destructure to prevent spreading to DOM
  ...props
}, ref) => {
  const [currentFrame, setCurrentFrame] = React.useState(0);

  React.useEffect(() => {
    if (!frames || frames.length <= 1 || !autoplay) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (onFrame) onFrame(next);
          return loop ? 0 : prev;
        }
        if (onFrame) onFrame(next);
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames, fps, loop, autoplay, onFrame]);

const matrix = React.useMemo(() => {
  if (mode === 'voice-state') {
    const processLevels = (data: Uint8Array | undefined): number[] => {
      if (!data || !cols) return Array(cols ?? 7).fill(0);
      
      // Intelligently map frequency bins to columns
      // With fftSize 512, we have 256 frequency bins
      // Map to 64 columns by averaging chunks (4 bins per column average)
      const binsPerColumn = Math.max(1, Math.floor(data.length / cols));
      
      return Array(cols).fill(0).map((_, colIndex) => {
        const startIdx = colIndex * binsPerColumn;
        const endIdx = Math.min(startIdx + binsPerColumn, data.length);
        
        // Average the frequency bins in this chunk for smoother visualization
        let sum = 0;
        for (let i = startIdx; i < endIdx; i++) {
          sum += data[i] ?? 0;
        }
        const avg = sum / (endIdx - startIdx);
        
        return avg / 255; // Normalize to 0-1 range
      });
    };
    const levelsData = processLevels(audioData);

    let selectedFrames: Frame[] | undefined;
    switch (voiceState) {
      case 'connecting':
        selectedFrames = loader;
        break;
      case 'initializing':
        selectedFrames = pulse;
        break;
      case 'listening':
        return vu(cols ?? 7, levelsData, rows ?? 7);
      case 'speaking':
        selectedFrames = wave;
        break;
      case 'thinking':
        selectedFrames = snake;
        break;
      case 'idle':
        selectedFrames = Object.values(fbcPatterns).map(p => p as Frame);
        break;
    }
    if (selectedFrames) {
      return selectedFrames[currentFrame % selectedFrames.length];
    }
    return Array(rows ?? 7).fill(Array(cols ?? 7).fill(0));
  }
  if (mode === 'vu' && levels) {
    return vu(cols ?? 7, levels, rows ?? 7);
  }
  if (frames && frames.length > 1) {
    return frames[currentFrame];
  }
  return pattern || Array(rows ?? 7).fill(Array(cols ?? 7).fill(0));
}, [mode, voiceState, audioData, cols, rows, currentFrame, frames, pattern, levels, fbcPatterns]);

return (
  <div 
    ref={ref} 
    role="img" 
    className={cn('flex flex-wrap items-center justify-center', className)} 
    style={{ 
      gap, 
      width: (cols ?? 7) * (size + gap) - gap,
      maxWidth: '100%',
    }} 
    {...props} 
    aria-label={ariaLabel}
  >
    {matrix.map((rowData: number[], row: number) => (
      <div key={`matrix-row-${row}`} className="flex" style={{ gap }}>
        {rowData.map((value: number, col: number) => (
          <div
            key={`matrix-cell-${row}-${col}`}
            style={{
              width: size,
              height: size,
              backgroundColor: value > 0 ? palette.on : palette.off,
              opacity: value * brightness,
            }}
            className="rounded-full"
          />
        ))}
      </div>
    ))}
  </div>
);
});

Matrix.displayName = 'Matrix';

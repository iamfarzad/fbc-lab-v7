import type { Frame } from '@/components/ui/matrix'

export const fbcPatterns = {
  letterF: [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,1,1,1,1,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
  ] as Frame,
  
  letterB: [
    [1,1,1,1,1,0,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,1,1,1,1,0,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,0,0,0,0,1,0],
    [1,1,1,1,1,0,0],
  ] as Frame,
  
  letterSlash: [
    [0,0,0,0,0,0,1],
    [0,0,0,0,0,1,0],
    [0,0,0,0,1,0,0],
    [0,0,0,0,1,0,0],
    [0,0,0,1,0,0,0],
    [0,0,1,0,0,0,0],
    [0,0,1,0,0,0,0],
    [0,1,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
  ] as Frame,
  
  letterC: [
    [0,1,1,1,1,1,0],
    [1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,1],
    [0,1,1,1,1,1,0],
  ] as Frame,
}

// Animated entrance sequence for hero section
export const fbcAnimatedEntrance = {
  // Letters appear one by one with pulse effect
  // Background matrices fade in with wave
  letterSequence: ['letterF', 'letterB', 'letterSlash', 'letterC'] as const,
  animationDelays: [0, 200, 400, 600], // ms
}

// Color palettes for different themes
export const fbcPalettes = {
  default: {
    primary: "hsl(var(--primary))",
    orange: "#FF6B35"
  },
  terminal: {
    primary: "hsl(142 76% 36%)", // Phosphor green
    orange: "hsl(38 92% 50%)" // Amber
  },
  dark: {
    primary: "hsl(var(--primary))",
    orange: "#FF6B35"
  }
} as const

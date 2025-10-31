export type VoiceState = 'idle' | 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking'

export interface PatternContext {
  /** Current voice state */
  state: VoiceState
  /** X distance from center */
  dx: number
  /** Y distance from center */
  dy: number
  /** Distance from center */
  dist: number
  /** Angle in radians */
  angle: number
  /** Time value for animation */
  time: number
  /** Audio levels array (120 bins for speaking state) */
  audioLevels?: number[]
}

/**
 * Generate connecting pattern: spinning radar sweep
 */
export function generateConnectingPattern(ctx: PatternContext): number {
  const sweep = (ctx.angle + Math.PI) / (Math.PI * 2)
  const rotation = (ctx.time * 0.5) % 1
  const sweepDist = Math.min(Math.abs(sweep - rotation), 1 - Math.abs(sweep - rotation))
  
  if (sweepDist < 0.1) {
    return Math.max(0, 1 - ctx.dist / 30) * (1 - sweepDist / 0.1)
  }
  return 0
}

/**
 * Generate initializing pattern: spiral emergence
 */
export function generateInitializingPattern(ctx: PatternContext): number {
  const spiralAngle = ctx.angle + ctx.dist * 0.3 - ctx.time * 0.3
  const spiralWave = Math.sin(spiralAngle * 3) * 0.5 + 0.5
  
  if (ctx.dist < 35) {
    return spiralWave * (1 - ctx.dist / 35) * 0.7
  }
  return 0
}

/**
 * Generate listening pattern: breathing circles with concentric ripples
 */
export function generateListeningPattern(ctx: PatternContext): number {
  const ripple = Math.sin(ctx.dist * 0.25 - ctx.time * 0.8) * 0.4 + 0.5
  const pulse = Math.sin(ctx.time * 0.6) * 0.2 + 0.4
  
  if (ctx.dist < 35) {
    return ripple * pulse * (1 - ctx.dist / 40) * 0.7
  }
  return 0
}

/**
 * Generate speaking pattern: audio-reactive radial bursts
 * Falls back to time-based animation when no audio available
 */
export function generateSpeakingPattern(ctx: PatternContext): number {
  // Fallback to time-based pattern when no audio levels available
  // (Output audio is not accessible, so we use animated pattern)
  const hasAudioLevels = ctx.audioLevels && ctx.audioLevels.length > 0
  const level = hasAudioLevels
    ? (() => {
        const audioCol = Math.floor(((ctx.angle + Math.PI) / (Math.PI * 2)) * 120) % 120
        return ctx.audioLevels![audioCol] || 0
      })()
    : 0.5 // Default level for time-based animation
  
  const burst = Math.sin(ctx.dist * 0.3 - ctx.time * 1.5 + level * 4) * 0.4 + 0.5
  
  // Segment the orb into 16 sections
  const segments = 16
  const segAngle = ((ctx.angle + Math.PI) % (Math.PI * 2 / segments)) * segments
  const segIntensity = Math.sin(segAngle * segments / 2) * 0.25 + 0.65
  
  if (ctx.dist < 30 && ctx.dist > 5) {
    return burst * segIntensity * (0.4 + level * 0.6) * 0.8
  }
  return 0
}

/**
 * Generate thinking pattern: slow rotating mandala
 */
export function generateThinkingPattern(ctx: PatternContext): number {
  const petals = 8
  const petal = Math.sin(ctx.angle * petals + ctx.time * 0.3) * 0.5 + 0.5
  const rings = Math.sin(ctx.dist * 0.5 - ctx.time * 0.2) * 0.5 + 0.5
  
  if (ctx.dist < 30) {
    return petal * rings * (1 - ctx.dist / 35) * 0.6
  }
  return 0
}

/**
 * Generate idle pattern: minimal static circle
 */
export function generateIdlePattern(ctx: PatternContext): number {
  if (Math.abs(ctx.dist - 15) < 1) {
    return 0.3
  }
  return 0
}

/**
 * Generate intensity for a given state and position
 * 
 * @param context - Pattern context with state, position, and audio data
 * @returns Intensity value (0 to 1)
 */
export function getStateIntensity(context: PatternContext): number {
  switch (context.state) {
    case 'connecting':
      return generateConnectingPattern(context)
    case 'initializing':
      return generateInitializingPattern(context)
    case 'listening':
      return generateListeningPattern(context)
    case 'speaking':
      return generateSpeakingPattern(context)
    case 'thinking':
      return generateThinkingPattern(context)
    case 'idle':
      return generateIdlePattern(context)
    default:
      return 0
  }
}


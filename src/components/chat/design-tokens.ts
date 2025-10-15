/**
 * Unified Chat Design Tokens
 * Single source of truth for all chat component styling
 * Based on original F.B/c brand design
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLORS = {
  // Orange Accent (F.B/c Brand) - Tailwind orange-500
  ORANGE: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    border: 'border-orange-500',
    bgLight: 'bg-orange-500/10',
    borderLight: 'border-orange-500/20',
  },

  // User Messages
  USER_MESSAGE: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
  },

  // Assistant Messages
  ASSISTANT_MESSAGE: {
    bg: 'bg-muted/50',
    text: 'text-foreground',
  },

  // Container
  CONTAINER: {
    bg: 'bg-background',
    border: 'border-border',
  },

  // Buttons
  BUTTON_PRIMARY: 'bg-primary text-primary-foreground hover:bg-primary/90',
  BUTTON_GHOST: 'hover:bg-accent',

  // Monochrome Theme Colors (from globals.css)
  MONOCHROME: {
    // Light variant
    light: {
      background: 'bg-[hsl(0,0%,98%)]',
      foreground: 'text-[hsl(0,0%,8%)]',
      card: 'bg-[hsl(0,0%,95%)]',
      muted: 'bg-[hsl(0,0%,88%)]',
      mutedForeground: 'text-[hsl(0,0%,40%)]',
      border: 'border-[hsl(0,0%,85%)]',
    },
    // Dark variant
    dark: {
      background: 'bg-[hsl(0,0%,4%)]',
      foreground: 'text-[hsl(0,0%,94%)]',
      card: 'bg-[hsl(0,0%,8%)]',
      muted: 'bg-[hsl(0,0%,16%)]',
      mutedForeground: 'text-[hsl(0,0%,65%)]',
      border: 'border-[hsl(0,0%,16%)]',
    },
  },
} as const

// ============================================================================
// TYPOGRAPHY - Use with inline style prop
// ============================================================================

export const fontStyle = {
  display: { fontFamily: 'var(--font-display)' },  // Space Grotesk
  sans: { fontFamily: 'var(--font-sans)' },        // Inter
  mono: { fontFamily: 'var(--font-mono)' },        // JetBrains Mono
  serif: { fontFamily: 'var(--font-serif)' },      // Crimson Text
} as const

export const textSize = {
  xs: { fontSize: '0.75rem' },
  sm: { fontSize: '0.875rem' },
  base: { fontSize: '1rem' },
  lg: { fontSize: '1.125rem' },
} as const

// Font weights (especially for monochrome themes)
export const fontWeight = {
  light: { fontWeight: 300 },
  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  bold: { fontWeight: 700 },
} as const

// ============================================================================
// SPACING
// ============================================================================

export const SPACING = {
  MESSAGE_MAX_WIDTH: 'max-w-[75%]',
  PADDING_CONTAINER: 'p-3',
  PADDING_MESSAGE: 'px-3 py-1.5',
  GAP_DEFAULT: 'gap-1.5',
  GAP_MESSAGE: 'py-1.5',
  SECTION: 'space-y-4',
  DENSE: 'space-y-2',
  MINIMAL: 'space-y-1',
} as const

// ============================================================================
// VISUAL ELEMENTS
// ============================================================================

export const VISUAL = {
  SHADOW_CHAT: 'shadow-2xl',
  SHADOW_MESSAGE: 'shadow-sm',
  BORDER_DEFAULT: 'border border-border',
  BORDER_MUTED: 'border-muted',
  CORNER_RADIUS: 'rounded-md',  // Default - matches sharp aesthetic
  CORNER_RADIUS_TERMINAL: 'rounded-none',  // Sharp terminal edges (no rounding)
} as const

// ============================================================================
// SIZES
// ============================================================================

export const SIZES = {
  TOGGLE_BUTTON: 'h-14 w-14',
  HEADER_BUTTON: 'h-8 w-8',
  INPUT_HEIGHT: 'h-10',
  AVATAR_SMALL: 'size-6',
  AVATAR_MEDIUM: 'size-8',
  ICON_TINY: 'h-2.5 w-2.5',
  ICON_SMALL: 'h-3 w-3',
  ICON_MEDIUM: 'h-3.5 w-3.5',
  ICON_DEFAULT: 'h-4 w-4',
  ICON_LARGE: 'h-6 w-6',
} as const

// ============================================================================
// ANIMATIONS
// ============================================================================

export const ANIMATION = {
  FADE: 'transition-all duration-300',
  HOVER_SCALE: 'hover:scale-105',
  PULSE: 'animate-pulse',
} as const

// ============================================================================
// STATES
// ============================================================================

export const STATES = {
  ACTIVE_BUTTON: 'bg-orange-500 text-white',
  INACTIVE_BUTTON: 'variant="outline"',
  LOADING_INDICATOR: 'bg-orange-500 animate-pulse',
} as const

// ============================================================================
// PRE-BUILT STYLE HELPERS
// ============================================================================

export const chatStyles = {
  // Common patterns - minimal design
  orangeDot: 'h-2 w-2 bg-primary animate-pulse rounded-full',
  activeBadge: 'text-primary border-primary',
  userBubble: `${SPACING.MESSAGE_MAX_WIDTH} ${COLORS.USER_MESSAGE.bg} ${COLORS.USER_MESSAGE.text} ${SPACING.PADDING_MESSAGE}`,
  assistantBubble: `${SPACING.MESSAGE_MAX_WIDTH} ${COLORS.ASSISTANT_MESSAGE.bg} ${SPACING.PADDING_MESSAGE}`,
  headerLogo: 'w-5 h-5 bg-primary/10 flex items-center justify-center border border-primary/20',
  inputField: `${SIZES.INPUT_HEIGHT} border-muted focus:border-primary transition-colors`,
  
  // Monochrome-specific helpers (Terminal Aesthetic)
  monochrome: {
    grain: 'relative before:content-[""] before:fixed before:inset-0 before:pointer-events-none before:bg-dotted before:opacity-22 before:z-[-1]',
    textDisplay: 'text-display font-bold tracking-tight font-mono',
    textBody: 'text-body tracking-wide font-mono',
    textCode: 'text-code font-medium tracking-wide font-mono',
    
    // Terminal-specific styling
    terminal: {
      prompt: 'font-mono text-sm tracking-wide',
      command: 'font-mono text-xs bg-[hsl(0,0%,8%)] text-[hsl(0,0%,85%)] px-3 py-2 rounded border border-[hsl(0,0%,20%)]',
      output: 'font-mono text-xs text-[hsl(0,0%,65%)] leading-relaxed',
      cursor: 'inline-block w-2 h-4 bg-current animate-pulse ml-1',
      grid: 'bg-[repeating-linear-gradient(0deg,hsl(0,0%,85%)_0px,hsl(0,0%,85%)_1px,transparent_1px,transparent_12px),repeating-linear-gradient(90deg,hsl(0,0%,85%)_0px,hsl(0,0%,85%)_1px,transparent_1px,transparent_12px)] bg-[length:12px_12px]',
    },
  },
} as const

// ============================================================================
// COMPLETE DESIGN SYSTEM EXPORT
// ============================================================================

export const CHAT_DESIGN = {
  COLORS,
  SPACING,
  VISUAL,
  SIZES,
  ANIMATION,
  STATES,
} as const

// Default export for convenience
export default CHAT_DESIGN

// ---------------------------------------------------------------------------
// Backwards-compat convenience: DESIGN_TOKENS-style API used by some components
// Centralize here so we have a single source of truth for token values.
// ---------------------------------------------------------------------------
export const DESIGN_TOKENS = {
  touchTarget: {
    min: 'min-h-[44px] min-w-[44px]',
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  },
  spacing: {
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4',
    desktop: 'px-8 py-6',
  },
  typography: {
    disclaimer: 'text-[10px]',
    body: 'text-sm',
    heading: 'text-lg font-semibold',
    display: 'text-4xl font-bold',
  },
  borders: {
    default: 'border border-border/40',
    strong: 'border-2 border-border',
    monochrome: '[.monochrome_&]:border-2',
  },
  corners: {
    default: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
    none: '[.monochrome_&]:rounded-none',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-[0_24px_60px_-40px_rgba(12,18,26,0.45)]',
    lg: 'shadow-[0_20px_60px_rgba(0,0,0,0.3)]',
    none: '[.monochrome_&]:shadow-none',
  },
  safeArea: {
    top: 'pt-safe-area-inset-top',
    bottom: 'pb-safe-area-inset-bottom',
    both: 'pt-safe-area-inset-top pb-safe-area-inset-bottom',
  },
  animations: {
    pulse: 'animate-pulse',
    spin: 'animate-spin',
    slideUp: 'transition-transform duration-300',
    fade: 'transition-opacity duration-200',
  },
} as const

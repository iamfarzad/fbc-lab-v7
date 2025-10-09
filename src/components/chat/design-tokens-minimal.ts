/**
 * Minimal Design Tokens for AI Elements
 * Based on AI SDK + ElevenLabs UI patterns
 * NO hardcoded values - all use CSS custom properties
 */

// Typography tokens using design tokens
export const TEXT_SIZE = {
  TINY: 'text-[10px]',
  MICRO: 'text-[11px]',
  SMALL: 'text-xs',
  MEDIUM: 'text-[13px]',
  BASE: 'text-sm',
  LARGE: 'text-base',
} as const

// Spacing tokens - minimal approach
export const SPACING_MINIMAL = {
  ELEMENT_GAP: 'gap-1',
  ELEMENT_GAP_LOOSE: 'gap-1.5',
  ELEMENT_GAP_MEDIUM: 'gap-2',
  MESSAGE_VERTICAL: 'py-1.5',
  MESSAGE_HORIZONTAL: 'px-3',
  COMPONENT_MARGIN: 'mb-2',
  SECTION_SPACING: 'space-y-2',
  SECTION_SPACING_LOOSE: 'space-y-4',
} as const

// Icon sizing - smaller for minimal design
export const ICON_SIZE = {
  TINY: 'size-2.5',
  SMALL: 'size-3',
  MEDIUM: 'size-3.5',
  DEFAULT: 'size-4',
  LARGE: 'size-5',
} as const

// Border and visual styling - subtle
export const VISUAL_MINIMAL = {
  BORDER_SUBTLE: 'border-border/50',
  BORDER_STRONG: 'border-border',
  BACKGROUND_SUBTLE: 'bg-muted/30',
  BACKGROUND_MEDIUM: 'bg-muted/50',
  BACKGROUND_CARD: 'bg-card',
  RADIUS_SMALL: 'rounded',
  RADIUS_MEDIUM: 'rounded-md',
  RADIUS_LARGE: 'rounded-lg',
  RADIUS_FULL: 'rounded-2xl',
} as const

// Message layout - flat design
export const MESSAGE_LAYOUT = {
  CONTAINER: 'group flex w-full items-start gap-1.5 py-1.5',
  USER: 'is-user justify-end',
  ASSISTANT: 'is-assistant justify-start',
  CONTENT_MAX_WIDTH: 'max-w-[75%]',
  CONTENT_PADDING: 'px-3 py-2',
  CONTENT_GAP: 'gap-2',
  AVATAR: 'size-6 ring-0',
  AVATAR_TEXT: 'text-[10px] text-muted-foreground',
} as const

// Code block styling - minimal
export const CODE_BLOCK = {
  CONTAINER: 'relative w-full overflow-hidden rounded-md border border-border/50 bg-muted/30',
  HEADER: 'flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/20',
  LANGUAGE: 'text-[10px] text-muted-foreground uppercase font-mono',
  CODE_PADDING: 'p-2',
  CODE_SIZE: 'text-[11px]',
  BUTTON_SIZE: 'h-5 w-5',
  BUTTON_ICON: 'size-2.5',
} as const

// Interactive elements - minimal
export const INTERACTIVE = {
  BUTTON_GHOST: 'hover:bg-accent hover:text-accent-foreground',
  BUTTON_SIZE_SMALL: 'h-6 w-6',
  BUTTON_SIZE_MEDIUM: 'h-8 w-8',
  TRANSITION_FAST: 'transition-colors duration-200',
  TRANSITION_SMOOTH: 'transition-all duration-300',
} as const

// Badge styling - subtle
export const BADGE = {
  SIZE_SMALL: 'text-[10px] h-4 px-1.5',
  SIZE_MEDIUM: 'text-xs px-2 py-0.5',
  SUCCESS: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  ERROR: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  WARNING: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  INFO: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  NEUTRAL: 'bg-muted text-muted-foreground',
} as const

// Complete minimal design export
export const MINIMAL_DESIGN = {
  TEXT_SIZE,
  SPACING_MINIMAL,
  ICON_SIZE,
  VISUAL_MINIMAL,
  MESSAGE_LAYOUT,
  CODE_BLOCK,
  INTERACTIVE,
  BADGE,
} as const

export default MINIMAL_DESIGN


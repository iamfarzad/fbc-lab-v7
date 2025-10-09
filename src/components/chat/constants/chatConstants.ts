// Chat interface constants - centralized configuration
import { CHAT_DESIGN, chatStyles } from '../design-tokens';

export const CHAT_CONSTANTS = {
  // Default suggestions for new users
  DEFAULT_SUGGESTIONS: [
    "What AI consulting services do you offer?",
    "Tell me about your workshops",
    "How can AI help my business?",
    "What's your implementation process?",
    "Do you offer custom AI solutions?",
    "Schedule a strategy call"
  ],

  // Keywords that trigger meeting booking
  MEETING_KEYWORDS: [
    "book",
    "schedule",
    "meeting",
    "call",
    "consultation",
    "strategy call",
    "calendar",
    "cal.com",
    "calendly"
  ],

  // Audio processing constants
  AUDIO: {
    TARGET_VOICE_SAMPLE_RATE: 16000, // Align with Gemini Live API PCM expectations
    VAD_SILENCE_TIMEOUT: 2500,
  },

  // Animation durations - using design tokens
  ANIMATION: {
    FADE_IN: 0.3, // Updated to match CHAT_DESIGN.ANIMATION.FADE duration
    SLIDE_IN: 0.3, // Updated to match CHAT_DESIGN.ANIMATION.FADE duration
    BOUNCE: 0.5,
  },

  // UI dimensions - Grok-inspired sizing
  UI: {
    CHAT_WIDTH: {
      NORMAL: "w-[420px] sm:w-[480px]",
      EXPANDED: "max-w-4xl w-full",
      MINIMIZED: "w-80 sm:w-96",
    },
    CHAT_HEIGHT: {
      NORMAL: "h-[75vh] sm:h-[650px] max-h-[650px]",
      EXPANDED: "h-screen",
      MINIMIZED: "h-20 sm:h-24",
    },
  },

  // Colors and themes (following reference design)
  COLORS: {
    PRIMARY: "bg-primary text-primary-foreground",
    ACCENT: "bg-accent text-accent-foreground",
    MUTED: "bg-muted text-muted-foreground",
    SUCCESS: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    ERROR: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    // Monochrome design system colors
    GUNMETAL: "bg-[hsl(var(--foreground))] text-[hsl(var(--muted))]",
    SILVER: "bg-muted text-[hsl(var(--foreground))]",
    GREY: "bg-[hsl(var(--muted-foreground))] text-[hsl(var(--muted))]",
    LIGHT_GREY: "bg-muted text-[hsl(var(--foreground))]",
    DARK_GREY: "bg-[hsl(var(--muted-foreground))] text-[hsl(var(--muted))]",
  },

  // Design system styling classes
  STYLING: {
    // Container styles
    CONTAINER: "rounded-[32px] bg-card border border-border/40 shadow-[0_24px_80px_-60px_rgba(12,18,26,0.45)] overflow-hidden [.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2",
    CARD: "rounded-[28px] bg-card border border-border/30 shadow-[0_28px_80px_-60px_rgba(12,18,26,0.35)]",
    GLASS: "bg-card/80 backdrop-blur border border-border/30",
    
    // Button styles
    BUTTON_PRIMARY: "btn btn-primary",
    BUTTON_SECONDARY: "btn btn-secondary", 
    BUTTON_GHOST: "btn btn-ghost",
    
    // Message styles
    MESSAGE_USER: "message-bubble message-user",
    MESSAGE_ASSISTANT: "message-bubble message-assistant",
    
    // Interactive states
    HOVER_LIFT: "hover-lift",
    HOVER_SCALE: "hover-scale",
    FOCUS_RING: "focus-ring",
    INTERACTIVE: "interactive",
    
    // Typography
    FONT_MONO: "font-mono",
    FONT_SANS: "font-sans",
    FONT_DISPLAY: "font-display",
  },

  // Icons sizing - using design tokens
  ICONS: {
    SMALL: CHAT_DESIGN.SIZES.ICON_SMALL,
    MEDIUM: CHAT_DESIGN.SIZES.ICON_MEDIUM,
    LARGE: CHAT_DESIGN.SIZES.ICON_LARGE,
  },
} as const;

// Re-export for backward compatibility
export const {
  DEFAULT_SUGGESTIONS,
  MEETING_KEYWORDS,
} = CHAT_CONSTANTS;

export const TARGET_VOICE_SAMPLE_RATE = CHAT_CONSTANTS.AUDIO.TARGET_VOICE_SAMPLE_RATE;

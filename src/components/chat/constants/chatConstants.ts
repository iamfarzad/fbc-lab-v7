// Chat interface constants - centralized configuration
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
    TARGET_VOICE_SAMPLE_RATE: 16000,
    VAD_SILENCE_TIMEOUT: 2500,
  },

  // Animation durations
  ANIMATION: {
    FADE_IN: 0.2,
    SLIDE_IN: 0.3,
    BOUNCE: 0.5,
  },

  // UI dimensions
  UI: {
    CHAT_WIDTH: {
      NORMAL: "w-96",
      EXPANDED: "max-w-4xl w-full",
      MINIMIZED: "w-72 sm:w-80",
    },
    CHAT_HEIGHT: {
      NORMAL: "h-[70vh] sm:h-[600px] max-h-[600px]",
      EXPANDED: "h-screen",
      MINIMIZED: "h-12",
    },
  },

  // Colors and themes (following reference design)
  COLORS: {
    PRIMARY: "bg-primary text-primary-foreground",
    ACCENT: "bg-accent text-accent-foreground",
    MUTED: "bg-muted text-muted-foreground",
    SUCCESS: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    ERROR: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  },

  // Icons sizing
  ICONS: {
    SMALL: "h-3 w-3 sm:h-4 sm:w-4",
    MEDIUM: "h-4 w-4 sm:h-5 sm:w-5",
    LARGE: "h-5 w-5 sm:h-6 sm:w-6",
  },
} as const;

// Re-export for backward compatibility
export const {
  DEFAULT_SUGGESTIONS,
  MEETING_KEYWORDS,
  TARGET_VOICE_SAMPLE_RATE,
} = CHAT_CONSTANTS;


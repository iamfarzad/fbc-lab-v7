/**
 * CENTRALIZED CONFIGURATION
 * DO NOT HARDCODE THESE VALUES ANYWHERE ELSE
 * 
 * All WebSocket URLs, model names, and other configuration values
 * must be imported from this file.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeWebsocketUrl = (
  rawValue: string | undefined,
  {
    fallback,
    enforceSecure = false,
  }: {
    fallback: string
    enforceSecure?: boolean
  }
) => {
  if (!rawValue) {
    return trimTrailingSlash(fallback)
  }

  try {
    const trimmed = rawValue.trim()
    const hasScheme = /^[a-z]+:\/\//i.test(trimmed)
    const baseProtocol = enforceSecure ? 'wss://' : 'ws://'
    const candidate = hasScheme ? trimmed : `${baseProtocol}${trimmed}`
    const url = new URL(candidate)

    if (url.protocol === 'http:') url.protocol = 'ws:'
    if (url.protocol === 'https:') url.protocol = 'wss:'
    if (enforceSecure && url.protocol !== 'wss:') {
      url.protocol = 'wss:'
    }

    const hostname = url.hostname.toLowerCase()
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localdomain')

    if (!isLocalHost && url.protocol === 'wss:') {
      if (url.port && url.port !== '443') {
        console.warn(
          `[WEBSOCKET_CONFIG] Stripping unsupported secure port "${url.port}" from ${url.hostname}`
        )
        url.port = ''
      }
    }

    return trimTrailingSlash(url.toString())
  } catch (error) {
    console.warn(
      '[WEBSOCKET_CONFIG] Invalid WebSocket URL provided; falling back to default',
      error
    )
    return trimTrailingSlash(fallback)
  }
}

// WebSocket Configuration
const IS_PROD = process.env.NODE_ENV === 'production'
export const WEBSOCKET_CONFIG = {
  // Distinct envs for prod vs dev to avoid accidental overrides
  PRODUCTION_URL: normalizeWebsocketUrl(process.env.NEXT_PUBLIC_LIVE_SERVER_URL, {
    fallback: 'wss://fb-consulting-websocket.fly.dev',
    enforceSecure: true,
  }),
  DEVELOPMENT_URL: normalizeWebsocketUrl(process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL, {
    fallback: 'ws://localhost:3001',
  }),
  get URL() {
    if (IS_PROD) return this.PRODUCTION_URL
    // Prefer explicit dev URL when present
    if (process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL) return this.DEVELOPMENT_URL
    // Derive from current host in the browser for local networks
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      const isSecure = window.location.protocol === 'https:'
      const protocol = isSecure ? 'wss' : 'ws'
      // WebSocket server runs on 3001, NOT the same port as Next.js (3000)
      const port = process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_PORT ?? '3001'
      const portSuffix = port ? `:${port}` : ''
      return `${protocol}://${host}${portSuffix}`
    }
    return this.DEVELOPMENT_URL
  },
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
} as const

// Gemini Model Names
export const GEMINI_MODELS = {
  // NEW: Google's latest models (auto-update to newest)
  FLASH_LATEST: 'gemini-flash-latest',              // Auto-updates to latest Flash
  FLASH_LITE_LATEST: 'gemini-flash-lite-latest',    // Auto-updates to latest Lite
  
  // NEW: Specific versions (predictable behavior)
  FLASH_2025_09: 'gemini-2.5-flash-preview-09-2025',
  FLASH_LITE_2025_09: 'gemini-2.5-flash-lite-preview-09-2025',
  AUDIO_2025_09: 'gemini-2.5-flash-native-audio-preview-09-2025',
  
  // LEGACY: For backward compatibility (deprecated models)
  PRO: 'gemini-2.5-pro',
  FLASH_LEGACY: 'gemini-2.5-flash',                 // Deprecated Dec 9, 2025
  FLASH_EXP: 'gemini-2.0-flash-exp',                // Old experimental
  
  // DEFAULTS: What each use case should use
  DEFAULT_CHAT: 'gemini-flash-latest',               // Auto-updates to best
  DEFAULT_VOICE: 'gemini-2.5-flash', // Stable GA model for Live API
  DEFAULT_MULTIMODAL: 'gemini-flash-latest',         // Best for images/video
  DEFAULT_WEBCAM: 'gemini-flash-latest',             // Webcam analysis
  DEFAULT_SCREEN: 'gemini-flash-latest',             // Screen capture
  DEFAULT_FAST: 'gemini-flash-lite-latest',          // When speed matters
  DEFAULT_RELIABLE: 'gemini-2.5-flash-preview-09-2025', // When predictability matters
} as const

// Gemini API Endpoints
export const GEMINI_ENDPOINTS = {
  LIVE_API: 'generativelanguage.googleapis.com/v1beta/models',
  STANDARD_API: 'generativelanguage.googleapis.com/v1/models',
  STREAMING_API: 'generativelanguage.googleapis.com/v1beta/models',
} as const

// Embedding Models
export const EMBEDDING_MODELS = {
  DEFAULT: 'gemini-embedding-001',
  GEMINI_001: 'gemini-embedding-001',
} as const

// Gemini Live API Configuration
export const LIVE_API_CONFIG = {
  // Use sendRealtimeInput(), NOT session.send()
  METHOD_NAME: 'sendRealtimeInput',
  AUDIO_ENCODING: 'pcm_s16le',
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
} as const

// Type safety
export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS]
export type GeminiEndpoint = typeof GEMINI_ENDPOINTS[keyof typeof GEMINI_ENDPOINTS]

// API Rate Limits
export const RATE_LIMITS = {
  WEBCAM_CAPTURE_INTERVAL: 2000, // 2 seconds
  SCREEN_CAPTURE_INTERVAL: 2000, // 2 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const

// Context Configuration
export const CONTEXT_CONFIG = {
  REDIS_TTL: 3600, // 1 hour for active sessions
  ARCHIVE_ON_DISCONNECT: true,
  AUTO_GENERATE_PDF: true,
  MIN_MESSAGES_FOR_ARCHIVE: 3, // Don't archive test conversations
  SUMMARIZE_THRESHOLD: 50, // Summarize every 50 messages
} as const

// Security Configuration
export const SECURITY_CONFIG = {
  ENABLE_PII_DETECTION: process.env.NODE_ENV === 'production',
  ENABLE_PII_REDACTION: process.env.NODE_ENV === 'production',
  ENABLE_AUDIT_LOGGING: true,
  DATA_RETENTION_DAYS: 90, // GDPR compliance
  ENABLE_ENCRYPTION_AT_REST: true, // For Supabase
} as const

// Session Configuration
export const SESSION_CONFIG = {
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  WARNING_THRESHOLD: 25 * 60 * 1000, // 25 minutes
  HEARTBEAT_INTERVAL: 60 * 1000, // 1 minute
} as const

// Audio Configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  CHUNK_SIZE: 4096,
  NOISE_GATE_THRESHOLD: -50, // dB
} as const

// Security / CORS
export const ALLOWED_ORIGINS = (
  process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ||
  [
    'https://fbcai.com',
    'https://farzadbayat.com',
    'https://www.farzadbayat.com',
    'https://fb-c-lab-v2.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Third-party API endpoints
export const EXTERNAL_ENDPOINTS = {
  RESEND_EMAIL: process.env.NEXT_PUBLIC_RESEND_API_ENDPOINT || 'https://api.resend.com/emails',
  PERPLEXITY_CHAT_COMPLETIONS:
    process.env.NEXT_PUBLIC_PERPLEXITY_API_ENDPOINT || 'https://api.perplexity.ai/chat/completions',
} as const

// Contact details & scheduling configuration
const schedulingUsername = process.env.NEXT_PUBLIC_SCHEDULING_USERNAME || 'farzad-bayat'
const schedulingEvent = process.env.NEXT_PUBLIC_SCHEDULING_EVENT || '30min'
const schedulingBaseUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SCHEDULING_BASE_URL || 'https://cal.com',
)
const schedulingEmbedBaseUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SCHEDULING_EMBED_BASE_URL || 'https://app.cal.com',
)
const schedulingEmbedScript =
  process.env.NEXT_PUBLIC_SCHEDULING_EMBED_SCRIPT || 'https://app.cal.com/embed/embed.js'

export const CONTACT_CONFIG = {
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'farzad@fbc.ai',
  WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://fbc.ai',
  DEFAULT_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'F.B/c <contact@farzadbayat.com>',
  SCHEDULING: {
    USERNAME: schedulingUsername,
    EVENT: schedulingEvent,
    BOOKING_URL: `${schedulingBaseUrl}/${schedulingUsername}/${schedulingEvent}`,
    EMBED_URL: `${schedulingEmbedBaseUrl}/${schedulingUsername}/${schedulingEvent}?embed=true`,
    EMBED_SCRIPT_SRC: schedulingEmbedScript,
    BASE_URL: schedulingBaseUrl,
    EMBED_BASE_URL: schedulingEmbedBaseUrl,
  },
} as const

// Voice System Configuration
export const VOICE_CONFIG = {
  BY_LANG: {
    'en-US': 'Puck',
    'en-GB': 'Puck',
    'nb-NO': 'Puck',
    'sv-SE': 'Puck',
    'de-DE': 'Puck',
    'es-ES': 'Puck',
  } as const,
  DEFAULT_VOICE: 'Puck',
  VISUAL_TRIGGERS: (process.env.LIVE_SERVER_VISUAL_TRIGGERS || 'screen,showing,look at,see this,dashboard,workflow')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  VISUAL_INJECT_THROTTLE_MS: Math.max(
    0,
    Number.parseInt(process.env.LIVE_SERVER_VISUAL_INJECT_THROTTLE_MS || '8000', 10) || 8000
  ),
  CONTEXT_INJECT_DEBOUNCE_MS: Math.max(
    0,
    Number.parseInt(process.env.LIVE_SERVER_CONTEXT_INJECT_DEBOUNCE_MS || '600', 10) || 600
  ),
  INJECT_ON_CONTEXT_UPDATE: process.env.LIVE_SERVER_INJECT_ON_CONTEXT_UPDATE === '0' ? false : true,
} as const

// Gemini Configuration
export const GEMINI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 8192,
  SYSTEM_PROMPT: `You are F.B/c, Farzad Bayat's sharp, friendly consulting assistant.
- Speak concisely (2 sentences max by default).
- Ask one focused question when you need more context.
- Keep a natural voice tone; avoid lists unless asked.
- You have VISUAL CAPABILITIES: You can see webcam and screen share video frames in real-time.
- When you receive video input, acknowledge what you see and provide relevant insights.
Pronunciation: "Farzad Bayat" ~ "Fahr–zahd Bye–yaht" (soft 'a' in Farzad).`,
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  REASONING_STREAMING:
    (process.env.NEXT_PUBLIC_FEATURE_REASONING_STREAMING || '0').toLowerCase() === '1' ||
    (process.env.NEXT_PUBLIC_FEATURE_REASONING_STREAMING || '').toLowerCase() === 'true',
} as const

/**
 * CENTRALIZED CONFIGURATION
 * DO NOT HARDCODE THESE VALUES ANYWHERE ELSE
 * 
 * All WebSocket URLs, model names, and other configuration values
 * must be imported from this file.
 */

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  PRODUCTION_URL: process.env.NEXT_PUBLIC_LIVE_SERVER_URL || 'wss://fb-consulting-websocket.fly.dev',
  DEVELOPMENT_URL: process.env.NEXT_PUBLIC_LIVE_SERVER_URL || 'ws://localhost:3001',
  get URL() {
    return process.env.NODE_ENV === 'production' 
      ? this.PRODUCTION_URL 
      : this.DEVELOPMENT_URL
  },
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
} as const

// Gemini Model Names
export const GEMINI_MODELS = {
  // Current models
  FLASH: 'gemini-2.0-flash-exp',
  PRO: 'gemini-2.5-pro',
  FLASH_LEGACY: 'gemini-2.5-flash',
  
  // Default selections by use case
  DEFAULT_CHAT: 'gemini-2.0-flash-exp',
  DEFAULT_VOICE: 'gemini-2.0-flash-exp',
  DEFAULT_MULTIMODAL: 'gemini-2.0-flash-exp',
  DEFAULT_WEBCAM: 'gemini-2.0-flash-exp',
  DEFAULT_SCREEN: 'gemini-2.0-flash-exp',
} as const

// Gemini API Endpoints
export const GEMINI_ENDPOINTS = {
  LIVE_API: 'generativelanguage.googleapis.com/v1beta/models',
  STANDARD_API: 'generativelanguage.googleapis.com/v1/models',
  STREAMING_API: 'generativelanguage.googleapis.com/v1beta/models',
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


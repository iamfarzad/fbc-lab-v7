import { WEBSOCKET_CONFIG, GEMINI_MODELS } from '@/config/constants'

export const AGENT_UI_CONFIG = {
  // Use existing FBC backend
  wsUrl: WEBSOCKET_CONFIG.URL,
  
  // Agent configuration
  agent: {
    name: 'F.B/c AI',
    model: GEMINI_MODELS.DEFAULT_VOICE,
  },
  
  // UI settings
  ui: {
    theme: 'dark',
    showTranscript: true,
    showChat: true,
  },
}

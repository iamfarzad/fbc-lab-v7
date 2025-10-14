export const TEST_MESSAGES = {
  simple: 'Hello!',
  question: 'What is the weather today?',
  complex: 'Can you help me analyze this code and suggest improvements?',
  long: 'This is a very long message that contains multiple sentences and should test the message rendering capabilities of the chat interface. It includes various types of content to ensure proper handling.',
}

export const VOICE_EVENTS = {
  connected: {
    type: 'connected',
    payload: { connectionId: 'test-connection-123' },
  },
  sessionStarted: {
    type: 'session_started',
    payload: { connectionId: 'test-connection-123', languageCode: 'en-US' },
  },
  inputTranscript: {
    type: 'input_transcript',
    payload: { text: 'Test transcript', isFinal: true },
  },
  modelText: {
    type: 'model_text',
    payload: { text: 'Test response' },
  },
  sessionClosed: {
    type: 'session_closed',
    payload: { reason: 'user_ended' },
  },
  error: {
    type: 'error',
    payload: { message: 'Test error message' },
  },
}

export const SELECTORS = {
  chat: {
    trigger: '[data-chat-trigger]',
    dialog: '[role="dialog"]',
    input: 'textarea[placeholder*="Type"]',
    sendButton: 'button[aria-label*="Send"]',
    userMessage: '[data-role="user"]',
    assistantMessage: '[data-role="assistant"]',
    minimizeButton: 'button[aria-label*="Minimize"]',
    expandButton: 'button[aria-label*="Expand"]',
    closeButton: 'button:has([data-lucide="x"])',
  },
  voice: {
    toggleButton: '[aria-label*="voice" i], [aria-label*="microphone" i]',
    indicator: '[data-voice-active], .voice-wavebar',
    transcriptButton: 'button:has-text("Transcript")',
    transcriptPanel: '[data-transcript-panel]',
  },
  camera: {
    toggleButton: '[aria-label*="camera" i]',
    indicator: '[data-camera-active]',
    video: 'video[autoplay]',
    switchButton: 'button:has-text("Switch")',
  },
  screenShare: {
    toggleButton: '[aria-label*="screen" i]',
    indicator: '[data-screen-active], [data-screen-sharing]',
  },
  meeting: {
    openButton: 'button:has-text("Meeting"), button:has-text("Book")',
    dialog: '[role="dialog"]:has-text("Meeting")',
    closeButton: 'button[aria-label*="Close"]',
  },
}

export const TIMEOUTS = {
  short: 2000,
  medium: 5000,
  long: 10000,
  veryLong: 30000,
}

export const ERROR_MESSAGES = {
  voiceServerNotReady: 'Voice server not ready',
  cameraPermissionDenied: 'Unable to access camera',
  microphonePermissionDenied: 'Unable to access microphone',
  networkError: 'Network error',
}



import { GoogleGenAI } from '@google/genai'

export type LiveConnectOptions = {
  apiKey: string
  model?: string
  config?: Record<string, unknown>
}

/**
 * Centralized adapter for Gemini Live connections.
 * NOTE: Gemini Live sessions are active immediately after `genAI.live.connect(...)`.
 * Some older call sites expect a `.start()` method. We shim a no-op `.start()`
 * to avoid runtime errors like "session.start is not a function".
 */
export async function connectLive({ apiKey, model, config }: LiveConnectOptions) {
  const genAI = new GoogleGenAI({ apiKey })
  const liveModel = model ?? 'gemini-2.5-flash-native-audio-preview-09-2025'

  let isOpen = false

  // Create config object matching official documentation
  const liveConfig = {
    responseModalities: ['AUDIO'] as any,
    systemInstruction: 'You are a helpful assistant and answer in a friendly tone.',
    ...config,
  }

  const session: any = await genAI.live.connect({
    model: liveModel,
    config: liveConfig,  // ← Pass config as separate parameter
    callbacks: {
      onopen: () => {
        isOpen = true
        console.log('Live API session opened')
      },
      onmessage: (message: any) => console.log('Live API message received', message),
      onerror: (error: any) => console.error('Live API error:', error),
      onclose: () => {
        isOpen = false
        console.log('Live API session closed')
      },
    },
  })

  // Shim: add a no-op start() for compatibility with older code paths.
  if (typeof session.start !== 'function') {
    session.start = async () => {
      // No-op. Session is already active on connect.
      if (!isOpen) {
        // Wait a microtask to allow onopen to flip in edge cases.
        await Promise.resolve()
      }
    }
  }

  // Convenience helpers
  session.isOpen = () => isOpen
  session.waitUntilOpen = async (retries = 50, delayMs = 50) => {
    for (let i = 0; i < retries; i++) {
      if (isOpen) return
      await new Promise((r) => setTimeout(r, delayMs))
    }
    if (!isOpen) throw new Error('Live session failed to open in time')
  }

  console.log('✅ Gemini Live API session established and ready')
  return session
}

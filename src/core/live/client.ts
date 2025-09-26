import { GoogleGenAI, Modality } from '@google/genai'

type LiveConnectOptions = {
  apiKey: string
  model?: string
  config?: Record<string, unknown>
}

/**
 * Centralized adapter for Gemini Live connections.
 * Components/hooks should call this helper instead of importing @google/genai directly.
 */
export async function connectLive({ apiKey, model, config }: LiveConnectOptions) {
  const genAI = new GoogleGenAI({ apiKey })
  const liveModel = model ?? 'gemini-2.5-flash-native-audio-preview-09-2025'

  const mergedConfig: Record<string, unknown> = {
    response_modalities: ["AUDIO"],
    system_instruction: "You are a helpful assistant.",
    ...config,
  }

  const session = await genAI.live.connect({
    model: liveModel,
    ...mergedConfig,
    callbacks: {
      onopen: () => console.log('Live API session opened'),
      onmessage: (message: any) => console.log('Live API message received'),
      onerror: (error: any) => console.error('Live API error:', error),
      onclose: () => console.log('Live API session closed')
    }
  })

  return session
}

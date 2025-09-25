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
  const liveModel = model ?? 'gemini-2.5-flash-preview-native-audio-dialog'

  const mergedConfig: Record<string, unknown> = {
    responseModalities: [Modality.AUDIO, Modality.TEXT],
    ...config,
  }

  const session = await genAI.live.connect({
    model: liveModel,
    ...mergedConfig,
  } as any)

  return session as any
}

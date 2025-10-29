// Model definitions and token estimation
import { GEMINI_MODELS } from '@/config/constants'

export type UseCase =
  | 'chat'
  | 'image_analysis'
  | 'screenshot_analysis'
  | 'document_analysis'
  | 'voice_transcription'
  | 'code_generation'
  | 'translation'
  | 'summarization'

export interface ModelConfig {
  name: string
  contextWindow: number
  maxOutputTokens: number
  inputCostPerToken: number
  outputCostPerToken: number
  capabilities: UseCase[]
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  [GEMINI_MODELS.PRO]: {
    name: GEMINI_MODELS.PRO,
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    inputCostPerToken: 0.00000125, // $1.25 per 1M tokens
    outputCostPerToken: 0.000005, // $5 per 1M tokens
    capabilities: ['chat', 'image_analysis', 'screenshot_analysis', 'document_analysis', 'voice_transcription', 'code_generation']
  },
  [GEMINI_MODELS.AUDIO_2025_09]: {
    name: GEMINI_MODELS.AUDIO_2025_09,
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputCostPerToken: 0.00000015, // $0.15 per 1M tokens
    outputCostPerToken: 0.0000006, // $0.6 per 1M tokens
    capabilities: ['chat', 'image_analysis', 'screenshot_analysis', 'document_analysis', 'voice_transcription', 'code_generation']
  }
}

export function estimateTokens(operation: string): number {
  const tokenEstimates = {
    'text analysis': 100,
    'image analysis': 500,
    'screen analysis': 800,
    'document analysis': 1500,
    'chat message': 200,
    'summarization': 300,
    'translation': 150,
    'code generation': 1000,
    'voice transcription': 200
  }

  return tokenEstimates[operation as keyof typeof tokenEstimates] || 200
}

export function getModelForUseCase(useCase: UseCase): ModelConfig {
  // Find the most cost-effective model that supports the use case
  const candidates = Object.values(AVAILABLE_MODELS).filter(model =>
    model.capabilities.includes(useCase)
  )

  if (candidates.length === 0) {
    throw new Error(`No model available for use case: ${useCase}`)
  }

  // Return the cheapest model that supports the use case
  return candidates.reduce((cheapest, current) =>
    current.inputCostPerToken + current.outputCostPerToken <
    cheapest.inputCostPerToken + cheapest.outputCostPerToken
      ? current : cheapest
  )
}
// Model selection based on features and token requirements
import { estimateTokens as estimateTokensBase, getModelForUseCase, UseCase } from './models'
import { GEMINI_MODELS } from '@/config/constants'

export function selectModelForFeature(
  feature: string,
  estimatedTokens: number,
  hasSession: boolean
): { model: string; reason: string } {
  void hasSession
  // Map feature names to use cases
  const useCaseMap: Record<string, UseCase> = {
    'image_analysis': 'image_analysis',
    'screenshot_analysis': 'screenshot_analysis',
    'document_analysis': 'document_analysis',
    'chat': 'chat',
    'voice_transcription': 'voice_transcription',
    'code_generation': 'code_generation',
    'translation': 'translation',
    'summarization': 'summarization'
  }

  const useCase = useCaseMap[feature] || 'chat'

  try {
    const modelConfig = getModelForUseCase(useCase)
    return {
      model: modelConfig.name,
      reason: `Optimized for ${useCase} with ${estimatedTokens} estimated tokens`
    }
  } catch (error) {
    console.warn('Model selection fallback triggered:', error)
    // Fallback to simple selection
    if (estimatedTokens > 8000) {
      return {
        model: GEMINI_MODELS.PRO,
        reason: 'High token requirement'
      }
    } else if (estimatedTokens > 4000) {
      return {
        model: GEMINI_MODELS.DEFAULT_CHAT,
        reason: 'Medium token requirement'
      }
    } else {
      return {
        model: GEMINI_MODELS.DEFAULT_CHAT,
        reason: 'Standard token requirement'
      }
    }
  }
}

export function estimateTokens(operation: string): number {
  return estimateTokensBase(operation)
}

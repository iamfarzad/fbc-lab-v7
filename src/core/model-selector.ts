// Model selection based on features and token requirements
import { estimateTokens as estimateTokensBase, getModelForUseCase, AVAILABLE_MODELS, UseCase } from './models'

export function selectModelForFeature(
  feature: string,
  estimatedTokens: number,
  hasSession: boolean
): { model: string; reason: string } {
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
    // Fallback to simple selection
    if (estimatedTokens > 8000) {
      return {
        model: 'gemini-2.5-pro',
        reason: 'High token requirement'
      }
    } else if (estimatedTokens > 4000) {
      return {
        model: 'gemini-2.5-flash',
        reason: 'Medium token requirement'
      }
    } else {
      return {
        model: 'gemini-2.5-flash',
        reason: 'Standard token requirement'
      }
    }
  }
}

export function estimateTokens(operation: string): number {
  return estimateTokensBase(operation)
}
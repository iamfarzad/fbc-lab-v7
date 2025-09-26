// Model selection based on features and token requirements
export function selectModelForFeature(
  feature: string,
  estimatedTokens: number,
  hasSession: boolean
): { model: string; reason: string } {
  // Simple model selection based on token requirements
  if (estimatedTokens > 8000) {
    return {
      model: 'gemini-1.5-pro',
      reason: 'High token requirement'
    }
  } else if (estimatedTokens > 4000) {
    return {
      model: 'gemini-1.5-flash',
      reason: 'Medium token requirement'
    }
  } else {
    return {
      model: 'gemini-1.5-flash',
      reason: 'Standard token requirement'
    }
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
    'translation': 150
  }

  return tokenEstimates[operation as keyof typeof tokenEstimates] || 200
}
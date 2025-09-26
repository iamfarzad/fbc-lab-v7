// Enhanced Gemini configuration for different use cases
export function createOptimizedConfig(
  type: 'analysis' | 'generation' | 'chat' | 'summarization',
  overrides: Record<string, any> = {}
): any {
  const baseConfigs = {
    analysis: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024,
    },
    generation: {
      temperature: 0.7,
      topP: 0.9,
      topK: 50,
      maxOutputTokens: 2048,
    },
    chat: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024,
    },
    summarization: {
      temperature: 0.3,
      topP: 0.7,
      topK: 30,
      maxOutputTokens: 512,
    }
  }

  return {
    ...baseConfigs[type],
    ...overrides
  }
}
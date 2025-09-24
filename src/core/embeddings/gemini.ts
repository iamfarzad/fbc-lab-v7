import { GoogleGenAI } from '@google/genai'

export async function embedTexts(texts: string[], dims: 768 | 1536 = 1536): Promise<number[][]> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: texts,
    config: { outputDimensionality: dims },
  })
  const vectors = (res.embeddings || []).map(e => (e.values as number[]) || [])
  return vectors
}

// Export the functions for compatibility
export { embedTexts as embedText }



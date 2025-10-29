import { NextRequest } from 'next/server';
import { respond } from '@/lib/api/response'
import { GoogleGenAI } from '@google/genai';
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache';
import { GEMINI_MODELS } from '@/config/constants'
import { getResolvedGeminiApiKey } from '@/config/env'
import { logJsonl } from '@/src/lib/jsonl-logger';
import { generateImageHash } from '@/lib/image-utils';

// Create a cached function for webcam analysis (30 min TTL)
const cachedAnalyzeImage = createCachedFunction(
  async (_imageHash: string, base64: string, mimeType: string) => {
    // If no API key, return a mock analysis to avoid 500s in dev/demo
    if (!process.env.GEMINI_API_KEY) {
      return {
        analysis: 'Webcam analysis (mock): Detected a person and a background. Ready to assist with on-screen tasks.'
      };
    }

    try {
      // Normalize API key for @google/genai
      const apiKey = getResolvedGeminiApiKey()
      const genAI = new GoogleGenAI({ apiKey });
      // Prefer explicit v1beta model names with required "models/" prefix
      const model = process.env.WEB_VISION_MODEL || `models/${GEMINI_MODELS.DEFAULT_MULTIMODAL}`;
      const result = await genAI.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { text: 'Describe exactly what you see in this webcam image. Include people, objects, environment, text, and any visible details. Be factual and specific without inferring business context or making assumptions.' },
            { inlineData: { data: base64, mimeType } }
          ]
        }]
      });

      const text = result.text || '';
      return { analysis: text };
    } catch (err) {
      // Surface a controlled error so the route can respond consistently
      const message = err instanceof Error ? err.message : 'Unknown analysis error';
      throw new Error(`Webcam analysis failed: ${message}`);
    }
  },
  {
    ttl: CACHE_TTL.VISION, // 30 minutes
    keyPrefix: 'webcam:',
    keyGenerator: (imageHash) => imageHash
  }
);


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('webcamCapture') as File;
    if (!file) {
      logJsonl('webcam', 'missing_file')
      return respond.badRequest('No webcam capture provided')
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';
    
    // Generate hash for caching
    const imageHash = generateImageHash(buffer);

    console.log('📷 Analyzing webcam image with hash:', imageHash);
    logJsonl('webcam', 'received', { hash: imageHash, bytes: buffer.byteLength, mimeType })

    // Use cached analysis
    const result = await cachedAnalyzeImage(imageHash, base64, mimeType);
    logJsonl('webcam', 'analysis_complete', { hash: imageHash, analysisChars: result?.analysis?.length || 0 })

    return respond.ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    console.error('❌ [Webcam] Analysis error:', message)
    logJsonl('webcam', 'error', { message })
    return respond.serverError(message)
  }
}

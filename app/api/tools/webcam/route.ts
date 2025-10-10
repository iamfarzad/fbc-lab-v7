import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache';
import { createHash } from 'crypto';

// Create a cached function for webcam analysis (30 min TTL)
const cachedAnalyzeImage = createCachedFunction(
  async (imageHash: string, base64: string, mimeType: string) => {
    // If no API key, return a mock analysis to avoid 500s in dev/demo
    if (!process.env.GEMINI_API_KEY) {
      return {
        analysis: 'Webcam analysis (mock): Detected a person and a background. Ready to assist with on-screen tasks.'
      };
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-latest',
        contents: [{
          role: 'user',
          parts: [
            { text: 'Analyze this webcam image for business context or consulting insights. Describe key elements and suggest relevant AI responses.' },
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

// Generate a consistent hash for image content
function generateImageHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('webcamCapture') as File;
    if (!file) {
      return NextResponse.json({ error: 'No webcam capture provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';
    
    // Generate hash for caching
    const imageHash = generateImageHash(buffer);

    console.log('📷 Analyzing webcam image with hash:', imageHash);

    // Use cached analysis
    const result = await cachedAnalyzeImage(imageHash, base64, mimeType);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    console.error('❌ [Webcam] Analysis error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

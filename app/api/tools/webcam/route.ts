import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createCachedFunction, CACHE_TTL } from '@/src/lib/ai-cache';
import { createHash } from 'crypto';

// Create a cached function for webcam analysis (30 min TTL)
const cachedAnalyzeImage = createCachedFunction(
  async (imageHash: string, base64: string, mimeType: string) => {
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this webcam image for business context or consulting insights. Describe key elements and suggest relevant AI responses.' },
            { type: 'image', image: `data:${mimeType};base64,${base64}` }
          ]
        }
      ],
      temperature: 0.7,
    });

    return { analysis: text };
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
    console.error('❌ [Webcam] Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

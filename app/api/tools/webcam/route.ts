import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

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

    const { text } = await generateText({
      model: google('gemini-1.5-pro-latest'),
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

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error('Webcam analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

const client = new SpeechClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBytes = Buffer.from(await audioFile.arrayBuffer());
    const requestConfig = {
      audio: { content: audioBytes.toString('base64') },
      config: {
        encoding: 'WEBM_OPUS' as const,
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [response] = await client.recognize(requestConfig);
    const transcription = response.results
      ?.map((result) => result.alternatives[0]?.transcript)
      ?.join('\n') || 'No speech detected';

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

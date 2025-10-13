import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import { logJsonl } from '@/src/lib/jsonl-logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile || audioFile.size === 0) {
      logJsonl('transcribe', 'missing_audio')
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Initialize client only when needed to avoid metadata lookup during build
    const client = new SpeechClient();

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

    logJsonl('transcribe', 'success', {
      size: audioFile.size,
      mime: audioFile.type || 'unknown',
      chars: transcription.length,
    })

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error('Transcription error:', error);
    logJsonl('transcribe', 'error', { message: error?.message || 'Internal server error' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

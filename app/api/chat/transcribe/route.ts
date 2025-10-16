import { NextRequest } from 'next/server';
import { respond } from '@/lib/api/response'
import { SpeechClient } from '@google-cloud/speech';
import { logJsonl } from '@/src/lib/jsonl-logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile || audioFile.size === 0) {
      logJsonl('transcribe', 'missing_audio')
      return respond.badRequest('No audio file provided')
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
      ?.map((result) => result.alternatives?.[0]?.transcript)
      ?.filter(Boolean)
      ?.join('\n') || 'No speech detected';

    logJsonl('transcribe', 'success', {
      size: audioFile.size,
      mime: audioFile.type || 'unknown',
      chars: transcription.length,
    })

    return respond.ok({ transcription })
  } catch (error: any) {
    console.error('Transcription error:', error);
    const message = error?.message || 'Internal server error'
    logJsonl('transcribe', 'error', { message })
    return respond.serverError(message)
  }
}

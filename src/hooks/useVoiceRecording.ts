import { useState, useRef, useCallback } from 'react';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const resolveStopRef = useRef<((value: string) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        mediaRecorderRef.current = null;
        transcribeAudio(blob);
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Resolve stop promise if set
        if (resolveStopRef.current && transcription) {
          const resolver = resolveStopRef.current;
          resolveStopRef.current = null;
          resolver(transcription || '');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err: any) {
      setError(`Microphone access failed: ${err.message}`);
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      resolveStopRef.current = resolve;
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      } else {
        resolve('');
      }
    });
  }, [isRecording]);

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTranscription(data.transcription);

        // Resolve stop promise if set
        if (resolveStopRef.current) {
          const resolver = resolveStopRef.current;
          resolveStopRef.current = null;
          resolver(data.transcription || '');
        }
      } else {
        const errorText = await response.text();
        setError(`Transcription failed: ${errorText}`);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    isRecording,
    isTranscribing,
    transcription,
    error,
    startRecording,
    stopRecording,
    // Aliases for compatibility
    isProcessing: isTranscribing,
    transcript: transcription,
    partialTranscript: '',
  };
}

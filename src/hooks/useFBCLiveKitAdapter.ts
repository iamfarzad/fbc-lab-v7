import { useCallback, useEffect, useState } from 'react';
import { useLiveApi } from './useLiveApi';

export function useFBCLiveKitAdapter(options: { sessionId: string }) {
  // Single FBC voice session (no LiveKit Room runtime required)
  const liveApi = useLiveApi({ sessionId: options?.sessionId });
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror FBC session state into adapter boolean
  useEffect(() => {
    setIsSessionActive(Boolean(liveApi.isSessionActive));
    if (liveApi.error) setError(liveApi.error);
  }, [liveApi.isSessionActive, liveApi.error]);

  const startSession = useCallback(async () => {
    try {
      console.log('🎤 [FBCLiveKitAdapter] startSession called', { 
        hasLiveApi: !!liveApi, 
        hasStartSession: !!liveApi.startSession,
        sessionId: options?.sessionId 
      });
      setError(null);
      await liveApi.startSession({ sessionId: options?.sessionId });
      console.log('🎤 FBC session started via useLiveApi with sessionId:', options?.sessionId);
    } catch (error) {
      console.error('Failed to start FBC session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start session');
      throw error;
    }
  }, [liveApi, options?.sessionId]);

  const endSession = useCallback(async () => {
    try {
      await liveApi.stopSession();
      console.log('🎤 FBC session stopped via useLiveApi');
    } catch (error) {
      console.error('Failed to stop FBC session:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop session');
      throw error;
    }
  }, [liveApi]);

  return {
    isSessionActive,
    startSession,
    endSession,
    error: error || liveApi.error,
  };
}

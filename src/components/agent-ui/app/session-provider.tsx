'use client';

import { useMemo } from 'react';
import { useFBCLiveKitAdapter } from '@/hooks/useFBCLiveKitAdapter';
import { AGENT_UI_CONFIG } from '@/config/constants';
import { SessionContext } from '@/components/agent-ui/app/session-context';

interface SessionProviderProps {
  children: React.ReactNode;
  sessionId: string;
}

export const SessionProvider = ({ children, sessionId }: SessionProviderProps) => {
  const { isSessionActive, startSession, endSession, error } = useFBCLiveKitAdapter({ sessionId });
  
  const contextValue = useMemo(
    () => ({
      appConfig: AGENT_UI_CONFIG,
      isSessionActive,
      error,
      sessionId,
      startSession,
      endSession
    }),
    [isSessionActive, error, sessionId, startSession, endSession]
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

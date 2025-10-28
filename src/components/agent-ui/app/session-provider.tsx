'use client';

import { createContext, useContext, useMemo } from 'react';
import { useFBCLiveKitAdapter } from '@/hooks/useFBCLiveKitAdapter';
import { AGENT_UI_CONFIG } from '@/config/constants';

const SessionContext = createContext<{
  appConfig: typeof AGENT_UI_CONFIG;
  isSessionActive: boolean;
  error: string | null;
  sessionId: string;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
}>({
  appConfig: AGENT_UI_CONFIG,
  isSessionActive: false,
  error: null,
  sessionId: '',
  startSession: async () => {},
  endSession: async () => {},
});

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

export function useSession() {
  return useContext(SessionContext);
}

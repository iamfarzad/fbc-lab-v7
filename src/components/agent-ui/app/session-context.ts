'use client';

import { createContext, useContext } from 'react';
import { AGENT_UI_CONFIG } from '@/config/constants';

type SessionContextValue = {
  appConfig: typeof AGENT_UI_CONFIG;
  isSessionActive: boolean;
  error: string | null;
  sessionId: string;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue>({
  appConfig: AGENT_UI_CONFIG,
  isSessionActive: false,
  error: null,
  sessionId: '',
  startSession: async () => {},
  endSession: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

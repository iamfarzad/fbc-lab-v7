'use client';

import { useState, useEffect } from 'react';
import { App } from './app/app';

interface AgentUIInterfaceProps {
  sessionId?: string;
  forceTermsReset?: boolean;
}

export function AgentUIInterface({ sessionId: providedSessionId, forceTermsReset }: AgentUIInterfaceProps = {}) {
  // Generate or retrieve sessionId
  const [sessionId] = useState(() => 
    providedSessionId ?? 
    (typeof window !== 'undefined' ? localStorage.getItem('fbc-session-id') : null) ?? 
    crypto.randomUUID()
  );
  
  // Store sessionId for future sessions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fbc-session-id', sessionId);
    }
  }, [sessionId]);

  return (
    <div className="h-screen w-screen bg-background">
      <App sessionId={sessionId} forceTermsReset={forceTermsReset} />
    </div>
  );
}

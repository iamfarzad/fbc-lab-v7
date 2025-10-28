'use client';

import { useState, useEffect } from 'react';
import { App } from './app/app';

interface AgentUIInterfaceProps {
  sessionId?: string;
  forceTermsReset?: boolean;
}

export function AgentUIInterface({ sessionId: providedSessionId, forceTermsReset }: AgentUIInterfaceProps = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Resolve session id after hydrate to keep server/client markup aligned
  useEffect(() => {
    // Prefer an explicit id from the query string, then any stored value, then generate
    const resolved = (() => {
      if (providedSessionId && providedSessionId.trim().length > 0) {
        return providedSessionId.trim();
      }
      try {
        const stored = localStorage.getItem('fbc-session-id');
        if (stored) return stored;
      } catch {
        // ignore storage access issues
      }
      try {
        return crypto.randomUUID();
      } catch {
        // As a final fallback, derive a timestamp-based id so chat can still function
        return `session-${Date.now()}`;
      }
    })();

    setSessionId(resolved);

    try {
      localStorage.setItem('fbc-session-id', resolved);
    } catch {
      // Storage writes can fail in private mode; continue without persisting
    }
  }, [providedSessionId]);

  if (!sessionId) {
    // Render a stable shell so SSR markup matches the first client pass
    return <div className="h-screen w-screen bg-background" />;
  }

  return (
    <div className="h-screen w-screen bg-background">
      <App sessionId={sessionId} forceTermsReset={forceTermsReset} />
    </div>
  );
}

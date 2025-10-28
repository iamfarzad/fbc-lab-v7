'use client';

import { useAgentUISession } from '@/hooks/useAgentUISession';

export function SimpleAgentUI() {
  const agentUISession = useAgentUISession();

  return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">FBC Agent UI</h1>
        <p className="text-muted-foreground">
          Status: {agentUISession.session.isConnected ? 'Connected' : 'Disconnected'}
        </p>
        <button 
          onClick={agentUISession.connect}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Connect
        </button>
        <button 
          onClick={agentUISession.disconnect}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded ml-2"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

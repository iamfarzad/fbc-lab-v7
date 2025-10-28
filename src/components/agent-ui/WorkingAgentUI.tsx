'use client';

import { useAgentUISession } from '@/hooks/useAgentUISession';
import { useAgentUIAdapter } from '@/hooks/useAgentUIAdapter';

export function WorkingAgentUI() {
  const agentUISession = useAgentUISession();
  const agentUIAdapter = useAgentUIAdapter();

  return (
    <div className="h-screen w-screen bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">FBC Agent UI</h1>
        <p className="text-muted-foreground">
          Status: {agentUISession.session.isConnected ? 'Connected' : 'Disconnected'}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {!agentUISession.session.isConnected ? (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Welcome to FBC Agent</h2>
            <p className="text-muted-foreground">
              Click the button below to start a voice session with F.B/c AI
            </p>
            <button 
              onClick={agentUISession.connect}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start Voice Session
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice Controls */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Voice Controls</h3>
                <div className="space-y-2">
                  <button 
                    onClick={agentUIAdapter.toggleMicrophone}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded"
                  >
                    {agentUIAdapter.isConnected ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  <button 
                    onClick={agentUIAdapter.toggleCamera}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded"
                  >
                    Toggle Camera
                  </button>
                  <button 
                    onClick={agentUIAdapter.toggleScreenShare}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded"
                  >
                    Toggle Screen Share
                  </button>
                </div>
              </div>

              {/* Session Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Session Info</h3>
                <div className="space-y-2 text-sm">
                  <p>Room: {agentUIAdapter.room.name}</p>
                  <p>Participants: {agentUIAdapter.participants.length}</p>
                  <p>Connected: {agentUIAdapter.isConnected ? 'Yes' : 'No'}</p>
                  {agentUIAdapter.error && (
                    <p className="text-destructive">Error: {agentUIAdapter.error}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Chat</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      agentUIAdapter.sendMessage(input.value);
                      input.value = '';
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement;
                    if (input?.value) {
                      agentUIAdapter.sendMessage(input.value);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Disconnect Button */}
            <div className="text-center">
              <button 
                onClick={agentUISession.disconnect}
                className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useAgentUISession } from '@/hooks/useAgentUISession';
import { useAgentUIAdapter } from '@/hooks/useAgentUIAdapter';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';

export function DebugAgentUI() {
  const agentUISession = useAgentUISession();
  const agentUIAdapter = useAgentUIAdapter();
  const realtimeVoice = useRealtimeVoice();

  return (
    <div className="h-screen w-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-6">FBC Agent UI Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session State */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Session State</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Agent UI Session:</strong></p>
            <p>• Connected: {agentUISession.session.isConnected ? 'Yes' : 'No'}</p>
            <p>• Connecting: {agentUISession.session.isConnecting ? 'Yes' : 'No'}</p>
            <p>• Disconnected: {agentUISession.session.isDisconnected ? 'Yes' : 'No'}</p>
            {agentUISession.session.error && (
              <p className="text-red-500">• Error: {agentUISession.session.error}</p>
            )}
          </div>
        </div>

        {/* Realtime Voice State */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Realtime Voice State</h2>
          <div className="space-y-2 text-sm">
            <p><strong>FBC Backend:</strong></p>
            <p>• Session Active: {realtimeVoice.isSessionActive ? 'Yes' : 'No'}</p>
            <p>• Recording: {realtimeVoice.isRecording ? 'Yes' : 'No'}</p>
            <p>• Processing: {realtimeVoice.isProcessing ? 'Yes' : 'No'}</p>
            {realtimeVoice.error && (
              <p className="text-red-500">• Error: {realtimeVoice.error}</p>
            )}
          </div>
        </div>

        {/* Agent UI Adapter */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Agent UI Adapter</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Room State:</strong></p>
            <p>• Room Name: {agentUIAdapter.room.name}</p>
            <p>• Connected: {agentUIAdapter.isConnected ? 'Yes' : 'No'}</p>
            <p>• Participants: {agentUIAdapter.participants.length}</p>
            {agentUIAdapter.error && (
              <p className="text-red-500">• Error: {agentUIAdapter.error}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Controls</h2>
          <div className="space-y-2">
            <button 
              onClick={agentUISession.connect}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect Session
            </button>
            <button 
              onClick={agentUISession.disconnect}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect Session
            </button>
            <button 
              onClick={agentUIAdapter.toggleMicrophone}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Toggle Microphone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
